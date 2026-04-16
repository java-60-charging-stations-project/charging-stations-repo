import  { type AxiosRequestConfig } from 'axios';

export interface ApiClient {
    get<T>(
        endpoint: string,
        config?: AxiosRequestConfig,
    ): Promise<T>;

    post<T>(
        endpoint: string,
        body?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T>;

    put<T>(
        endpoint: string,
        body?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T>;

    patch<T>(
        endpoint: string,
        body?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T>;

    delete<T>(
        endpoint: string,
        config?: AxiosRequestConfig,
    ): Promise<T>;

    request<T = unknown>(
        config: AxiosRequestConfig,
        signal?: AbortSignal
    ): Promise<T>;
};