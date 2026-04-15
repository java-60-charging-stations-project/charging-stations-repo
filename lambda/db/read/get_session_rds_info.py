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
SESSIONS_SELECT = """
    session_id, station_id, entity_key, state, user_id,
    energy_consumed_kwh, tariff, final_cost,
    duration_minutes, booking_duration_minutes, charge_level_percent,
    time_booked_at, time_booked_before, started_at, stopped_at, ended_at, paid_at,
    created_at, updated_at
"""

SORTABLE_COLUMNS = {
    "sessionId": "session_id",
    "stationId": "station_id",
    "state": "state",
    "userId": "user_id",
    "paidAt": "paid_at",
    "createdAt": "created_at",
    "updatedAt": "updated_at",
}

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


def get_session_by_id(session_id: str) -> dict | None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT {SESSIONS_SELECT.strip()} FROM sessions WHERE session_id = %s", (session_id,))
            return cur.fetchone()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting session info: {e}")
        raise LambdaResponseError({"error": f"Error getting session info: {e}", "code": "DATABASE_ERROR"})


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
        elif token.endswith("-"):
            parameter = token[:-1]
            direction = "DESC"
        else:
            parameter = token
        parameter = parameter.strip()
        if parameter not in SORTABLE_COLUMNS:
            raise LambdaResponseError({"error": f"invalid order by parameter: {parameter}", "code": "INVALID_REQUEST"})
        parameters.append(f"{SORTABLE_COLUMNS[parameter]} {direction}")
    return ", ".join(parameters) if parameters else None


def get_request_parameters(data: dict, meta_parameters: dict) -> dict:
    page, page_size = _normalize_pagination(meta_parameters.get("page"), meta_parameters.get("pageSize"))
    return {
        "session_id": data.get("sessionId"),
        "station_id": data.get("stationId"),
        "user_id": data.get("userId"),
        "state": data.get("state"),
        "order_by": data.get("orderBy"),
        "page": page,
        "page_size": page_size,
    }


def get_sessions(parameters: dict) -> tuple[list[dict], int, int]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    offset = (parameters["page"] - 1) * parameters["page_size"]
    conditions: list[str] = []
    params: list[Any] = []
    if parameters.get("session_id"):
        conditions.append("session_id = %s")
        params.append(parameters["session_id"])
    if parameters.get("station_id"):
        conditions.append("station_id = %s")
        params.append(parameters["station_id"])
    if parameters.get("user_id"):
        conditions.append("user_id = %s")
        params.append(parameters["user_id"])
    if parameters.get("state"):
        conditions.append("state = %s")
        params.append(parameters["state"])

    where_sql = " AND ".join(conditions) if conditions else "TRUE"
    order_by_sql = parse_order_by(parameters["order_by"]) or "created_at DESC"

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT COUNT(*) AS c FROM sessions WHERE {where_sql}", tuple(params))
            total_items = int(cur.fetchone()["c"])
            total_pages = math.ceil(total_items / parameters["page_size"]) if total_items else 0

            cur.execute(
                f"""SELECT {SESSIONS_SELECT.strip()}
                    FROM sessions
                    WHERE {where_sql}
                    ORDER BY {order_by_sql}
                    LIMIT %s OFFSET %s""",
                tuple(params) + (parameters["page_size"], offset),
            )
            rows = cur.fetchall()
        return rows, total_items, total_pages
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error getting sessions: {e}")
        raise LambdaResponseError({"error": f"Error getting sessions: {e}", "code": "DATABASE_ERROR"})


def build_meta_parameters(total_items: int, total_pages: int, parameters: dict) -> dict:
    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "page": parameters["page"],
        "page_size": parameters["page_size"],
    }

def build_json(row: dict) -> dict:
    return {k: v.isoformat() if isinstance(v, datetime) else v for k, v in row.items()}

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
            case "getSessionById":
                session_id = event["data"]["sessionId"]
                row = get_session_by_id(session_id)
                if not row:
                    return ErrorResponsePayload(error="session not found in Database", code="NOT_FOUND")
                result = build_json(row)
                log_audit("INFO", message="session info fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=result, meta={})
            case "getSessions":
                meta_parameters = event.get("meta", {})
                data = event.get("data", {})
                request_parameters = get_request_parameters(data, meta_parameters)
                rows, total_items, total_pages = get_sessions(request_parameters)
                meta = build_meta_parameters(total_items, total_pages, request_parameters)
                result = [build_json(r) for r in rows]
                log_audit("INFO", message="sessions fetched successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=result, meta=meta)

            case _:
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