import os
import boto3
import psycopg2
from datetime import datetime, timezone
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.db_instance_types import UserInstance
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload

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

def is_admin_pre_sign_up(event: dict) -> bool:
    trigger = event.get("triggerSource", "")
    return trigger == "PreSignUp_AdminCreateUser"

def is_user_pre_sign_up(event: dict) -> bool:
    trigger = event.get("triggerSource", "")
    return trigger == "PreSignUp_SignUp"

def extract_user_instance_from_event(event: dict) -> UserInstance:
    console_created = is_admin_pre_sign_up(event)
    try:
        logger.info(f"Extracting user instance")
        attrs = event['request']['userAttributes']
        email = attrs['email']
        name = attrs.get('name')
        full_name = name if name and not name.startswith("cognito:") else "Console User"
        timestamp = datetime.now(timezone.utc)
        user_instance: UserInstance = {
            "user_id": attrs['sub'] if not console_created else event["userName"],
            "full_name": full_name,
            "email": email,
            "phone": attrs.get('phone_number'),
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        logger.info(f"User instance extracted successfully: {user_instance}")
        return user_instance
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"Unhandled error: {e}", "code": "UNHANDLED_ERROR"})

def insert_user_to_rds(user: UserInstance) -> None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (user_id, full_name, email, phone, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    user["user_id"],
                    user["full_name"],
                    user["email"],
                    user["phone"],
                    user["created_at"],
                    user["updated_at"],
                ),
            )
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if e.pgcode == "23505":
            logger.error(f"User already exists: {e}")
            raise LambdaResponseError({"error": "user already exists", "code": "ALREADY_EXISTS"})
        logger.error(f"Constraint violation inserting user: {e}")
        raise LambdaResponseError({"error": f"constraint violation inserting user: {e}", "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error inserting user: {e}")
        raise LambdaResponseError({"error": f"database error inserting user: {e}", "code": "DATABASE_ERROR"})
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error inserting user: {e}")
        raise LambdaResponseError({"error": f"unhandled error inserting user: {e}", "code": "UNHANDLED_ERROR"})

def handler(event: dict, context: Any) -> dict | SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    audit_base = {
        "service": context.function_name,
        "request_id": context.aws_request_id,
    }
    event_data = event.get("data")
    caller = "user" if event_data else "cognito"
    if caller == "cognito":
        audit_base["caller_id"] = caller
        audit_base["event"] = "WRITE_USER_TO_RDS"
        audit_base["trigger"] = event.get("triggerSource")
        if is_user_pre_sign_up(event):
            return event
        try:
            user_instance: UserInstance = extract_user_instance_from_event(event)
            insert_user_to_rds(user_instance)
            log_audit("INFO", message="user written to RDS successfully", status="SUCCESS", **audit_base)
        except LambdaResponseError as e:
            log_audit("ERROR", message="error writing user to RDS", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
            raise
        except Exception as e:
            log_audit("ERROR", message="error writing user to RDS", status="ERROR", errorMessage=str(e), **audit_base)
            raise
        return event
    elif caller == "user":
        try:
            caller_id = event["service"]["callerId"]
        except KeyError as e:
            log_audit("ERROR", message="missing callerId", status="ERROR", errorMessage=f"missing callerId: {e}", **audit_base)
            return ErrorResponsePayload(error=f"missing callerId: {e}", code="UNAUTHORIZED")
        try:
            action = event["service"]["action"]
        except KeyError as e:
            log_audit("ERROR", message="missing action", status="ERROR", errorMessage=f"missing action: {e}", **audit_base)
            return ErrorResponsePayload(error=f"missing action: {e}", code="INVALID_REQUEST")
        audit_base["caller_id"] = caller_id
        audit_base["event"] = action
        audit_base["trigger"] = "user_request"
        try:
            match action:
                case _:
                    log_audit("ERROR", message="invalid action", status="ERROR", errorMessage=f"invalid action: {action}", **audit_base)
                    return ErrorResponsePayload(error=f"invalid action: {action}", code="INVALID_REQUEST")
        except KeyError as e:
            log_audit("ERROR", message="missing data", status="ERROR", errorMessage=f"missing data: {e}", **audit_base)
            return ErrorResponsePayload(error=f"missing data: {e}", code="INVALID_REQUEST")
        except LambdaResponseError as e:
            log_audit("ERROR", message=f"error performing {action}", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
            return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
        except Exception as e:
            log_audit("ERROR", message=f"error performing {action}", status="ERROR", errorMessage=str(e), **audit_base)
            return ErrorResponsePayload(error=f"unhandled error performing {action}: {e}", code="UNHANDLED_ERROR")
    else:
        log_audit("ERROR", message="invalid caller", status="ERROR", errorMessage=f"invalid caller: {caller}", **audit_base)
        return ErrorResponsePayload(error=f"invalid caller: {caller}", code="INVALID_REQUEST")