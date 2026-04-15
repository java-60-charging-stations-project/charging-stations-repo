import os
import boto3
import json
from typing import Any
from boto3.dynamodb.types import TypeDeserializer
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from decimal import Decimal

REGION = os.environ["AWS_REGION"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
WRITE_STATION_FUNCTION_NAME = os.environ["WRITE_STATION_FUNCTION_NAME"]
WRITE_SESSION_FUNCTION_NAME = os.environ["WRITE_SESSION_FUNCTION_NAME"]
WRITE_STATION_RDS_FUNCTION_NAME = os.environ["WRITE_STATION_RDS_FUNCTION_NAME"]

_deserializer = TypeDeserializer()

def _deserialize_image(image: dict[str, Any] | None) -> dict[str, Any] | None:
    if not image:
        return None
    return {k: _deserializer.deserialize(v) for k, v in image.items()}


def _is_port_entity(image: dict[str, Any] | None) -> bool:
    res: bool = False
    if image and (entity_key := image.get("entity_key")):
        res = len(entity_key.split("#")) == 2
    return res

def _is_session_entity(image: dict[str, Any] | None) -> bool:
    res: bool = False
    if image and (entity_key := image.get("entity_key")):
        res = len(entity_key.split("#")) == 4
    return res

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    logger.info(f"Received event: {event}")
    records = event.get("Records", [])
    logger.info(f"Received {len(records)} records")
    operations = 0
    insert_delete_port_ops = []
    change_free_state_port_ops = []
    unpaid_session_ops = []
    paid_session_ops = []
    for record in records:
        logger.info(f"Processing record: {record}")
        ddb = record.get("dynamodb", {})
        old_image = _deserialize_image(ddb.get("OldImage"))
        new_image = _deserialize_image(ddb.get("NewImage"))
        event_name = record.get("eventName")
        if event_name in {"INSERT", "REMOVE"}:
            image = new_image if event_name == "INSERT" else old_image
            if not _is_port_entity(image):
                continue
            op = {
                "event_id": record["eventID"],
                "station_id": image["station_id"],
                "entity_key": image["entity_key"],
                "operation": "PORT_INSERTED_OR_REMOVED",
                "delta": 1 if event_name == "INSERT" else -1,
            }
            insert_delete_port_ops.append(op)
        elif event_name == "MODIFY":
            old_state = old_image.get("state")
            new_state = new_image.get("state")
            if _is_port_entity(old_image) and _is_port_entity(new_image):
                if not old_state or not new_state:
                    continue
                if old_state != "FREE" and new_state != "FREE":
                    continue
                if old_state == "FREE" and new_state == "FREE":
                    continue
                op = {
                    "event_id": record["eventID"],
                    "station_id": old_image["station_id"],
                    "entity_key": old_image["entity_key"],
                    "operation": "PORT_RELEASED_OR_OCCUPIED",
                }
                change_free_state_port_ops.append(op)
            elif _is_session_entity(old_image) and _is_session_entity(new_image):
                if not old_state or not new_state:
                    continue
                if old_state in ["BOOKED", "ACTIVE"] and new_state == "UNPAID":
                    op = {
                        "event_id": record["eventID"],
                        "station_id": old_image["station_id"],
                        "entity_key": new_image["entity_key"],
                        "operation": "SESSION_UNPAID",
                        "user_id": new_image["user_id"],
                    }
                    unpaid_session_ops.append(op)
                elif old_state == "UNPAID" and new_state == "PAID":
                    op = {
                        "event_id": record["eventID"],
                        "station_id": old_image["station_id"],
                        "entity_key": old_image["entity_key"],
                        "operation": "SESSION_PAID",
                        "session_object": {k: float(v) if isinstance(v, Decimal) else v for k, v in new_image.items()},
                    }
                    paid_session_ops.append(op)
    operations = len(insert_delete_port_ops) + len(change_free_state_port_ops) + len(unpaid_session_ops) + len(paid_session_ops)
    logger.info(f"Found {operations} operations")
    if not operations:
        return {"data": {"operations": operations, "received": len(records)}}
    audit_base = {
        "service": context.function_name,
        "request_id": context.aws_request_id,
        "trigger": "dynamodb_stream",
    }
    try:
        if insert_delete_port_ops:
            audit_base["event"] = "PORT_INSERTED_OR_REMOVED"
            logger.info(f"Forwarding {len(insert_delete_port_ops)} operations to {WRITE_STATION_FUNCTION_NAME}")
            client = boto3.client("lambda", region_name=REGION)
            payload = {
                "service": { "action": "update_station_ports", "callerId": "DynamoDB Stream Consumer" },
                "data": insert_delete_port_ops,
            }
            response = client.invoke(
                InvocationType="Event",
                FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_FUNCTION_NAME}",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            status = response.get("StatusCode")
            if status != 202:
                logger.error(f"async invoke failed with status {status}")
                log_audit("ERROR", message=f"async invoke failed with status {status}", status="ERROR", 
                errorMessage=f"async invoke failed with status {status}", **audit_base)
                raise LambdaResponseError({"error": f"async invoke failed with status {status}", "code": "UNHANDLED_ERROR"})
            logger.info(f"Forwarded {len(insert_delete_port_ops)} operations to update station ports successfully")
            log_audit("INFO", message=f"Forwarded {len(insert_delete_port_ops)} operations to update station ports successfully", 
            status="SUCCESS", **audit_base)
        if change_free_state_port_ops:
            audit_base["event"] = "PORT_STATE_CHANGED"
            logger.info(f"Forwarding {len(change_free_state_port_ops)} operations to {WRITE_STATION_FUNCTION_NAME}")
            client = boto3.client("lambda", region_name=REGION)
            payload = {
                "service": { "action": "update_station_ports_state", "callerId": "DynamoDB Stream Consumer" },
                "data": change_free_state_port_ops,
            }
            response = client.invoke(
                InvocationType="Event",
                FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_FUNCTION_NAME}",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            status = response.get("StatusCode")
            if status != 202:
                logger.error(f"async invoke failed with status {status}")
                log_audit("ERROR", message=f"async invoke failed with status {status}", status="ERROR", 
                errorMessage=f"async invoke failed with status {status}", **audit_base)
                raise LambdaResponseError({"error": f"async invoke failed with status {status}", "code": "UNHANDLED_ERROR"})
            logger.info(f"Forwarded {len(change_free_state_port_ops)} operations to update station ports state successfully")
            log_audit("INFO", message=f"Forwarded {len(change_free_state_port_ops)} operations to update station ports state successfully", 
            status="SUCCESS", **audit_base)
        if unpaid_session_ops:
            audit_base["event"] = "SESSION_UNPAID"
            logger.info(f"Forwarding {len(unpaid_session_ops)} operations to {WRITE_SESSION_FUNCTION_NAME}")
            client = boto3.client("lambda", region_name=REGION)
            payload = {
                "service": { "action": "pay_session", "callerId": "DynamoDB Stream Consumer" },
                "data": unpaid_session_ops,
            }
            response = client.invoke(
                InvocationType="Event",
                FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_SESSION_FUNCTION_NAME}",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            status = response.get("StatusCode")
            if status != 202:
                logger.error(f"async invoke failed with status {status}")
                log_audit("ERROR", message=f"async invoke failed with status {status}", status="ERROR", 
                errorMessage=f"async invoke failed with status {status}", **audit_base)
                raise LambdaResponseError({"error": f"async invoke failed with status {status}", "code": "UNHANDLED_ERROR"})
            logger.info(f"Forwarded {len(unpaid_session_ops)} operations to update session state successfully")
            log_audit("INFO", message=f"Forwarded {len(unpaid_session_ops)} operations to update session state successfully", 
            status="SUCCESS", **audit_base)
        if paid_session_ops:
            audit_base["event"] = "SESSION_PAID"
            logger.info(f"Forwarding {len(paid_session_ops)} operations to {WRITE_STATION_RDS_FUNCTION_NAME}")
            client = boto3.client("lambda", region_name=REGION)
            payload = {
                "service": { "action": "archive_session", "callerId": "DynamoDB Stream Consumer" },
                "data": paid_session_ops,
            }
            response = client.invoke(
                InvocationType="Event",
                FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_RDS_FUNCTION_NAME}",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            status = response.get("StatusCode")
            if status != 202:
                logger.error(f"async invoke failed with status {status}")
                log_audit("ERROR", message=f"async invoke failed with status {status}", status="ERROR", 
                errorMessage=f"async invoke failed with status {status}", **audit_base)
                raise LambdaResponseError({"error": f"async invoke failed with status {status}", "code": "UNHANDLED_ERROR"})
            logger.info(f"Forwarded {len(paid_session_ops)} operations to archive session successfully")
            log_audit("INFO", message=f"Forwarded {len(paid_session_ops)} operations to archive session successfully", 
            status="SUCCESS", **audit_base)
    except Exception as e:
        logger.error(f"Forwarded {operations} operations failed: {str(e)}")
        log_audit("ERROR", message=f"Forwarded {operations} operations failed", status="ERROR", errorMessage=str(e), **audit_base)
        raise
    return {"data": {"operations": operations, "received": len(records)}}