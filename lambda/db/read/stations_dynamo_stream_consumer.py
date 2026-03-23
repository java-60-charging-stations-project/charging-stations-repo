import os
import boto3
import json
from typing import Any
from boto3.dynamodb.types import TypeDeserializer
from utils.logger import logger, log_audit

REGION = os.environ["AWS_REGION"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
WRITE_STATION_FUNCTION_NAME = os.environ["WRITE_STATION_FUNCTION_NAME"]

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
    operations = []
    for record in records:
        logger.info(f"Processing record: {record}")
        event_name = record.get("eventName")
        if event_name not in {"INSERT", "REMOVE"}:
            continue
        ddb = record.get("dynamodb", {})
        old_image = _deserialize_image(ddb.get("OldImage"))
        new_image = _deserialize_image(ddb.get("NewImage"))
        image = new_image if event_name == "INSERT" else old_image
        if not image or not _is_port_entity(image):
            continue
        op = {
            "event_id": record["eventID"],
            "station_id": image["station_id"],
            "entity_key": image["entity_key"],
            "operation": event_name,
            "delta": 1 if event_name == "INSERT" else -1,
        }
        operations.append(op)

    logger.info(f"Found {len(operations)} operations")
    if not operations:
        return {"data": {"operations": [], "received": len(records)}}

    audit_base = {
        "service": context.function_name,
        "request_id": context.aws_request_id,
        "event": "station_entities_stream_record",
        "trigger": "dynamodb_stream",
        "operations_count": len(operations),
    }
    try:
        logger.info(f"Forwarding {len(operations)} operations to {WRITE_STATION_FUNCTION_NAME}")
        client = boto3.client("lambda", region_name=REGION)
        payload = {
            "service": { "action": "update_station_ports", "callerId": "script" },
            "data": operations,
        }
        response = client.invoke(
            InvocationType="RequestResponse",
            FunctionName=f"arn:aws:lambda:{REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_FUNCTION_NAME}",
            Payload=json.dumps(payload).encode("utf-8"),
        )
        raw = response["Payload"].read().decode("utf-8") or "{}"
        try:
            response_json = json.loads(raw)
        except json.JSONDecodeError:
            raise RuntimeError(f"non-JSON payload: {raw}")
        if not isinstance(response_json, dict):
            raise RuntimeError(f"unexpected payload shape: {type(response_json)}")
        if response_json.get("error"):
            logger.error(f"Forwarded {len(operations)} operations to {WRITE_STATION_FUNCTION_NAME} failed: {response_json.get('error')}")
            raise RuntimeError(f"station entities stream records forwarding failed: {response_json.get('error')}")
        response_json = json.loads(raw)
        logger.info(f"Forwarded {len(operations)} operations to {WRITE_STATION_FUNCTION_NAME} successfully")
        if response_json.get("error"):
            logger.error(f"Forwarded {len(operations)} operations to {WRITE_STATION_FUNCTION_NAME} failed: {response_json.get('error')}")
            raise RuntimeError(f"station entities stream records forwarding failed: {response_json.get('error')}")
        log_audit("INFO", message="station entities stream records forwarded successfully", status="SUCCESS", **audit_base)
    except Exception as e:
        logger.error(f"Forwarded {len(operations)} operations to {WRITE_STATION_FUNCTION_NAME} failed: {str(e)}")
        log_audit("ERROR", message="station entities stream record failed", status="ERROR", errorMessage=str(e), **audit_base)
        raise
    return {"data": {"operations": operations, "received": len(records)}}