import type { AxiosRequestConfig } from "axios";
import type { ApiClient } from "./apiClient";

export class ApiClientMock implements ApiClient {
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
    request<T = unknown>(_config: AxiosRequestConfig, _signal?: AbortSignal): Promise<T> {
        throw new Error("Method not implemented.");
    }

};