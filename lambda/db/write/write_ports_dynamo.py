import os
import uuid
import boto3
from decimal import Decimal
from datetime import datetime
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import PortInstance

_dynamo = None
_stations_table = None

def get_dynamo_stations_table():
    global _dynamo, _stations_table
    if _stations_table is None:
        region = os.environ.get("AWS_REGION", "il-central-1")
        table_name = os.environ["STATIONS_DYNAMO_TABLE"]
        _dynamo = boto3.resource("dynamodb", region_name=region)
        _stations_table = _dynamo.Table(table_name)
    return _stations_table

def insert_station_ports(station_id: str, ports: list[dict]) -> list[str]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    created_port_ids: list[str] = []
    try:
        with table.batch_writer() as batch:
            for p in ports:
                port_item = build_port_item(station_id, p)
                created_port_ids.append(port_item["port_id"])
                batch.put_item(Item=port_item)
        return created_port_ids
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
            case "insert_station_ports":
                station_id = event["data"]["stationId"]
                ports = event["data"]["ports"]
                created_port_ids = insert_station_ports(station_id, ports)
                log_audit("INFO", message="station ports inserted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=created_port_ids)
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