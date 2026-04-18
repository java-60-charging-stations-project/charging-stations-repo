import { ForbiddenError, HttpError, UnauthorizedError } from "@/types/errors";

export type MockResponse<T> =
    {
        success: true;
        responseCode: number;
        data: T;
    } |
    {
        success: false;
        responseCode: number;
        message: string;
        code?: string;
    };

export function mockSuccess<T>(data: T, code = 200): MockResponse<T> {
    return {
        success: true,
        responseCode: code,
        data,
    };
};

export function mockError(
    message: string,
    code = 500,
    errorCode?: string
): MockResponse<never> {
    return {
        success: false,
        message,
        responseCode: code,
        code: errorCode,
    };
};

export function handleMockResponse<T>(res: MockResponse<T>) {
    if (res.success) {
        return res.data;
    }
    throw new Error(res.message);
};

export function handleMockResponseWithDelay<T>(res: MockResponse<T>, delay: number): Promise<T> {
    if (res.success) {
        return new Promise(resolve => {
            setTimeout(() => resolve(res.data), delay);
        })
    }
    let error: HttpError;
    if (res.responseCode === 401) {
        error = new UnauthorizedError(res.message);
    }
    else if (res.responseCode === 403) {
        error = new ForbiddenError(res.message);
    }
    else {
        error = new HttpError(res.message, res.code ?? "UNKNOWN ERROR", res.responseCode);
    }
    return new Promise((_, reject) => {
        setTimeout(() => reject(error), delay);
    })
}