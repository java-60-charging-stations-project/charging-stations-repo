import os
import boto3
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from utils.price_calculator import calculate_price
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
import random
import json

AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
SESSION_STATE_INDEX = os.environ["SESSION_STATE_INDEX_NAME"]
BOOKING_TIMEOUT_MINUTES = int(os.environ["BOOKING_TIMEOUT_MINUTES"])
NOTIFICATION_LAMBDA_FUNCTION_NAME = os.environ["NOTIFICATION_LAMBDA_FUNCTION_NAME"]

_dynamo = None
_stations_table = None

def get_dynamo_stations_table():
    global _dynamo, _stations_table
    if _stations_table is None:
        _dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
        _stations_table = _dynamo.Table(STATIONS_DYNAMO_TABLE)
    return _stations_table


def _query_sessions_by_state(table, state: str) -> list[dict]:
    items: list[dict] = []
    params = {
        "IndexName": SESSION_STATE_INDEX,
        "KeyConditionExpression": Key("state").eq(state),
        "ProjectionExpression": (
            "station_id, entity_key, #st, tariff, energy_consumed_kwh, "
            "time_booked_at, started_at, stopped_at, charge_level_percent, user_id"
        ),
        "FilterExpression": "contains(entity_key, :session_marker)",
        "ExpressionAttributeNames": {"#st": "state"},
        "ExpressionAttributeValues": {":session_marker": "#SESSION#"},
    }
    while True:
        resp = table.query(**params)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        params["ExclusiveStartKey"] = lek
    return items

def get_target_sessions(table) -> list[dict]:
    booked = _query_sessions_by_state(table, "BOOKED")
    active = _query_sessions_by_state(table, "ACTIVE")
    unique: dict[tuple[str, str], dict] = {}
    for item in booked + active:
        key = (item["station_id"], item["entity_key"])
        unique[key] = item
    return list(unique.values())

def handler(event, context) -> SuccessResponsePayload | ErrorResponsePayload:
    audit_base = {
        "caller_id": "eventbridge",
        "service": context.function_name,
        "event": "check_sessions_price",
        "request_id": context.aws_request_id,
        "trigger": "cron",
    }
    try:
        table = get_dynamo_stations_table()
        sessions = get_target_sessions(table)
        checked = len(sessions)
        updated = 0
        skipped = 0
        failed = 0
        for session in sessions:
            station_id = session["station_id"]
            entity_key = session["entity_key"]
            user_id = session["user_id"]
            try:
                if session.get("state") not in {"BOOKED", "ACTIVE"}:
                    skipped += 1
                    continue
                now = datetime.now(timezone.utc)
                if session["state"] == "ACTIVE":
                    started_at = session.get("started_at")
                    if started_at:
                        session["duration_minutes"] = Decimal(str((now - datetime.fromisoformat(started_at)).total_seconds() / 60))
                    charge_level_percent = int(session.get("charge_level_percent") or 0)
                    energy_consumed_kwh = Decimal(str(session.get("energy_consumed_kwh") or 0))
                    remaining_charge_percent = max(0, 100 - charge_level_percent)
                    if remaining_charge_percent > 0:
                        additional_charge_percent = random.randint(1, min(remaining_charge_percent, 3))
                        new_charge_percent = charge_level_percent + additional_charge_percent
                        if new_charge_percent >= 100:
                            logger.info(f"Session {station_id}/{entity_key} charge level percent is 100, stopping charging")
                            client = boto3.client("lambda", region_name=AWS_REGION)
                            resp = client.invoke(
                                FunctionName=NOTIFICATION_LAMBDA_FUNCTION_NAME,
                                InvocationType="Event",
                                Payload=json.dumps({"service": 
                                {"action": "notify_charging_stopped", "callerId": "charge_sim_price_calc"}, 
                                "data": {"station_id": station_id, "entity_key": entity_key, "user_id": user_id}}).encode("utf-8"),
                            )
                            if resp.get("StatusCode") != 202:
                                logger.error(f"error stopping charging: {resp}")
                            if resp.get("FunctionError"):
                                logger.error(f"error stopping charging: {resp.get('FunctionError')}")
                            logger.info(f"charging stopped notification invoked successfully: {resp}")
                            session["stopped_at"] = now.isoformat()
                            new_charge_percent = 100
                            additional_charge_percent = 100 - charge_level_percent
                        additional_charge_kwh = Decimal(str(additional_charge_percent * 1))
                        session["charge_level_percent"] = new_charge_percent
                        session["energy_consumed_kwh"] = energy_consumed_kwh + additional_charge_kwh
                        session["estimated_minutes_remaining"] = Decimal(str(100 - new_charge_percent))
                current_cost = calculate_price(session, now, BOOKING_TIMEOUT_MINUTES)[0]
                update_expression_parts = ["updated_at = :ts", "current_cost = :price"]
                expression_values: dict = {
                    ":booked": "BOOKED",
                    ":active": "ACTIVE",
                    ":ts": now.isoformat(),
                    ":price": current_cost,
                }
                if session["state"] == "ACTIVE":
                    update_expression_parts.extend([
                        "energy_consumed_kwh = :energy_consumed_kwh",
                        "charge_level_percent = :charge_level_percent",
                    ])
                    expression_values[":energy_consumed_kwh"] = session.get("energy_consumed_kwh", Decimal("0"))
                    expression_values[":charge_level_percent"] = Decimal(str(session.get("charge_level_percent", 0)))
                    if session.get("duration_minutes") is not None:
                        update_expression_parts.append("duration_minutes = :duration_minutes")
                        expression_values[":duration_minutes"] = session["duration_minutes"]
                    if session.get("estimated_minutes_remaining") is not None:
                        update_expression_parts.append("estimated_minutes_remaining = :estimated_minutes_remaining")
                        expression_values[":estimated_minutes_remaining"] = session["estimated_minutes_remaining"]
                    if session.get("stopped_at"):
                        update_expression_parts.append("stopped_at = :stopped_at")
                        expression_values[":stopped_at"] = session["stopped_at"]
                table.update_item(
                    Key={"station_id": station_id, "entity_key": entity_key},
                    UpdateExpression=f"SET {', '.join(update_expression_parts)}",
                    ConditionExpression="""attribute_exists(station_id) AND attribute_exists(entity_key) 
                    AND (#st = :booked OR #st = :active)""",
                    ExpressionAttributeNames={"#st": "state"},
                    ExpressionAttributeValues=expression_values,
                )
                updated += 1
            except Exception as e:
                failed += 1
                logger.error(f"Failed updating session price for {station_id}/{entity_key}: {e}")
        response = {"checked": checked, "updated": updated, "skipped": skipped, "failed": failed}
        log_audit("INFO", message="sessions price check completed", status="SUCCESS", **audit_base)
        logger.info(f"Session price cron result: {response}")
        return SuccessResponsePayload(data=response, meta={})

    except LambdaResponseError as e:
        log_audit("ERROR", message=f"sessions price check failed: {e.response.get('error')}", status="ERROR", 
        errorMessage=e.response.get("error"), **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    except Exception as e:
        log_audit("ERROR", message=f"sessions price check failed: {str(e)}", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error=f"unhandled error: {e}", code="UNHANDLED_ERROR")