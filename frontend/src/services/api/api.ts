import { config } from '@/config/env';
import { ApiClientAxios } from './apiClientAxios';
import type { ApiClient } from './apiClient';

const DEFAULT_TIMEOUT: number = 3000;

const API_BASE_URL: string = config.apiBaseUrl;
const API_PREFIX: string = config.apiPrefix;
const API_TIMEOUT: number = config.apiTimeout ?? DEFAULT_TIMEOUT;

export const apiClient: ApiClient = new ApiClientAxios(
    API_BASE_URL,
    API_PREFIX,
    API_TIMEOUT,
);
