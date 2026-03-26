import os
import boto3
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import PortInstance
from boto3.dynamodb.conditions import Key


AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
PORT_STATES = ["FREE", "OCCUPIED", "ERROR", "DISABLED", "BOOKED"]

_dynamo = None
_stations_table = None

def get_dynamo_stations_table():
    global _dynamo, _stations_table
    if _stations_table is None:
        _dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
        _stations_table = _dynamo.Table(STATIONS_DYNAMO_TABLE)
    return _stations_table

def get_ports_by_station(station_id: str) -> list[PortInstance]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    try:
        resp = table.query(
            KeyConditionExpression=Key("station_id").eq(station_id)
        )
        items = resp.get("Items", [])
        ports: list[PortInstance] = []
        for item in items:
            ports.append(PortInstance(
                station_id=item["station_id"],
                entity_key=item["entity_key"],
                code=item["code"],
                state=item["state"],
                last_meter_kw=float(item["last_meter_kw"]),
                created_at=item["created_at"],
                updated_at=item["updated_at"],
            ))
        return ports
    except Exception as e:
        logger.error(f"error getting station ports: {e}")
        raise LambdaResponseError({"error": f"error getting station ports: {e}", "code": "DATABASE_ERROR"})

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
            case "getPortsByStation":
                station_id = event["data"]["stationId"]
                ports = get_ports_by_station(station_id)
                log_audit("INFO", message="station ports retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"ports": ports}, meta={})
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