import { apiMetadata, apiResponse, apiResponseList, LambdaRequest } from "./wrapperTypes";

export function wrapResponse<T>(data: T): apiResponse<T> {
    return { data };
}

export function wrapLambdaRequest<T, M = unknown>(
    action: string,
    callerId: string,
    data: T,
    meta?: M
): LambdaRequest<T, M> {
    return {
        service: { action, callerId},
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

export function wrapResponseList<T>(
    data: T[],
    totalItems: number,
    pageSize: number,
    page: number = 1,
    totalPages: number = 1,
): apiResponseList<T> {
    return {
        data,
        meta: {
            page,
            totalPages,
            pageSize,
            totalItems,
        }
    }
}

export function wrapLogsCollectionResponse<T>(
    logs: T[],
    totalItems: number,
    pageSize: number,
    page: number = 1,
    totalPages: number = 1,
): { data: { logs: T[] }; meta: apiMetadata } {
    return {
        data: { logs },
        meta: {
            page,
            totalPages,
            pageSize,
            totalItems,
        },
    };
}