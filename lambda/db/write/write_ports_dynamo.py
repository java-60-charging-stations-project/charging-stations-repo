import os
import json
import uuid
import time
import boto3
from decimal import Decimal
from datetime import datetime
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import PortInstance




AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
STATIONS_DYNAMO_TABLE = os.getenv("STATIONS_DYNAMO_TABLE", "charging-stations-stations")
WRITE_STATION_FUNCTION_NAME = os.getenv("WRITE_STATION_FUNCTION_NAME", "charging-stations-write-station-rds")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "5"))
ROLLBACK_MAX_RETRIES = int(os.getenv("ROLLBACK_MAX_RETRIES", "3"))
SYNC_RDS_QUEUE_URL = os.getenv("SYNC_RDS_QUEUE_URL")

_dynamo = None
_stations_table = None
_sqs = None

def get_sqs_client():
    global _sqs
    if _sqs is None:
        _sqs = boto3.client("sqs", region_name=AWS_REGION)
    return _sqs

def get_dynamo_stations_table():
    global _dynamo, _stations_table
    if _stations_table is None:
        _dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
        _stations_table = _dynamo.Table(STATIONS_DYNAMO_TABLE)
    return _stations_table

def insert_station_ports(station_id: str, ports: list[dict]) -> list[str]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    created_port_keys: list[str] = []
    try:
        with table.batch_writer() as batch:
            for p in ports:
                port_item = build_port_item(station_id, p)
                created_port_keys.append(port_item["entity_key"])
                batch.put_item(Item=port_item)
        return created_port_keys
    except Exception as e:
        logger.error(f"error inserting station ports: {e}")
        raise LambdaResponseError({"error": f"error inserting station ports: {e}", "code": "DATABASE_ERROR"})

def build_port_item(station_id: str, port: dict) -> PortInstance:
    try:
        port_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        port_item: PortInstance = {
            "station_id": station_id,
            "code": port["code"],
            "entity_key": f"PORT#{port_id}",
            "state": "DISABLED",
            "power": Decimal(str(port["power"])),
            "last_meter_kw": Decimal(str(port["lastMeterKw"])),
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        logger.info(f"Port item built successfully: {port_item}")
        return port_item
    except KeyError as e:
        logger.error(f"missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error building port item: {e}")
        raise LambdaResponseError({"error": f"error building port item: {e}", "code": "UNHANDLED_ERROR"})

def delete_station_ports(station_id: str, port_keys: list[str]) -> None:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table for delete: {e}")
        raise LambdaResponseError(
            {"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"}
        )
    try:
        with table.batch_writer() as batch:
            for port_key in port_keys:
                batch.delete_item(
                    Key={
                        "station_id": station_id,
                        "entity_key": port_key,
                    }
                )
    except Exception as e:
        logger.error(f"error deleting station ports from dynamo: {e}")
        raise LambdaResponseError(
            {"error": f"error deleting station ports: {e}", "code": "DATABASE_ERROR"}
        )

def enqueue_station_ports_count_sync(station_id: str, ports_delta: int, caller_id: str, request_id: str) -> str | None:
    if not SYNC_RDS_QUEUE_URL:
        logger.warning("SYNC_RDS_QUEUE_URL not set; skipping RDS sync enqueue")
        return None
    body = {
        "action": "update_station_ports_count",
        "station_id": station_id,
        "ports_delta": ports_delta,
        "caller_id": caller_id,
        "correlation_id": request_id,
    }
    try:
        resp = get_sqs_client().send_message(QueueUrl=SYNC_RDS_QUEUE_URL, MessageBody=json.dumps(body))
        mid = resp.get("MessageId")
        logger.info(f"enqueued station ports count sync message MessageId={mid}")
        return mid
    except Exception as e:
        logger.error(f"failed to enqueue station ports count sync: {e}")
        raise LambdaResponseError(
            {"error": f"station ports count sync queue failed: {e}", "code": "QUEUE_ERROR"}
        )

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    try:
        caller_id = event["service"]["callerId"]
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
        "request_id": context.aws_request_id,
    }
    try:
        match action:
            case "insert_station_ports":
                station_id = event["data"]["stationId"]
                ports = event["data"]["ports"]
                created_port_keys = insert_station_ports(station_id, ports)
                log_audit("INFO", message="station ports inserted successfully", status="SUCCESS", **audit_base)
                enqueue_station_ports_count_sync(station_id, len(ports), caller_id, context.aws_request_id)
                return SuccessResponsePayload(data={"created_port_keys": created_port_keys})
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
        log_audit("ERROR", message=f"error performing {action}", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error=f"unhandled error performing {action}: {e}", code="UNHANDLED_ERROR")