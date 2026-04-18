/**
 * Base HTTP-shaped error for the API. Handled by `errorHandler` → JSON `{ error: { code, message } }`.
 * Prefer subclasses so status codes stay consistent across modules.
 */
export interface ServiceErrorOptions {
  /**
   * Identifies the Lambda (function name or ARN) when this error originated from or was returned by Lambda.
   * Passed to collector `source_service` so downstream can dedupe against Lambda-emitted logs.
   */
  collectorSource?: string;
}

export class ServiceError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly collectorSource?: string;

    constructor(message: string, statusCode: number, errorCode: string, options?: ServiceErrorOptions) {
        super(message);
        this.name = 'ServiceError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.collectorSource = options?.collectorSource;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InternalServerError extends ServiceError {
    constructor(message: string = 'Internal server error', errorCode: string = 'INTERNAL_SERVER_ERROR', options?: ServiceErrorOptions) {
        super(message, 500, errorCode, options);
        this.name = 'InternalServerError';
    }
}

export class UnauthorizedError extends ServiceError {
    constructor(message: string, errorCode: string = 'UNAUTHORIZED', options?: ServiceErrorOptions) {
        super(message, 401, errorCode, options);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ServiceError {
    constructor(message: string, errorCode: string = 'FORBIDDEN', options?: ServiceErrorOptions) {
        super(message, 403, errorCode, options);
        this.name = 'ForbiddenError';
    }
}

export class ResourceNotFoundError extends ServiceError {
    constructor(message: string, errorCode: string = 'RESOURCE_NOT_FOUND', options?: ServiceErrorOptions) {
        super(message, 404, errorCode, options);
        this.name = 'ResourceNotFoundError';
    }
}

export class BadRequestError extends ServiceError {
    constructor(message: string, errorCode: string = 'BAD_REQUEST', options?: ServiceErrorOptions) {
        super(message, 400, errorCode, options);
        this.name = 'BadRequestError';
    }
}

export class ConflictError extends ServiceError {
    constructor(message: string, errorCode: string = 'CONFLICT', options?: ServiceErrorOptions) {
        super(message, 409, errorCode, options);
        this.name = 'ConflictError';
    }
}

export class TooManyRequestsError extends ServiceError {
    constructor(message: string, errorCode: string = 'TOO_MANY_REQUESTS', options?: ServiceErrorOptions) {
        super(message, 429, errorCode, options);
        this.name = 'TooManyRequestsError';
    }
}
