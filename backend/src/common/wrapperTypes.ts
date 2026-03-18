export interface apiMetadata{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface apiResponse<T> {
    data: T
};

export interface apiResponseList<T> {
    data: T[];
    meta: apiMetadata;
}

export interface LambdaErrorResponse {
    error: string;
    code?: string;
}

export interface LambdaRequest<T, M = unknown> {
    service: {
        action: string;
        caller_id: string;
    };
    data: T;
    meta?: M;
}

