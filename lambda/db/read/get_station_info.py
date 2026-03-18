import os
import boto3
import psycopg2
from utils.logger import logger, log_audit
from typing import Any
from utils.error_handlers import LambdaResponseError
from data_types.lambda_invocation_types import get_user_info_payload


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

def extract_payload_from_event(event: dict) -> get_user_info_payload:
    logger.info(f"Extracting payload from event")
    try:
        payload: get_user_info_payload = {
            "action": event["action"],
            "caller_id": event["caller_id"],
            "user_id": event["user_id"] if event["action"] == "get_user_by_id" else None,
        }
        logger.info(f"Payload extracted successfully: {payload}")
        return payload
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}"})

def get_user_info(user_id: str | None) -> tuple | None:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
        return cur.fetchone()

def get_all_users() -> list[tuple]:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users")
        return cur.fetchall()

def build_json(user_info: tuple) -> dict:
    return {
                "user_id": user_info[0],
                "full_name": user_info[1],
                "email": user_info[2],
                "phone": user_info[3],
                "role": user_info[4],
                "status": user_info[5],
                "created_at": user_info[6].isoformat() if user_info[6] else None,
                "updated_at": user_info[7].isoformat() if user_info[7] else None,
    }

def handler(event: dict, context: Any) -> dict | list[dict]:
    logger.info(f"Handler called with event: {event}")
    audit_base = {
        "userId": event.get("caller_id"),
        "service": context.function_name,
        "event": event.get("action"),
        "requestId": context.aws_request_id,
    }
    try:
        payload = extract_payload_from_event(event)
    except LambdaResponseError as e:
        log_audit(
            "ERROR",
            message="error extracting payload from event",
            status="ERROR",
            errorMessage=e.response.get("error"),
            **audit_base,
        )
        return e.response
    audit_base["userId"] = payload["caller_id"]
    audit_base["event"] = payload["action"]
    match payload["action"]:
        case "get_user_by_id":
            try:
                user_id = payload["user_id"]
                user_info = get_user_info(user_id)
                if not user_info:
                    error_message = "user not found in Database"
                    log_audit(
                        "ERROR",
                        message="user not found",
                        status="ERROR",
                        errorMessage=error_message,
                        **audit_base,
                    )
                    return {"error": error_message}
                log_audit(
                    "INFO",
                    message="user info fetched successfully",
                    status="SUCCESS",
                    **audit_base,
                )
                return build_json(user_info)
            except Exception as e:
                error_message = f"unhandled error getting user info from Database: {e}"
                log_audit(
                    "ERROR",
                    message="unhandled error getting user info",
                    status="ERROR",
                    errorMessage=error_message,
                    **audit_base,
                )
                return {"error": error_message}
        case "get_all_users":
            try:
                users_info = get_all_users()
                if not users_info:
                    error_message = "no users found in Database"
                    log_audit(
                        "ERROR",
                        message="no users found",
                        status="ERROR",
                        errorMessage=error_message,
                        **audit_base,
                    )
                    return {"error": error_message}
                log_audit(
                    "INFO",
                    message="all users fetched successfully",
                    status="SUCCESS",
                    **audit_base,
                )
                return_list = [build_json(user) for user in users_info]
                logger.info(f"return list: {return_list}")
                return return_list
            except Exception as e:
                error_message = f"unhandled error getting all users from Database: {e}"
                log_audit(
                    "ERROR",
                    message="unhandled error getting all users",
                    status="ERROR",
                    errorMessage=error_message,
                    **audit_base,
                )
                return {"error": error_message}