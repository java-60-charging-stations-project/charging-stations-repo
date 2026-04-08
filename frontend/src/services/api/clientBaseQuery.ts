import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { apiClient } from './api';

type ClientArgs = {
    url: string;
    method?: string;
    data?: unknown;
    params?: unknown;
};

type ClientErrorShape = {
    status?: number;
    message: string;
};

export const clientBaseQuery: BaseQueryFn<ClientArgs, unknown, ClientErrorShape> = async (args, api) => {
    try {  
        const data = await apiClient.request(args, api.signal);
        return { data };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            error: {message},
        };
    };
};