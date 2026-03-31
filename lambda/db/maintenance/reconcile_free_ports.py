import os
import boto3
import psycopg2
from typing import Any
from datetime import datetime
from psycopg2.extras import execute_values
from boto3.dynamodb.conditions import Key
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload

AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
FREE_PORTS_GSI_NAME = os.environ.get("FREE_PORTS_GSI_NAME", "state-station-index")

_conn = None
_dynamo_resource = None

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


def get_dynamo_table():
    global _dynamo_resource
    if _dynamo_resource is None:
        _dynamo_resource = boto3.resource("dynamodb", region_name=AWS_REGION)
    return _dynamo_resource.Table(STATIONS_DYNAMO_TABLE)


def _get_active_station_ids() -> list[str]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        raise LambdaResponseError({"error": f"Error getting DB connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM stations WHERE state IN ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE')")
            return [row[0] for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"Error loading active station ids: {e}")
        raise LambdaResponseError({"error": f"Error loading active station ids: {e}", "code": "DATABASE_ERROR"})


def _has_free_ports_by_station(table, station_id: str) -> bool:
    try:
        resp = table.query(
            IndexName=FREE_PORTS_GSI_NAME,
            KeyConditionExpression=Key("state").eq("FREE") & Key("station_id").eq(station_id),
            ProjectionExpression="station_id",
            Limit=1,
        )
        return resp.get("Count", 0) > 0
    except Exception as e:
        logger.error(f"Error checking free ports for station {station_id}: {e}")
        raise LambdaResponseError(
            {"error": f"Error checking free ports for station {station_id}: {e}", "code": "DATABASE_ERROR"}
        )

def _compute_station_sets(station_ids: list[str]) -> tuple[list[str], list[str]]:
    try:
        table = get_dynamo_table()
    except Exception as e:
        logger.error(f"Error getting DynamoDB table: {e}")
        raise LambdaResponseError({"error": f"Error getting DynamoDB table: {e}", "code": "DATABASE_ERROR"})
    should_be_true: list[str] = []
    should_be_false: list[str] = []
    for station_id in station_ids:
        if _has_free_ports_by_station(table, station_id):
            should_be_true.append(station_id)
        else:
            should_be_false.append(station_id)
    return should_be_true, should_be_false


def _reconcile_rds_has_free_ports(should_be_true: list[str], should_be_false: list[str]) -> tuple[int, int]:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        raise LambdaResponseError({"error": f"Error getting DB connection: {e}", "code": "DATABASE_ERROR"})
    rows_true = 0
    rows_false = 0
    try:
        with conn.cursor() as cur:
            if should_be_true:
                execute_values(
                    cur,
                    """
                    UPDATE stations s
                    SET has_free_ports = TRUE, updated_at = NOW()
                    FROM (VALUES %s) AS v(id)
                    WHERE s.id = v.id
                      AND s.state IN ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE')
                      AND s.has_free_ports IS DISTINCT FROM TRUE
                    """,
                    [(sid,) for sid in should_be_true],
                )
                rows_true = cur.rowcount
            if should_be_false:
                execute_values(
                    cur,
                    """
                    UPDATE stations s
                    SET has_free_ports = FALSE, updated_at = NOW()
                    FROM (VALUES %s) AS v(id)
                    WHERE s.id = v.id
                      AND s.state IN ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE')
                      AND s.has_free_ports IS DISTINCT FROM FALSE
                    """,
                    [(sid,) for sid in should_be_false],
                )
                rows_false = cur.rowcount
        conn.commit()
        return rows_true, rows_false
    except Exception as e:
        conn.rollback()
        logger.error(f"Reconciliation failed: {e}")
        raise LambdaResponseError({"error": f"Reconciliation failed: {e}", "code": "DATABASE_ERROR"})


def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"ReconcileFreePorts handler called with event: {event}")
    audit_base = {
        "caller_id": "eventbridge",
        "service": context.function_name,
        "event": "reconcile_free_ports",
        "request_id": context.aws_request_id,
        "trigger": "schedule",
    }
    try:
        station_ids = _get_active_station_ids()
        should_be_true, should_be_false = _compute_station_sets(station_ids)
        rows_true, rows_false = _reconcile_rds_has_free_ports(should_be_true, should_be_false)
        data = {
            "active_station_count": len(station_ids),
            "should_be_true_count": len(should_be_true),
            "should_be_false_count": len(should_be_false),
            "rows_set_true": rows_true,
            "rows_set_false": rows_false,
            "reconciled_at": datetime.now().isoformat(),
        }
        log_audit("INFO", message="free ports reconciliation completed", status="SUCCESS", **audit_base)
        logger.info(f"Reconciliation result: {data}")
        return SuccessResponsePayload(data=data, meta={})
    except LambdaResponseError as e:
        log_audit("ERROR", message=f"free ports reconciliation failed: {e.response.get('error')}", status="ERROR", 
        **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    except Exception as e:
        log_audit("ERROR", message=f"free ports reconciliation failed: {str(e)}", status="ERROR", **audit_base)
        return ErrorResponsePayload(error=f"unhandled error: {e}", code="UNHANDLED_ERROR")