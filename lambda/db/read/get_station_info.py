import os
import boto3
import psycopg2
from typing import Any
from psycopg2.extras import RealDictCursor
from datetime import datetime
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import ErrorResponsePayload, SuccessResponsePayload

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

def get_station_info(station_id: str) -> dict:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM stations WHERE id = %s", (station_id,))
            return cur.fetchone()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting station info: {e}")
        raise LambdaResponseError({"error": f"Error getting station info: {e}", "code": "DATABASE_ERROR"})

def get_all_stations() -> list[dict]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM stations")
            return cur.fetchall()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting all stations: {e}")
        raise LambdaResponseError({"error": f"Error getting all stations: {e}", "code": "DATABASE_ERROR"})

def build_json(station_info: dict) -> dict:
    station_dict = dict(station_info)
    station_dict.pop("location", None)
    return datetime_to_json(station_dict)

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    try:
        caller_id = event["service"]["caller_id"]
    except KeyError as e:
        log_audit("ERROR", message="missing caller_id", status="ERROR", errorMessage=f"missing caller_id: {e}")
        return ErrorResponsePayload(error=f"missing caller_id: {e}", code="UNAUTHORIZED")
    try:
        action = event["service"]["action"]
    except KeyError as e:
        log_audit("ERROR", message="missing action", status="ERROR", errorMessage=f"missing action: {e}")
        return ErrorResponsePayload(error=f"missing action: {e}", code="INVALID_REQUEST")
    audit_base = {
        "caller_id": caller_id,
        "service": context.function_name,
        "event": action,
        "requestId": context.aws_request_id,
    }
    try:
        match action:
            case "get_station_by_id":
                    station_id = event["data"]["station_id"]
                    station_info = get_station_info(station_id)
                    if not station_info:
                        log_audit("ERROR", message="station not found in Database", status="ERROR", errorMessage="station not found in Database", **audit_base)
                        return ErrorResponsePayload(error="station not found in Database", code="NOT_FOUND")
                    result = build_json(station_info)
                    logger.info(f"result: {result}")
                    log_audit("INFO", message="station info fetched successfully", status="SUCCESS", **audit_base)
                    return SuccessResponsePayload(data=result)
            case "get_all_stations":
                    stations_info = get_all_stations()
                    if not stations_info:
                        log_audit("ERROR", message="no stations found in Database", status="ERROR", errorMessage="no stations found in Database", **audit_base)
                        return ErrorResponsePayload(error="no stations found in Database", code="NOT_FOUND")
                    log_audit("INFO", message="all stations fetched successfully", status="SUCCESS", **audit_base)
                    return_list = [build_json(station) for station in stations_info]
                    logger.info(f"return list: {return_list}")
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