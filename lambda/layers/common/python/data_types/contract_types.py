from typing import TypedDict, Literal, Optional


ErrorsList = Literal["UNHANDLED_ERROR", "ALREADY_EXISTS", "NOT_FOUND", "UNAUTHORIZED", "INVALID_REQUEST", 
"CONSTRAINT_VIOLATION", "DATABASE_ERROR"]

class SuccessResponsePayload(TypedDict):
    data: dict | list

class ErrorResponsePayload(TypedDict):
    error: str
    code: ErrorsList
