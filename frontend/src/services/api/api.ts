import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

import { config } from '@/config/env';
import { getLogger } from '@/services/logging';
import { type ApiErrorResponse } from '@/types/apiTypes'
import { ApiError, ForbiddenError, HttpError, UnauthorizedError } from '@/types/errors'

const logger = getLogger("ApiClient");

const DEFAULT_TIMEOUT: number = 3000;

const API_BASE_URL: string = config.apiBaseUrl;
const API_TIMEOUT: number = config.apiTimeout ?? DEFAULT_TIMEOUT;

const SERVER_ERROR = 'SERVER_ERROR';
const NETWORK_ERROR = 'NETWORK_ERROR';
const CONFIG_ERROR = 'CONFIG_ERROR';

class ApiClient {
    private readonly client: AxiosInstance;
    
    constructor(baseUrl: string, timeout: number) {
        if (!baseUrl) {
            throw new Error('API base URL is not configured');
        }
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: timeout,
            headers: {
                'Content-Type': 'application/json'
            },
        });
        logger.debug(`Created API client. Params: url=${baseUrl}, timeout=${timeout}`);
        this.client.interceptors.response.use(
            (response) => {
                const { status, data } = response;
                logger.debug(`Response status = ${status}`);
                return data;
            },
            (error: AxiosError<ApiErrorResponse>) => {
                const { code, message, response, request } = error;
                logger.debug('Request error: ', {
                    axiosCode: code,
                    axiosMessage: message,
                    hasResponse: !!response,
                    hasRequest: !!request
                });
                if (response) {
                    const { status, data } = response;
                    logger.debug(`Error status ${status}`);
                    logger.debug('Server error response: ', data);

                    const apiError = data?.error;
                    const errorMessage = apiError?.message ?? message;
                    const errorCode = apiError?.code ?? SERVER_ERROR;
                    if (status == 401) {
                        throw new UnauthorizedError(errorMessage);
                    }
                    if (status == 403) {
                        throw new ForbiddenError(errorMessage);
                    }
                    throw new HttpError(errorMessage, errorCode, status);
                }
                logger.debug(request ? 'Network error' : 'Configuration error');
                
                throw new HttpError(message, request ? NETWORK_ERROR : CONFIG_ERROR);
            }
        );
    }

    async get<T>(
        endpoint: string,
        query_params?: Record<string, unknown>,
    ): Promise<T> {
        logger.debug('GET request', { endpoint, params: query_params });
        const response = await this.client.get<T>(
            endpoint,
            {params: query_params},
        );
        return response as T;
    }

    async post<T>(
        endpoint: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        logger.debug('POST request ', { endpoint, params: config?.params });
        logger.debug(`POST request data: `, data);
        const response = await this.client.post<T>(
            endpoint,
            data,
            { ...config },
        );
        return response as T;
    }
}

export const apiClient: ApiClient = new ApiClient(
    API_BASE_URL,
    API_TIMEOUT,
);
