export class ServiceError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    constructor(message: string, statusCode: number, errorCode: string) {
        super(message);
        this.name = 'ServiceError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
};

export class InternalServerError extends ServiceError {
    constructor() {
        super("Internal server error", 500, 'INTERNAL_SERVER_ERROR');
        this.name = 'InternalServerError';
    }
};

export class ForbiddenError extends ServiceError {
    constructor(message: string, errorCode: string = 'FORBIDDEN') {
        super(message, 403, errorCode);
        this.name = 'ForbiddenError';
    }
}

export class ResourceNotFoundError extends ServiceError {
    constructor(message: string, errorCode: string = 'RESOURCE_NOT_FOUND') {
        super(message, 404, errorCode);
        this.name = 'ResourceNotFoundError';
    }
};

export class BadRequestError extends ServiceError {
    constructor(message: string, errorCode: string = 'BAD_REQUEST') {
        super(message, 400, errorCode);
        this.name = 'BadRequestError';
    }
};

export class ConflictError extends ServiceError {
    constructor(message: string, errorCode: string = 'CONFLICT') {
        super(message, 409, errorCode);
        this.name = 'ConflictError';
    }
};

export class TooManyRequestsError extends ServiceError {
    constructor(message: string, errorCode: string = 'TOO_MANY_REQUESTS') {
        super(message, 429, errorCode);
        this.name = 'TooManyRequestsError';
    }
}