import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

import { config } from '@/config/env';
import { getLogger } from '@/services/logging';

const logger = getLogger("ApiClient");

const DEFAULT_TIMEOUT: number = 3000;

const API_BASE_URL: string = config.apiBaseUrl ?? '';
const API_TIME_OUT: number = config.apiTimeout ?? DEFAULT_TIMEOUT;

class ApiClient {
    private readonly client: AxiosInstance;
    
    constructor(baseUrl: string, timeout: number) {    
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: timeout,
            headers: {
                'Content-Type': 'application/json'
            },
        })
    }

    async get<T>(
        endpoint: string,
        config?: AxiosRequestConfig
    ): Promise<T> {
        logger.debug('GET request to', endpoint, 'with config:', config);
        const response: AxiosResponse<T> = await this.client.get<T>(
            endpoint,
            {...config},
        );
        logger.debug(`GET Response status = ${response.status}, `);
        logger.debug(`GET Response data = ${response.data}`);
        return response.data;
    }

    async post<T>(
        endpoint: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        logger.debug('POST request to', endpoint, 'with config:', config);
        logger.debug(`POST data: ${data}`);
        const response = await this.client.post<T>(
            endpoint,
            data,
            { ...config },
        );
        logger.debug(`POST Response status = ${response.status}, `);
        logger.debug(`POST Response data = ${response.data}`);
        return response.data;
    }
}

export const apiClient: ApiClient = new ApiClient(
    API_BASE_URL,
    API_TIME_OUT,
);
