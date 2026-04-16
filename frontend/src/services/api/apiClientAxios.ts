import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { getLogger } from '@/services/logging';
import { type ApiErrorResponse } from '@/types/apiTypes'
import { ForbiddenError, HttpError, UnauthorizedError } from '@/types/errors'
import type { AuthDataType } from '@/types';
import { tokenStorage } from '../tokenStorage';
import { getTokensFromRefreshToken } from '../auth/authService';
import { store } from "@/store/store";
import { logout } from "@/store/authSlice";
import { type ApiClient } from "./apiClient";

const logger = getLogger("ApiClient");



const SERVER_ERROR = 'SERVER_ERROR';
const NETWORK_ERROR = 'NETWORK_ERROR';
const CONFIG_ERROR = 'CONFIG_ERROR';

export class ApiClientAxios implements ApiClient {
    private readonly client: AxiosInstance;
    private refreshPromise: Promise<AuthDataType> | null = null;

    constructor(baseUrl: string, apiPrefix: string, timeout: number) {
        if (!baseUrl) {
            throw new Error('API base URL is not configured');
        }
        this.client = axios.create({
            baseURL: `${baseUrl}${apiPrefix}`,
            timeout: timeout,
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true,
        });
        logger.debug(`Created API client. Params: url=${baseUrl}, timeout=${timeout}`);
        this.client.interceptors.request.use(
            async(config) => {
                if (this.refreshPromise) {
                    await this.refreshPromise;
                }
                const token: string | null = tokenStorage.getAccessToken();
                if (token) {
                    config.headers = config.headers ?? {};
                    config.headers.Authorization = `Bearer ${token}`;
                }
                
                return config;
            }
        );

        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError<ApiErrorResponse>) => {
                const { code, message, response, request, config: originalConfig } = error;
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
                    if (status === 401) {
                        const isRetry: boolean = originalConfig?._isRetry ?? false;
                        const refreshToken: string | null = tokenStorage.getRefreshToken();
                        if (!originalConfig || isRetry || !refreshToken) {
                            store.dispatch(logout());
                            throw new UnauthorizedError(errorMessage);
                        }
                        try {
                            if (!this.refreshPromise) {
                                this.refreshPromise = getTokensFromRefreshToken(refreshToken).finally(
                                    () => {this.refreshPromise = null;}
                                );
                            }
                            const authResult: AuthDataType = await this.refreshPromise;
                            tokenStorage.setAccessToken(authResult.session.accessToken);
                            
                            originalConfig.headers = originalConfig.headers ?? {};
                            originalConfig.headers.Authorization = `Bearer ${authResult.session.accessToken}`;
                            originalConfig._isRetry = true;
                            return this.client.request(originalConfig);
                        } catch {
                            store.dispatch(logout());
                            throw new UnauthorizedError(errorMessage);
                        }
                    }
                    if (status === 403) {
                        throw new ForbiddenError(errorMessage);
                    }
                    throw new HttpError(errorMessage, errorCode, status);
                }
                logger.debug(request ? 'Network error' : 'Configuration error');
                
                throw new HttpError(message ?? 'Unknown error', request ? NETWORK_ERROR : CONFIG_ERROR);
            }
        );
    }
    
    async get<T>(
        endpoint: string,
        config?: AxiosRequestConfig,
    ): Promise<T> {
        logger.debug('GET request', { endpoint, params: config?.params });
        const response = await this.client.get<T>(
            endpoint,
            { ...config },
        );
        const { status, data } = response;
        logger.debug("API response", { status, data });
        return data;
    }

    async post<T>(
        endpoint: string,
        body?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        logger.debug('POST request ', { endpoint, params: config?.params });
        logger.debug("POST request", { endpoint, body });
        const response = await this.client.post<T>(
            endpoint,
            body,
            { ...config },
        );
        const { status, data } = response;
        logger.debug(`POST response status = ${status}`);
        logger.debug(`POST response data: `, data);
        return data;
    }

    async put<T>(
        endpoint: string,
        body?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        logger.debug('PUT request', { endpoint, body });
        const response = await this.client.put<T>(
            endpoint,
            body,
            { ...config },
        );
        const { status, data } = response;
        logger.debug(`PUT response status = ${status}`);
        logger.debug(`PUT response data: `, data);
        return data;
    }

    async patch<T>(
        endpoint: string,
        body?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        logger.debug('PATCH request', { endpoint, body });
        const response = await this.client.patch<T>(
            endpoint,
            body,
            { ...config },
        );
        const { status, data } = response;
        logger.debug(`PATCH response status = ${status}`);
        logger.debug(`PATCH response data: `, data);
        return data;
    }

    async delete<T>(
        endpoint: string,
        config?: AxiosRequestConfig,
    ): Promise<T> {
        logger.debug('DELETE request', { endpoint, params: config?.params });
        const response = await this.client.delete<T>(
            endpoint,
            { ...config },
        );
        const { status, data } = response;
        logger.debug(`DELETE response status = ${status}`);
        logger.debug(`DELETE response data: `, data);
        return data;
    }

    async request<T = unknown>(
        config: AxiosRequestConfig,
        signal?: AbortSignal
    ): Promise<T> {
        logger.debug("REQUEST", {
            url: config.url,
            method: config.method,
            params: config.params,
            data: config.data,
        });

        const response = await this.client.request<T>({
            ...config,
            signal,
        });

        const { status, data } = response;

        logger.debug("RESPONSE", { status, data });

        return data;
    }
};