import os
import boto3
import math
import psycopg2
from typing import Any
from psycopg2.extras import RealDictCursor
from datetime import datetime
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import ErrorResponsePayload, SuccessResponsePayload
from data_types.db_instance_types import RequestParameters

_conn = None

DEFAULT_PAGE_SIZE = 200
STATIONS_SELECT = """
    id, code, name, owner, city, address, email, site_technician, max_power_kw,
    (ST_AsGeoJSON(location)::json) AS location,
    ports, rate_plan, state, has_free_ports, created_at, updated_at
"""

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
            cur.execute(f"SELECT {STATIONS_SELECT.strip()} FROM stations WHERE id = %s", (station_id,))
            return cur.fetchone()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting station info: {e}")
        raise LambdaResponseError({"error": f"Error getting station info: {e}", "code": "DATABASE_ERROR"})

def _normalize_pagination(page: int | None, page_size: int | None) -> tuple[int, int]:
    p = page if page is not None and page >= 1 else 1
    ps = page_size if page_size is not None else DEFAULT_PAGE_SIZE
    ps = max(min(ps, DEFAULT_PAGE_SIZE), 1)
    return p, ps

def get_request_parameters(meta_parameters: dict) -> RequestParameters:
    page, page_size = _normalize_pagination(meta_parameters.get("page"), meta_parameters.get("pageSize"))
    request_parameters: RequestParameters = {
        "city": meta_parameters.get("city"),
        "owner": meta_parameters.get("owner"),
        "state": meta_parameters.get("state"),
        "page": page,
        "page_size": page_size,
    }
    return request_parameters

def get_all_stations(parameters: RequestParameters) -> tuple[list[dict], int, int]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    offset = (parameters["page"] - 1) * parameters["page_size"]
    conditions: list[str] = []
    params: list[Any] = []
    if parameters.get("city"):
        conditions.append("city = %s")
        params.append(parameters["city"])
    if parameters.get("owner"):
        conditions.append("owner = %s")
        params.append(parameters["owner"])
    if parameters.get("state"):
        conditions.append("state = %s")
        params.append(parameters["state"])
    where_sql = " AND ".join(conditions) if conditions else "TRUE"
    base_from = f"FROM stations WHERE {where_sql}"
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT COUNT(*) AS c {base_from}", tuple(params))
            total_items = int(cur.fetchone()["c"])
            total_pages = math.ceil(total_items / parameters["page_size"])
            cur.execute(
                f"SELECT {STATIONS_SELECT.strip()} {base_from} ORDER BY created_at DESC LIMIT %s OFFSET %s", 
                tuple(params) + (parameters["page_size"], offset),
            )
            rows = cur.fetchall()
        return rows, total_items, total_pages
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting all stations: {e}")
        raise LambdaResponseError({"error": f"Error getting all stations: {e}", "code": "DATABASE_ERROR"})

def build_meta_parameters(total_items: int, total_pages: int, parameters: RequestParameters) -> dict:
    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "page": parameters["page"],
        "page_size": parameters["page_size"],
    }

def build_json(station_info: dict) -> dict:
    station_dict = dict(station_info)
    return datetime_to_json(station_dict)

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
            case "getStationById":
                    station_id = event["data"]["stationId"]
                    station_info = get_station_info(station_id)
                    if not station_info:
                        log_audit("ERROR", message="station not found in Database", status="ERROR", errorMessage="station not found in Database", **audit_base)
                        return ErrorResponsePayload(error="station not found in Database", code="NOT_FOUND")
                    result = build_json(station_info)
                    logger.info(f"result: {result}")
                    log_audit("INFO", message="station info fetched successfully", status="SUCCESS", **audit_base)
                    return SuccessResponsePayload(data=result)
            case "getAllStations":
                    meta_parameters = event.get("meta", {})
                    request_parameters = get_request_parameters(meta_parameters)
                    stations_info, total_items, total_pages = get_all_stations(request_parameters)
                    meta_parameters = build_meta_parameters(total_items, total_pages, request_parameters)
                    logger.info(f"meta parameters: {meta_parameters}")
                    log_audit("INFO", message="all stations fetched successfully", status="SUCCESS", **audit_base)
                    return_list = [build_json(station) for station in stations_info]
                    logger.info(f"return list: {return_list}")
                    return SuccessResponsePayload(data=return_list, meta=meta_parameters)
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