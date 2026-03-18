import { ForbiddenError, UnauthorizedError } from "@/types/errors";

export function getErrorMessage(error: unknown): string {
    if (error instanceof UnauthorizedError) {
        return "Your session has expired. Please log in again.";
    }
    if (error instanceof ForbiddenError) {
        return "You are not authorized to access this resource.";
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "An unknown error occurred.";
}