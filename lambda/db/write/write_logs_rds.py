import os
import boto3
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone
from typing import Any
import uuid
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
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

def extract_log_instance_from_event(event: dict) -> dict:
    log_id = str(uuid.uuid4())
    return {
        "log_id": log_id,
        "level": event["level"].upper(),
        "message": event["message"],
        "service": event["service"],
        "event": event["event"],
        "caller_id": event["caller_id"],
        "request_id": event.get("request_id") or str(uuid.uuid4()),
        "timestamp": event["timestamp"],
        "resolved": False,
    }

def write_logs_in_rds(batch_logs: list[dict]) -> None:
    if not batch_logs:
        return
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})

    columns = (
        "log_id",
        "level",
        "message",
        "service",
        "event",
        "caller_id",
        "request_id",
        "timestamp",
        "resolve_time",
        "resolver_id",
        "resolved",
    )
    template = "(" + ", ".join(["%s"] * len(columns)) + ")"
    insert_sql = f"""
        INSERT INTO logs ({", ".join(columns)})
        VALUES %s
        ON CONFLICT DO NOTHING
    """
    values = [
        (
            row["log_id"],
            row["level"],
            row.get("message"),
            row.get("service"),
            row.get("event"),
            row.get("caller_id"),
            row.get("request_id"),
            row.get("timestamp"),
            row.get("resolve_time"),
            row.get("resolver_id"),
            row.get("resolved"),
        )
        for row in batch_logs
    ]
    try:
        with conn.cursor() as cur:
            execute_values(cur, insert_sql, values, template=template, page_size=500)
        conn.commit()
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error writing logs: {e}")
        raise LambdaResponseError({"error": f"database error writing logs: {e}", "code": "DATABASE_ERROR"})
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error writing logs: {e}")
        raise LambdaResponseError({"error": f"unhandled error writing logs: {e}", "code": "UNHANDLED_ERROR"})

def resolve_log_in_rds(log_id: str, resolver_id: str, resolve_time: str) -> None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE logs
                SET resolver_id = %s, resolve_time = %s, resolved = true
                WHERE log_id = %s
                """,
                (resolver_id, resolve_time, log_id),
            )
            if cur.rowcount:
                conn.commit()
                return
            conn.rollback()
            raise LambdaResponseError({"error": "log not found", "code": "NOT_FOUND"})
    except LambdaResponseError:
        raise
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error resolving log: {e}")
        raise LambdaResponseError({"error": f"database error resolving log: {e}", "code": "DATABASE_ERROR"})
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error resolving log: {e}")
        raise LambdaResponseError({"error": f"unhandled error resolving log: {e}", "code": "UNHANDLED_ERROR"})

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    audit_base = {
        "service": context.function_name,
        "request_id": context.aws_request_id,
    }
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
    audit_base["caller_id"] = caller_id
    audit_base["event"] = action
    try:
        match action:
            case "write_logs":
                logs = event["data"]
                batch_logs = []
                for log in logs:
                    log_instance = extract_log_instance_from_event(log)
                    batch_logs.append(log_instance)
                write_logs_in_rds(batch_logs)
                log_audit("INFO", message="logs written successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"logs": logs}, meta={})
            case "resolveLog":
                data = event["data"]
                log_id = data["logId"]
                resolver_id = caller_id
                resolve_time = datetime.now(timezone.utc)
                resolve_log_in_rds(log_id, resolver_id, resolve_time)
                log_audit("INFO", message="log resolved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"logId": log_id, "resolverId": resolver_id, 
                "resolveTime": resolve_time.isoformat()}, meta={})
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
        log_audit("ERROR", message=f"unhandled error performing {action}", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error=f"unhandled error performing {action}: {e}", code="UNHANDLED_ERROR")