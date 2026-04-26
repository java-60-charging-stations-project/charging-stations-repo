import os
import boto3
import time
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import PortInstance
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal


AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
PORT_STATES = ["FREE", "OCCUPIED", "ERROR", "DISABLED", "BOOKED"]

_dynamo = None
_stations_table = None

def from_av_map(av_map: dict) -> dict:
    return {k: float(v) if isinstance(v, Decimal) else v for k, v in av_map.items()}

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
            KeyConditionExpression=Key("station_id").eq(station_id),
            FilterExpression=Attr("port_id").exists(),
        )
        items = resp.get("Items", [])
        ports: list[PortInstance] = []
        for item in items:
            item["entity_key"] = item["entity_key"].split("#", 1)[1]
            ports.append(from_av_map(item))
        return ports
    except Exception as e:
        logger.error(f"error getting station ports: {e}")
        raise LambdaResponseError({"error": f"error getting station ports: {e}", "code": "DATABASE_ERROR"})

def get_session_by_user(user_id: str, latest: bool = False) -> list[dict]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    query_params = {
        "IndexName": "user_id-index",
        "KeyConditionExpression": Key("user_id").eq(user_id)
    }
    if not latest:
        query_params.update({
            "FilterExpression": "#s IN (:booked, :active, :unpaid, :failed)",
            "ExpressionAttributeNames": {"#s": "state"},
            "ExpressionAttributeValues": {
                ":booked": "BOOKED",
                ":active": "ACTIVE",
                ":unpaid": "UNPAID",
                ":failed": "FAILED",
            }
        })
    try:
        resp = table.query(**query_params)
        items = resp.get("Items", [])
        sessions: list[dict] = []
        for item in items:
            item["port_code"] = item["entity_key"].split("#")[1]
            sessions.append(item)
        return sessions
    except Exception as e:
        logger.error(f"error getting session by user: {e}")
        raise LambdaResponseError({"error": f"error getting session by user: {e}", "code": "DATABASE_ERROR"})

def get_sessions_by_station(station_id: str) -> list[dict]:
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
        sessions: list[dict] = []
        for item in items:
            item["port_code"] = item["entity_key"].split("#")[1]
            sessions.append(item)
        return sessions
    except Exception as e:
        logger.error(f"error getting sessions by station: {e}")
        raise LambdaResponseError({"error": f"error getting sessions by station: {e}", "code": "UNHANDLED_ERROR"})

def get_session_by_port(station_id: str, entity_key: str) -> dict | None:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    session_key = f"{entity_key}#SESSION#"
    filter_expression = Attr("state").is_in(["ACTIVE", "BOOKED"])
    try:
        resp = table.query(
            KeyConditionExpression=Key("station_id").eq(station_id) & Key("entity_key").begins_with(session_key),
            FilterExpression=filter_expression,
        )
        items = resp.get("Items", [])
        return items[0] if items else None
    except Exception as e:
        logger.error(f"error getting session by port: {e}")
        raise LambdaResponseError({"error": f"error getting session by port: {e}", "code": "UNHANDLED_ERROR"})

def get_has_free_ports_by_station(station_id: str) -> bool:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    try:
        resp = table.query(
            IndexName="state-station-index",
            KeyConditionExpression=Key("state").eq("FREE") & Key("station_id").eq(station_id),
            ProjectionExpression="station_id",
            Limit=1,
        )
        return resp.get("Count", 0) > 0
    except Exception as e:
        logger.error(f"error checking free ports by station: {e}")
        raise LambdaResponseError({"error": f"error checking free ports by station: {e}", "code": "DATABASE_ERROR"})

def get_health_record(station_id: str, entity_key: str) -> dict | None:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    try:
        resp = table.query(
            KeyConditionExpression=Key("station_id").eq(station_id) & Key("entity_key").eq(entity_key),
            FilterExpression=Attr("exp_time").gte(int(time.time())),
        )
        items = resp.get("Items", [])
        return items[0] if items else None
    except Exception as e:
        logger.error(f"error getting health record: {e}")
        raise LambdaResponseError({"error": f"error getting health record: {e}", "code": "DATABASE_ERROR"})

def get_new_session(station_id: str, port_key: str, message_id: str, user_id: str) -> dict | None:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    entity_key = f"PORT#{port_key}#SESSION#{message_id}"
    try:
        resp = table.query(
            KeyConditionExpression=Key("station_id").eq(station_id) & Key("entity_key").eq(entity_key),
        )
        items = resp.get("Items", [])
        if items:
            return items[0]
        else:
            resp = table.query(
                IndexName="user_id-index",
                KeyConditionExpression=Key("user_id").eq(user_id),
                FilterExpression="#s IN (:booked, :active)",
                ExpressionAttributeNames={"#s": "state"},
                ExpressionAttributeValues={
                    ":booked": "BOOKED",
                    ":active": "ACTIVE",
                }
            )
            items = resp.get("Items", [])
            if items:
                return items[0]
            else:
                return None
    except Exception as e:
        logger.error(f"error getting failed session: {e}")
        raise LambdaResponseError({"error": f"error getting failed session: {e}", "code": "DATABASE_ERROR"})

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
            case "get_has_free_ports_by_station":
                station_id = event["data"]["stationId"]
                has_free_ports = get_has_free_ports_by_station(station_id)
                log_audit("INFO", message="free ports retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"has_free_ports": has_free_ports}, meta={})
            case "getSessionByUser":
                user_id = event["data"]["userId"]
                latest = event.get("data", {}).get("latest", False)
                session = get_session_by_user(user_id, latest=latest)
                log_audit("INFO", message="session retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"session": session}, meta={})
            case "getSessionByStation":
                station_id = event["data"]["stationId"]
                sessions = get_sessions_by_station(station_id)
                log_audit("INFO", message="sessions retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"sessions": sessions}, meta={})
            case "get_session_by_port":
                station_id = event["data"]["station_id"]
                entity_key = event["data"]["entity_key"]
                session = get_session_by_port(station_id, entity_key)
                log_audit("INFO", message="session by port retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"session": session if session else None}, meta={})
            case "getHealthRecord":
                station_id = event["data"]["messageId"]
                entity_key = event["data"]["userId"]
                health_record = get_health_record(station_id, entity_key)
                log_audit("INFO", message="health record retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"health_record": health_record}, meta={})
            case "getNewSession":
                message_id = event["data"]["messageId"]
                station_id = event["data"]["stationId"]
                port_key = event["data"]["portCode"]
                session = get_new_session(station_id, port_key, message_id, caller_id)
                log_audit("INFO", message="new session retrieved successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"session": session if session else None}, meta={})
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