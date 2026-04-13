from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
import boto3, json
import os
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload

BOOKING_INDEX = os.environ["BOOKING_TIME_INDEX_NAME"]
AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
WRITE_PORTS_FUNCTION_NAME = os.environ["WRITE_PORTS_FUNCTION_NAME"]

_dynamo = None
_stations_table = None
lambda_client = boto3.client("lambda", region_name=AWS_REGION)

def get_dynamo_stations_table():
    global _dynamo, _stations_table
    if _stations_table is None:
        _dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
        _stations_table = _dynamo.Table(STATIONS_DYNAMO_TABLE)
    return _stations_table

def get_expired_bookings(table):
    now_iso = datetime.now(timezone.utc).isoformat()
    items = []
    params = {
        "IndexName": BOOKING_INDEX,
        "KeyConditionExpression": Key("#st").eq("BOOKED") & Key("time_booked_before").lte(now_iso),
        "ProjectionExpression": "station_id, entity_key, user_id, time_booked_before",
        "ExpressionAttributeNames": {"#st": "state"}
    }

    while True:
        resp = table.query(**params)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        params["ExclusiveStartKey"] = lek

    return items

def release_booking(item):
    port_code = item["entity_key"].split("#", 1)[1]
    payload = {
        "service": {"action": "userUpdateStationPorts", "callerId": "expire-bookings-cron"},
        "data": {
            "userId": item["user_id"],
            "stationId": item["station_id"],
            "portCode": port_code,
            "oldState": "BOOKED",
            "newState": "FREE",
        },
    }
    return lambda_client.invoke(
        FunctionName=WRITE_PORTS_FUNCTION_NAME,
        InvocationType="Event",
        Payload=json.dumps(payload).encode("utf-8"),
    )

def process_expired(items):
    queued, queue_failed = 0, 0
    for item in items:
        try:
            resp = release_booking(item)
            if resp.get("StatusCode") == 202:
                queued += 1
            else:
                queue_failed += 1
        except Exception:
            queue_failed += 1
    return queued, queue_failed

def handler(event, context) -> SuccessResponsePayload | ErrorResponsePayload:
    table = get_dynamo_stations_table()
    expired = get_expired_bookings(table)
    ok, failed = process_expired(expired)
    audit_base = {
        "caller_id": "eventbridge",
        "service": context.function_name,
        "event": "check_overbooked_bookings",
        "request_id": context.aws_request_id,
        "trigger": "cron",
    }
    result = {
        "checked": len(expired),
        "released": ok,
        "failed": failed,
    }
    log_audit("INFO", message="overbooked bookings checked and released", status="SUCCESS", **audit_base)
    logger.info(f"Bookings result: {result}")
    return SuccessResponsePayload(data=result, meta={})