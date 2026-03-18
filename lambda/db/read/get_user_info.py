import os
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from utils.logger import logger, log_audit
from typing import Any
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import UserInstance


_conn = None

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

def extract_payload_from_event(event: dict) -> dict:
    logger.info(f"Extracting payload from event")
    try:
        service_data = event["service"]
        user_id = event.get("user_id") if service_data["action"] == "get_user_by_id" else None
        payload: dict = {
            "action": service_data["action"],
            "caller_id": service_data["caller_id"],
            "user_id": user_id,
        }
        logger.info(f"Payload extracted successfully: {payload}")
        return payload
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "MISSING_KEY"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}", "code": "UNHANDLED_ERROR"})

def get_user_info(user_id: str | None) -> dict | None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor(row_factory=RealDictCursor) as cur:
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
        with conn.cursor(row_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users")
            return cur.fetchall()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting all users: {e}")
        raise LambdaResponseError({"error": f"error getting all users: {e}", "code": "DATABASE_ERROR"})

def build_json(user_info: dict) -> dict:
    user = UserInstance.model_validate(user_info)
    return user.model_dump(mode="json")

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    service_data = event.get("service")
    audit_base = {
        "caller_id": service_data.get("caller_id") if service_data else None,
        "service": context.function_name,
        "event": service_data.get("action") if service_data else None,
        "requestId": context.aws_request_id,
    }
    try:
        payload = extract_payload_from_event(event)
    except LambdaResponseError as e:
        log_audit("ERROR", message="error extracting payload from event", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    audit_base["caller_id"] = payload["caller_id"]
    audit_base["event"] = payload["action"]
    match payload["action"]:
        case "get_user_by_id":
            try:
                user_id = payload["user_id"]
                user_info = get_user_info(user_id)
                if not user_info:
                    error_message = "user not found in Database"
                    log_audit("ERROR", message="user not found", status="ERROR", errorMessage=error_message, **audit_base)
                    return ErrorResponsePayload(error=error_message, code="NOT_FOUND")
                log_audit("INFO", message="user info fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=build_json(user_info))
            except Exception as e:
                error_message = f"unhandled error getting user info from Database: {e}"
                log_audit("ERROR", message="unhandled error getting user info", status="ERROR", errorMessage=error_message, **audit_base)
                return ErrorResponsePayload(error=error_message, code="UNHANDLED_ERROR")
        case "get_all_users":
            try:
                users_info = get_all_users()
                if not users_info:
                    error_message = "no users found in Database"
                    log_audit("ERROR", message="no users found", status="ERROR", errorMessage=error_message, **audit_base)
                    return ErrorResponsePayload(error=error_message, code="NOT_FOUND")
                log_audit("INFO", message="all users fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=[build_json(user) for user in users_info])
            except Exception as e:
                error_message = f"unhandled error getting all users from Database: {e}"
                log_audit("ERROR", message="unhandled error getting all users", status="ERROR", errorMessage=error_message, **audit_base)
                return ErrorResponsePayload(error=error_message, code="UNHANDLED_ERROR")
        case _:
            error_message = "invalid action"
            log_audit("ERROR", message="invalid action", status="ERROR", errorMessage=error_message, **audit_base)
            return ErrorResponsePayload(error=error_message, code="INVALID_REQUEST")