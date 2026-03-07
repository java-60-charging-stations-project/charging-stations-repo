
export class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
        super(message);

        Object.setPrototypeOf(this, new.target.prototype);

        this.name = 'ApiError'; 
        this.code = code;
    }
}

export class HttpError extends ApiError {
    status?: number;

    constructor(message: string, code: string, status?: number) {
        super(message, code);
        this.name = 'HttpError';
        this.status = status;
    }
};

export class UnauthorizedError extends HttpError {
    constructor(message: string) {
        super(message, 'UNAUTHORIZED', 401);
        this.name = 'UnauthorizedError';
    }
};

export class ForbiddenError extends HttpError {
    constructor(message: string) {
        super(message, 'FORBIDDEN', 403);
        this.name = 'ForbiddenError';
    }
}