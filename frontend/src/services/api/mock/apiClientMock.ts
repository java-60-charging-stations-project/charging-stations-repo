import type { AxiosRequestConfig } from "axios";
import type { ApiClient } from "../apiClient";
import { MockLogService } from "./mockLogServise";
import { handleMockResponseWithDelay } from "./mockResult";

export class ApiClientMock implements ApiClient {
    private readonly fallbackClient: ApiClient;
    private readonly mockLogService = new MockLogService();
    private readonly timeout: number;

    constructor(fallbackClient: ApiClient, timeout: number) {
        this.fallbackClient = fallbackClient;
        this.timeout = timeout;
        this.mockLogService = new MockLogService();
    }
    
    get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
        return this.request({ ...config, method: "GET", url: endpoint });
    }
    post<T>(endpoint: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
        return this.request({ ...config, method: "POST", url: endpoint, data: body });
    }
    put<T>(endpoint: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
        return this.request({ ...config, method: "PUT", url: endpoint, data: body });
    }
    patch<T>(endpoint: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
        return this.request({ ...config, method: "PATCH", url: endpoint, data: body });
    }
    delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
        return this.request({ ...config, method: "DELETE", url: endpoint });
    }
    async request<T = unknown>(config: AxiosRequestConfig, signal?: AbortSignal): Promise<T> {
        const { method, url, params, data } = config;
        if (url?.startsWith("/logs")) {
            const response = handleMockResponseWithDelay<T>(
                this.mockLogService.process(method ?? "GET", url, params, data),
                this.timeout
            );
            return response;
        }
        return this.fallbackClient.request<T>(config, signal);
    }
};