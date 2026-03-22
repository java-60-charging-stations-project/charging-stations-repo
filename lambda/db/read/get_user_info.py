import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from utils.logger import logger, log_audit
from typing import Any
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from datetime import datetime

_conn = None

def datetime_to_json(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: datetime_to_json(x) for k, x in v.items()}
    if isinstance(v, list):
        return [datetime_to_json(x) for x in v]
    return v

def get_db_config() -> dict:
    return {
        "host": os.environ["DB_HOST"],
        "port": int(os.environ.get("DB_PORT", "5432")),
        "dbname": os.environ["DB_NAME"],
        "user": os.environ["DB_USER"],
        "region": os.environ.get("AWS_REGION", "il-central-1"),
    }
def get_connection() -> psycopg2.extensions.connection:
    global _conn
    if _conn is None or _conn.closed:
        cfg = get_db_config()
        rds = boto3.client("rds", region_name=cfg["region"])
        token = rds.generate_db_auth_token(
            DBHostname=cfg["host"],
            Port=cfg["port"],
            DBUsername=cfg["user"],
            Region=cfg["region"],
        )
        _conn = psycopg2.connect(
            host=cfg["host"],
            port=cfg["port"],
            dbname=cfg["dbname"],
            user=cfg["user"],
            password=token,
            sslmode="require",
        )
    return _conn

def get_user_info(user_id: str | None) -> dict | None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            return cur.fetchone()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting user info: {e}")
        raise LambdaResponseError({"error": f"error getting user info: {e}", "code": "DATABASE_ERROR"})

def get_all_users() -> list[dict]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users")
            return cur.fetchall()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting all users: {e}")
        raise LambdaResponseError({"error": f"error getting all users: {e}", "code": "DATABASE_ERROR"})

def get_email_or_id(data: dict) -> str:
    result = None
    email = data.get("email")
    user_id = data.get("userId")
    if email and user_id:
        logger.error(f"provide only one of email or user_id, not both: {data}")
        raise LambdaResponseError({"error": "provide only one of email or user_id, not both", "code": "INVALID_REQUEST"})
    if email:
        result = email
    if user_id:
        result = user_id
    if result is None:
        logger.error(f"missing email or user_id in data: {data}")
        raise LambdaResponseError({"error": "missing email or user_id in data", "code": "INVALID_REQUEST"})
    return result

def build_json(user_info: dict) -> dict:
    user_dict = dict(user_info)
    return datetime_to_json(user_dict)

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    try:
        caller_id = event["service"]["callerId"]
    except KeyError as e:
        log_audit("ERROR", message="missing callerId", status="ERROR", errorMessage=f"missing callerId: {e}")
        return ErrorResponsePayload(error=f"missing callerId: {e}", code="UNAUTHORIZED")
    try:
        action = event["service"]["action"]
    except KeyError as e:
        log_audit("ERROR", message="missing action", status="ERROR", errorMessage=f"missing action: {e}")
        return ErrorResponsePayload(error=f"missing action: {e}", code="INVALID_REQUEST")
    audit_base = {
        "caller_id": caller_id,
        "service": context.function_name,
        "event": action,
        "request_id": context.aws_request_id,
    }
    try:
        match action:
            case "getUserById":
                user_id = get_email_or_id(event["data"])
                user_info = get_user_info(user_id)
                if not user_info:
                    log_audit("ERROR", message="user not found in Database", status="ERROR", errorMessage="user not found in RDS", **audit_base)
                    return ErrorResponsePayload(error="user not found in Database", code="NOT_FOUND")
                result = build_json(user_info)
                logger.info(f"result: {result}")
                log_audit("INFO", message="user info fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=result)
            case "getAllUsers":
                users_info = get_all_users()
                if not users_info:
                    log_audit("ERROR", message="no users found in Database", status="ERROR", errorMessage="no users found in Database", **audit_base)
                    return ErrorResponsePayload(error="no users found in Database", code="NOT_FOUND")
                return_list = [build_json(user) for user in users_info]
                logger.info(f"return list: {return_list}")
                log_audit("INFO", message="all users fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=return_list)
            case _:
                log_audit("ERROR", message=f"invalid action {action}", status="ERROR", errorMessage=f"invalid action {action}", **audit_base)
                return ErrorResponsePayload(error=f"invalid action {action}", code="INVALID_REQUEST")
    except KeyError as e:
        log_audit("ERROR", message="missing data", status="ERROR", errorMessage=f"missing data: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing data: {e}", code="INVALID_REQUEST")
    except LambdaResponseError as e:
        log_audit("ERROR", message=f"error performing {action}", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    except Exception as e:
        log_audit("ERROR", message=f"unhandled error performing {action}", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error=f"unhandled error performing {action}: {e}", code="UNHANDLED_ERROR")