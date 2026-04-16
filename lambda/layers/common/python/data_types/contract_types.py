from typing import TypedDict, Literal, Optional


ErrorsList = Literal["UNHANDLED_ERROR", "ALREADY_EXISTS", "NOT_FOUND", "UNAUTHORIZED", "INVALID_REQUEST", 
"CONSTRAINT_VIOLATION", "DATABASE_ERROR", "EMAIL_ERROR", "PAYMENT_FAILED"]

class SuccessResponsePayload(TypedDict):
    data: dict | list
    meta: Optional[dict]
    
class ErrorResponsePayload(TypedDict):
    error: str
    code: ErrorsList
