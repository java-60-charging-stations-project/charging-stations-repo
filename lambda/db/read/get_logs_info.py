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

_conn = None

DEFAULT_PAGE_SIZE = 200
LOGS_SELECT = """
    log_id, level, message, service, event, source_service, caller_id, request_id,
    timestamp, resolve_time, resolver_id, resolved
"""
SORTABLE_COLUMNS = {
    "logId": "log_id",
    "level": "level",
    "message": "message",
    "service": "service",
    "event": "event",
    "sourceService": "source_service",
    "callerId": "caller_id",
    "requestId": "request_id",
    "timestamp": "timestamp",
    "resolveTime": "resolve_time",
    "resolverId": "resolver_id",
    "resolved": "resolved",
}

def datetime_to_json(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.isoformat()


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

def _normalize_pagination(page: int | None, page_size: int | None) -> tuple[int, int]:
    p = page if page is not None and page >= 1 else 1
    ps = page_size if page_size is not None else DEFAULT_PAGE_SIZE
    ps = max(min(ps, DEFAULT_PAGE_SIZE), 1)
    return p, ps

def parse_order_by(order_by: str) -> str | None:
    tokens = order_by.split(",") if order_by else []
    parameters: list[str] = []
    for token in tokens:
        token = token.strip()
        direction = "ASC"
        if token.endswith("+"):
            parameter = token[:-1]
            direction = "ASC"
        elif token.endswith("-"):
            parameter = token[:-1]
            direction = "DESC"
        else:
            parameter = token
        parameter = parameter.strip()
        if parameter not in SORTABLE_COLUMNS:
            logger.error(f"invalid order by parameter: {parameter}")
            raise LambdaResponseError(
                {"error": f"invalid order by parameter: {parameter}", "code": "INVALID_REQUEST"}
            )
        parameters.append(f"{SORTABLE_COLUMNS[parameter]} {direction}")
    return ", ".join(parameters) if parameters else None


def get_request_parameters(data: dict, meta_parameters: dict) -> dict:
    page, page_size = _normalize_pagination(
        meta_parameters.get("page"), meta_parameters.get("pageSize")
    )
    resolved = data.get("resolved")
    if resolved is not None and isinstance(resolved, str):
        r = resolved.strip().lower()
        resolved = True if r == "true" else False if r == "false" else None
    return {
        "level": data.get("level"),
        "service": data.get("service"),
        "caller_id": data.get("callerId"),
        "event": data.get("event"),
        "resolved": resolved,
        "order_by": data.get("orderBy"),
        "page": page,
        "page_size": page_size,
    }

def get_all_logs(parameters: dict) -> tuple[list[dict], int, int]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    offset = (parameters["page"] - 1) * parameters["page_size"]
    conditions: list[str] = []
    params: list[Any] = []
    if parameters.get("level"):
        conditions.append("level = %s")
        params.append(parameters["level"])
    if parameters.get("service"):
        conditions.append("service ILIKE %s")
        params.append(f"%{parameters['service']}%")
    if parameters.get("caller_id"):
        conditions.append("caller_id = %s")
        params.append(parameters["caller_id"])
    if parameters.get("event"):
        conditions.append("event ILIKE %s")
        params.append(f"%{parameters['event']}%")
    if parameters.get("resolved") is not None:
        conditions.append("resolved = %s")
        params.append(parameters["resolved"])
    where_sql = " AND ".join(conditions) if conditions else "TRUE"
    order_by_sql = "timestamp DESC"
    if parameters.get("order_by"):
        order_by_sql = parse_order_by(parameters["order_by"]) or "timestamp DESC"
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT COUNT(*) AS c FROM logs WHERE {where_sql}", tuple(params))
            total_items = int(cur.fetchone()["c"])
            total_pages = math.ceil(total_items / parameters["page_size"]) if total_items else 0
            cur.execute(
                f"SELECT {LOGS_SELECT.strip()} FROM logs WHERE {where_sql} ORDER BY {order_by_sql} LIMIT %s OFFSET %s",
                tuple(params) + (parameters["page_size"], offset),
            )
            rows = cur.fetchall()
        return rows, total_items, total_pages
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting all logs: {e}")
        raise LambdaResponseError({"error": f"Error getting all logs: {e}", "code": "DATABASE_ERROR"})


def build_meta_parameters(total_items: int, total_pages: int, parameters: dict) -> dict:
    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "page": parameters["page"],
        "page_size": parameters["page_size"],
    }

def build_json(log_row: dict) -> dict:
    return datetime_to_json(dict(log_row))


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
            case "getLogs":
                meta_parameters = event.get("meta", {})
                data = event.get("data", {})
                request_parameters = get_request_parameters(data, meta_parameters)
                rows, total_items, total_pages = get_all_logs(request_parameters)
                meta = build_meta_parameters(total_items, total_pages, request_parameters)
                log_audit("INFO", message="all logs fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=[build_json(r) for r in rows], meta=meta)
            case _:
                log_audit("ERROR", message=f"invalid action {action}", status="ERROR", errorMessage=f"invalid action {action}", 
                **audit_base)
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