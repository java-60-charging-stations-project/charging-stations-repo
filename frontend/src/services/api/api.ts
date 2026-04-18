import { config } from '@/config/env';
import { ApiClientAxios } from './apiClientAxios';
import type { ApiClient } from './apiClient';
import { ApiClientMock } from './mock/apiClientMock';

function getApiClient(): ApiClient {
    const env = config.appEnv.toLowerCase();
    const apiClientAxios: ApiClient = new ApiClientAxios({
        baseUrl: config.apiBaseUrl,
        timeout: config.apiTimeout,
        apiPrefix: config.apiPrefix,
    });

    if (env === "mock") {
        return new ApiClientMock(apiClientAxios, config.mockApiTimeout);
    }

    return apiClientAxios;
}

export const apiClient: ApiClient = getApiClient();
