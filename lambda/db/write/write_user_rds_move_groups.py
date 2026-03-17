import os
import boto3
import psycopg2
from utils.logger import logger
from datetime import datetime
from data_types.db_instance_types import UserInstance
from utils.logger import log_audit
from utils.error_handlers import LambdaResponseError
from typing import Literal, Any
from data_types.lambda_invocation_types import modify_user_group_payload

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

def extract_payload_from_event(event: dict) -> modify_user_group_payload:
    logger.info(f"Extracting payload from event")
    try:
        payload: modify_user_group_payload = {
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
        raise LambdaResponseError({"error": f"missing key: {e}"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}"})

def is_admin_pre_sign_up(event: dict) -> bool:
    trigger = event.get("triggerSource", "")
    return trigger == "PreSignUp_AdminCreateUser"

def is_user_pre_sign_up(event: dict) -> bool:
    trigger = event.get("triggerSource", "")
    return trigger == "PreSignUp_SignUp"

def extract_user_instance_from_event(event: dict) -> UserInstance:
    console_created_ = is_admin_pre_sign_up(event)
    try:
        logger.info(f"Extracting user instance")
        attrs = event['request']['userAttributes']
        email = attrs['email']
        status = attrs['cognito:user_status'] if not console_created_ else "CONFIRMED"
        full_name = attrs['name'] if not console_created_ else "Console User"
        if full_name.startswith("cognito:"):
            full_name = "Console User"
        user_instance: UserInstance = {
            'user_id': attrs['sub'] if not console_created_ else event["userName"],
            'full_name': full_name,
            'email': email,
            'phone': attrs.get('phone_number'),
            'role': "USER",
            'status': "ACTIVE" if status == "CONFIRMED" else None,
            'created_at': datetime.now(),
            'updated_at': None,
            }
        return user_instance
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"Missing key: {e}"})
    except TypeError as e:
        logger.error(f"Event type error: {e}")
        raise LambdaResponseError({"error": f"Event type error: {e}"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"Unhandled error: {e}"})


def add_user_to_group(user_pool_id: str, user_id: str, role: str) -> None:
    try:
        client = boto3.client("cognito-idp")
        client.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=user_id,
            GroupName=role,
            )
    except Exception as e:
        logger.error(f"Error adding user to group: {e}")
        raise LambdaResponseError({"error": f"Error adding user to group: {e}"})

def remove_user_from_group(user_pool_id: str, user_id: str, role: str) -> None:
    try:
        client = boto3.client("cognito-idp")
        client.admin_remove_user_from_group(
            UserPoolId=user_pool_id,
            Username=user_id,
            GroupName=role,
        )
    except Exception as e:
        logger.error(f"Error removing user from group: {e}")
        raise LambdaResponseError({"error": f"Error removing user from group: {e}"})

def list_user_groups(user_pool_id: str, user_id: str) -> list[str]:
    try:
        client = boto3.client("cognito-idp")
        response = client.admin_list_groups_for_user(
            UserPoolId=user_pool_id,
            Username=user_id,
        )
        return [group.get("GroupName") for group in response.get("Groups", [])]
    except Exception as e:
        logger.error(f"Error listing user groups: {e}")
        raise LambdaResponseError({"error": f"Error listing user groups: {e}"})

def insert_user_to_rds(user: UserInstance) -> None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}"})
    status = user.get("status") or "ACTIVE"
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (user_id, full_name, email, phone, role, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user["user_id"],
                    user["full_name"],
                    user["email"],
                    user.get("phone"),
                    user["role"],
                    status,
                    user["created_at"],
                ),
            )
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if e.pgcode == "23505":
            logger.error(f"User already exists: {e}")
            raise LambdaResponseError({"error": "User already exists"})
        logger.error(f"Constraint violation inserting user: {e}")
        raise LambdaResponseError({"error": str(e)})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error inserting user: {e}")
        raise LambdaResponseError({"error": str(e)})

def handler(event: dict, context: Any) -> dict:
    caller_entity = "user" if event.get("action") else "cognito"
    logger.info(f"Handler called with event: {event}")
    audit_base = {
        "caller_id": event.get("caller_id"),
        "service": context.function_name,
        "event": "WRITE_USER_TO_RDS",
        "requestId": context.aws_request_id,
        "trigger": event.get("triggerSource"),
    }
    if caller_entity == "cognito":
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
    else:
        try:
            payload = extract_payload_from_event(event)
            audit_base["event"] = payload["action"]
            audit_base["caller_id"] = payload["caller_id"]
            audit_base["user_id"] = payload["user_id"]
            audit_base["role"] = payload["role"]
            user_groups = list_user_groups(payload["user_pool_id"], payload["user_id"])
            if payload["role"] in user_groups:
                log_audit("ERROR", message="user already in group", status="ERROR", errorMessage="user already in group", **audit_base)
                return {"error": "user already in group"}
            for group in user_groups:
                if group:
                    remove_user_from_group(payload["user_pool_id"], payload["user_id"], group)
            if payload["role"] != "USER":
                add_user_to_group(payload["user_pool_id"], payload["user_id"], payload["role"])
            log_audit("INFO", message="user moved to group successfully", status="SUCCESS", **audit_base)
            return {"message": "success"}
        except Exception as e:
            log_audit("ERROR", message="error modifying user group", status="ERROR", errorMessage=str(e), **audit_base)
            return {"error": f"UNHANDLED_ERROR: {e}"}