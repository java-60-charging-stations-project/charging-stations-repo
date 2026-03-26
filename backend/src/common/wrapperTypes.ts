export interface apiMetadata {
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

import type { LambdaErrorPayload } from './lambdaContracts';

/** Alias for Lambda `{ error, code }` body (see `lambdaContracts.ts`). */
export type LambdaErrorResponse = LambdaErrorPayload;

export interface LambdaRequest<T, M = unknown> {
    service: {
        action: string;
        callerId: string;
    };
    data: T;
    meta?: M;
}

