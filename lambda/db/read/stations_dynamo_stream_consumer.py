import os
import boto3
import json
from typing import Any
from boto3.dynamodb.types import TypeDeserializer
from utils.logger import logger, log_audit

REGION = os.environ["AWS_REGION"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
WRITE_STATION_FUNCTION_NAME = os.environ["WRITE_STATION_FUNCTION_NAME"]
WRITE_SESSION_FUNCTION_NAME = os.environ["WRITE_SESSION_FUNCTION_NAME"]

_deserializer = TypeDeserializer()

def _deserialize_image(image: dict[str, Any] | None) -> dict[str, Any] | None:
    if not image:
        return None
    return {k: _deserializer.deserialize(v) for k, v in image.items()}


def _is_port_entity(image: dict[str, Any] | None) -> bool:
    if not image:
        return False
    entity_key = image.get("entity_key")
    return isinstance(entity_key, str) and entity_key.startswith("PORT#")

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    logger.info(f"Received event: {event}")
    records = event.get("Records", [])
    logger.info(f"Received {len(records)} records")
    operations = 0
    start_session_ops = []
    insert_delete_port_ops = []
    for record in records:
        logger.info(f"Processing record: {record}")
        ddb = record.get("dynamodb", {})
        old_image = _deserialize_image(ddb.get("OldImage"))
        new_image = _deserialize_image(ddb.get("NewImage"))
        event_name = record.get("eventName")
        if event_name == "MODIFY":
            if not new_image or not _is_port_entity(new_image):
                continue
            old_state = old_image.get("state") if old_image else None
            new_state = new_image.get("state")
            if old_state != new_state:
                if new_state in {"BOOKED", "OCCUPIED"}:
                    op = {
                        "event_id": record["eventID"],
                        "station_id": new_image["station_id"],
                        "entity_key": new_image["entity_key"],
                        "operation": "PORT_BOOKED_OR_OCCUPIED",
                        "user_id": new_image.get("user_id"),
                        "port_booked": True if new_state == "BOOKED" else False,
                    }
                    start_session_ops.append(op)
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
    operations = len(start_session_ops) + len(insert_delete_port_ops)
    logger.info(f"Found {operations} operations")
    if not operations:
        return {"data": {"operations": operations, "received": len(records)}}
    audit_base = {
        "service": context.function_name,
        "request_id": context.aws_request_id,
        "trigger": "dynamodb_stream",
    }
    try:
        if start_session_ops:
            audit_base["event"] = "PORT_BOOKED_OR_OCCUPIED"
            logger.info(f"Forwarding {len(start_session_ops)} operations to {WRITE_SESSION_FUNCTION_NAME}")
            client = boto3.client("lambda", region_name=REGION)
            payload = {
                "service": { "action": "create_session", "callerId": "script" },
                "data": start_session_ops,
            }
            response = client.invoke(
                InvocationType="RequestResponse",
                FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_SESSION_FUNCTION_NAME}",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            raw = response["Payload"].read().decode("utf-8") or "{}"
            response_json = json.loads(raw)
            if response_json.get("error"):
                logger.error(f"Forwarded {len(start_session_ops)} operations to start sessions failed: {response_json.get('error')}")
                raise RuntimeError(f"Forwarded {len(start_session_ops)} operations to start sessions failed: {response_json.get('error')}")
            logger.info(f"Forwarded {len(start_session_ops)} operations to start sessions successfully")
            log_audit("INFO", message=f"Forwarded {len(start_session_ops)} operations to start sessions successfully", status="SUCCESS", **audit_base)
        if insert_delete_port_ops:
            audit_base["event"] = "PORT_INSERTED_OR_REMOVED"
            logger.info(f"Forwarding {len(insert_delete_port_ops)} operations to {WRITE_STATION_FUNCTION_NAME}")
            client = boto3.client("lambda", region_name=REGION)
            payload = {
                "service": { "action": "update_station_ports", "callerId": "script" },
                "data": insert_delete_port_ops,
            }
            response = client.invoke(
                InvocationType="RequestResponse",
                FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_FUNCTION_NAME}",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            raw = response["Payload"].read().decode("utf-8") or "{}"
            response_json = json.loads(raw)
            if response_json.get("error"):
                logger.error(f"Forwarded {len(insert_delete_port_ops)} operations to update station ports failed: {response_json.get('error')}")
                raise RuntimeError(f"Forwarded {len(insert_delete_port_ops)} operations to update station ports failed: {response_json.get('error')}")
            logger.info(f"Forwarded {len(insert_delete_port_ops)} operations to update station ports successfully")
            log_audit("INFO", message=f"Forwarded {len(insert_delete_port_ops)} operations to update station ports successfully", status="SUCCESS", **audit_base)
    except Exception as e:
        logger.error(f"Forwarded {operations} operations failed: {str(e)}")
        log_audit("ERROR", message=f"Forwarded {operations} operations failed", status="ERROR", errorMessage=str(e), **audit_base)
        raise
    return {"data": {"operations": operations, "received": len(records)}}