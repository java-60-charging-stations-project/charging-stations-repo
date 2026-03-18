import os
import boto3
import psycopg2
from datetime import datetime
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.db_instance_types import UserInstance

USER_POOL_ID = os.environ.get("USER_POOL_ID", "")

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
        payload: dict = {
            "action": event["action"],
            "caller_id": event["caller_id"],
            "user_id": event["user_id"],
            "role": event["role"],
            "user_pool_id": event["user_pool_id"],
        }
        logger.info(f"Payload extracted successfully: {payload}")
        return payload
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "MISSING_KEY"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}", "code": "UNHANDLED_ERROR"})

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
        status = attrs['cognito:user_status'] if not console_created else "CONFIRMED"
        full_name = attrs['name'] if not console_created else "Console User"
        if full_name.startswith("cognito:"):
            full_name = "Console User"
        user_instance: UserInstance = UserInstance(
            user_id=attrs['sub'] if not console_created else event["userName"],
            full_name=full_name,
            email=email,
            phone=attrs.get('phone_number'),
            role="USER",
            status="ACTIVE" if status == "CONFIRMED" else None,
            created_at=datetime.now(),
            updated_at=None,
        )
        logger.info(f"User instance extracted successfully: {user_instance}")
        return user_instance
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "MISSING_KEY"})
    except TypeError as e:
        logger.error(f"Event type error: {e}")
        raise LambdaResponseError({"error": f"Event type error: {e}", "code": "EVENT_TYPE_ERROR"})
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
                INSERT INTO users (user_id, full_name, email, phone, role, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user.user_id,
                    user.full_name,
                    user.email,
                    user.phone,
                    user.role,
                    user.status,
                    user.created_at,
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

def handler(event: dict, context: Any) -> dict:
    logger.info(f"Handler called with event: {event}")
    audit_base = {
        "caller_id": event.get("caller_id"),
        "service": context.function_name,
        "event": "WRITE_USER_TO_RDS",
        "requestId": context.aws_request_id,
        "trigger": event.get("triggerSource"),
    }
    if is_user_pre_sign_up(event):
        return event
    try:
        user_instance = extract_user_instance_from_event(event)
        insert_user_to_rds(user_instance)
        log_audit("INFO", message="user written to RDS successfully", status="SUCCESS", **audit_base)
    except LambdaResponseError as e:
        log_audit("ERROR", message="error writing user to RDS", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        raise
    except Exception as e:
        log_audit("ERROR", message="error writing user to RDS", status="ERROR", errorMessage=str(e), **audit_base)
        raise
    return event