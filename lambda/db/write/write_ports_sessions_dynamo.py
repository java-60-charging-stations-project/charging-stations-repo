import os
import uuid
import boto3
import json
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import PortInstance, PortSessionInstance
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeSerializer, TypeDeserializer
import random

AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
GET_STATION_FUNCTION_NAME = os.environ["GET_STATION_FUNCTION_NAME"]
GET_PORTS_SESSIONS_FUNCTION_NAME = os.environ["GET_PORTS_SESSIONS_FUNCTION_NAME"]
PORT_STATES = ["FREE", "OCCUPIED", "ERROR", "DISABLED", "BOOKED"]
BOOKING_TIMEOUT_MINUTES = int(os.environ["BOOKING_TIMEOUT_MINUTES"])

_dynamo_client = None
_serializer = TypeSerializer()
_deserializer = TypeDeserializer()

def to_av_map(py_obj: dict) -> dict:
    return {k: _serializer.serialize(v) for k, v in py_obj.items()}

def from_av_map(av_map: dict) -> dict:
    return {k: _deserializer.deserialize(v) for k, v in av_map.items()}

def get_dynamo_client():
    global _dynamo_client
    if _dynamo_client is None:
        _dynamo_client = boto3.client("dynamodb", region_name=AWS_REGION)
    return _dynamo_client

def build_port_item(station_id: str, port: dict) -> PortInstance:
    try:
        port_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        port_item: PortInstance = {
            "station_id": station_id,
            "entity_key": f"PORT#{port["code"]}",
            "port_id": port_id,
            "state": "DISABLED",
            "last_meter_kw": Decimal(0.0),
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

def insert_station_ports(station_id: str, ports: list[dict]) -> list[dict]:
    try:
        client = get_dynamo_client()
    except Exception as e:
        logger.error(f"error getting dynamo client: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo client: {e}", "code": "DATABASE_ERROR"})
    seen_codes: set[str] = set()
    port_items: list[PortInstance] = []
    for p in ports:
        try:
            code = str(p["code"])
        except KeyError as e:
            logger.error(f"missing key: {e}")
            raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
        if code in seen_codes:
            raise LambdaResponseError(
                {"error": f"duplicate port code in request: {code}", "code": "INVALID_REQUEST"}
            )
        seen_codes.add(code)
        port_items.append(build_port_item(station_id, p))
    if not port_items:
        return []
    condition = "attribute_not_exists(station_id) AND attribute_not_exists(entity_key)"
    try:
        transact_items = [
            {"Put": {"TableName": STATIONS_DYNAMO_TABLE, "Item": to_av_map(item), "ConditionExpression": condition}}
            for item in port_items
        ]
        client.transact_write_items(TransactItems=transact_items)
        for item in port_items:
            item["last_meter_kw"] = float(item["last_meter_kw"])
            item["entity_key"] = item["entity_key"].split("#")[1]
        return port_items
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        if err_code == "TransactionCanceledException":
            logger.error(f"port already exists or conflict: {e}")
            raise LambdaResponseError({"error": f"port already exists or conflict: {e}", "code": "ALREADY_EXISTS"})
        logger.error(f"error inserting station ports: {e}")
        raise LambdaResponseError({"error": f"error inserting station ports: {e}", "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error inserting station ports: {e}")
        raise LambdaResponseError({"error": f"error inserting station ports: {e}", "code": "DATABASE_ERROR"})

def get_update_data_from_event(event: dict) -> dict:
    try:
        data = event["data"]
        station_id = data["stationId"]
        port_key = data["portCode"]
        old_state = data["oldState"]
        new_state = data["newState"]
        if not old_state in PORT_STATES:
            logger.error(f"invalid old state: {old_state}")
            raise LambdaResponseError({"error": f"invalid old state: {old_state}", "code": "INVALID_REQUEST"})
        if not new_state in PORT_STATES:
            logger.error(f"invalid new state: {new_state}")
            raise LambdaResponseError({"error": f"invalid new state: {new_state}", "code": "INVALID_REQUEST"})
        if old_state == new_state:
            logger.error(f"old state and new state are the same: {old_state}")
            raise LambdaResponseError({"error": f"old state and new state are the same: {old_state}", "code": "INVALID_REQUEST"})
        port_data = {
            "station_id": station_id,
            "port_key": port_key,
            "old_state": old_state,
            "new_state": new_state,
        }
        return port_data
    except KeyError as e:
        logger.error(f"missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error getting update data from event: {e}")
        raise LambdaResponseError({"error": f"error getting update data from event: {e}", "code": "UNHANDLED_ERROR"})

def get_session_by_user(user_id: str) -> dict:
    try:
        client = boto3.client("lambda", region_name=AWS_REGION)
    except Exception as e:
        logger.error(f"error getting lambda client: {e}")
        raise LambdaResponseError({"error": f"error getting lambda client: {e}", "code": "DATABASE_ERROR"})
    payload = {
        "service": {"action": "getSessionByUser", "callerId": "script"},
        "data": {"userId": user_id},
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_PORTS_SESSIONS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    if resp.get("StatusCode") != 200:
        raise LambdaResponseError({"error": f"error getting session by user: {resp.get('error')}", "code": "DATABASE_ERROR"})
    if resp.get("FunctionError"):
        raise LambdaResponseError({"error": f"error getting session by user: {resp['FunctionError']}", "code": "DATABASE_ERROR"})
    raw = resp["Payload"].read().decode("utf-8") or "{}"
    response_json = json.loads(raw)
    if response_json.get("error"):
        raise LambdaResponseError({"error": f"error getting session by user: {response_json.get('error')}", "code": "INVALID_REQUEST"})
    return response_json["data"]["session"][0]

def get_session_by_port(entity_key: str) -> dict:
    try:
        client = boto3.client("lambda", region_name=AWS_REGION)
    except Exception as e:
        logger.error(f"error getting lambda client: {e}")
        raise LambdaResponseError({"error": f"error getting lambda client: {e}", "code": "DATABASE_ERROR"})
    payload = {
        "service": {"action": "get_session_by_port", "callerId": "script"},
        "data": {"entity_key": entity_key},
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_PORTS_SESSIONS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    if resp.get("StatusCode") != 200:
        raise LambdaResponseError({"error": f"error getting session by port: {resp.get('error')}", "code": "DATABASE_ERROR"})
    if resp.get("FunctionError"):
        raise LambdaResponseError({"error": f"error getting session by port: {resp['FunctionError']}", "code": "DATABASE_ERROR"})
    raw = resp["Payload"].read().decode("utf-8") or "{}"
    response_json = json.loads(raw)
    if response_json.get("error"):
        raise LambdaResponseError({"error": f"error getting session by port: {response_json.get('error')}", "code": "INVALID_REQUEST"})
    return response_json["data"]["session"][0]

def calculate_price(session: dict, now: datetime) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    tariff = Decimal(str(session["tariff"]))
    booking_price = Decimal(0)
    idle_price = Decimal(0)
    price = Decimal(0)
    max_booking_price = tariff * Decimal(str(BOOKING_TIMEOUT_MINUTES))
    if session.get("time_booked_at"):
        booked_at = datetime.fromisoformat(session["time_booked_at"])
        started_charging = session.get("started_at")
        finished_booking = datetime.fromisoformat(started_charging) if started_charging else now
        booking_seconds = Decimal(str((finished_booking - booked_at).total_seconds()))
        booking_minutes = booking_seconds / Decimal(60)
        booking_price = min(booking_minutes * tariff, max_booking_price)
        price += booking_price
    energy_consumed_price = session["energy_consumed_kwh"] * tariff
    price += energy_consumed_price
    if session.get("stopped_at"):
        stopped_at = datetime.fromisoformat(session["stopped_at"])
        idle_seconds = Decimal(str((now - stopped_at).total_seconds()))
        idle_minutes = idle_seconds / Decimal(60)
        idle_price = idle_minutes * tariff
        price += idle_price
    return price.quantize(Decimal("0.01")), booking_price, energy_consumed_price, idle_price

def _transact_update_session_close_unpaid(session: dict, now: datetime) -> dict:
    ts_iso = now.isoformat()
    price = calculate_price(session, now)[0]
    return {
        "Update": {
            "TableName": STATIONS_DYNAMO_TABLE,
            "Key": {
                "station_id": {"S": str(session["station_id"])},
                "entity_key": {"S": session["entity_key"]},
            },
            "UpdateExpression": "SET #st = :unpaid, updated_at = :ts, ended_at = :ts, final_cost = :price",
            "ConditionExpression": "attribute_exists(station_id) AND (#st = :active OR #st = :booked)",
            "ExpressionAttributeNames": {"#st": "state"},
            "ExpressionAttributeValues": {
                ":active": {"S": "ACTIVE"},
                ":booked": {"S": "BOOKED"},
                ":unpaid": {"S": "UNPAID"},
                ":ts": {"S": ts_iso},
                ":price": {"N": str(price)},
            },
        }
    }

def _transact_update_session_booked_to_active(session: dict, ts_iso: str, charge_level_percent: str) -> dict:
    return {
        "Update": {
            "TableName": STATIONS_DYNAMO_TABLE,
            "Key": {
                "station_id": {"S": str(session["station_id"])},
                "entity_key": {"S": session["entity_key"]},
            },
            "UpdateExpression": "SET #st = :active, updated_at = :ts, started_at = :ts, charge_level_percent = :charge_level_percent",
            "ConditionExpression": "attribute_exists(station_id) AND #st = :booked",
            "ExpressionAttributeNames": {"#st": "state"},
            "ExpressionAttributeValues": {
                ":booked": {"S": "BOOKED"},
                ":active": {"S": "ACTIVE"},
                ":ts": {"S": ts_iso},
                ":charge_level_percent": {"N": charge_level_percent},
            },
        }
    }

def update_station_ports(action: str, port_data: dict, user_id: str| None = None) -> dict:
    if not port_data["port_key"]:
        logger.error(f"port key is required for {action}")
        raise LambdaResponseError({"error": f"port key is required for {action}", "code": "INVALID_REQUEST"})
    try:
        client = get_dynamo_client()
    except Exception as e:
        logger.error(f"error getting dynamo client: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo client: {e}", "code": "DATABASE_ERROR"})
    old_state = port_data["old_state"]
    new_state = port_data["new_state"]
    station_id = port_data["station_id"]
    port_key = port_data["port_key"]
    if action == "supportUpdateStationPorts":
        old_support_states = ["FREE", "ERROR", "DISABLED", "BOOKED", "OCCUPIED"]
        new_support_states = ["FREE", "DISABLED"]
        if old_state not in old_support_states:
            logger.error(f"invalid old state: {old_state}")
            raise LambdaResponseError({"error": f"invalid old state: {old_state}", "code": "INVALID_REQUEST"})
        if new_state not in new_support_states:
            logger.error(f"invalid new state: {new_state}")
            raise LambdaResponseError({"error": f"invalid new state: {new_state}", "code": "INVALID_REQUEST"})
        if old_state == "BOOKED" and new_state == "FREE":
            logger.error(f"old state is BOOKED and new state is FREE")
            raise LambdaResponseError({"error": f"old state is BOOKED and new state is FREE", "code": "INVALID_REQUEST"})
        if old_state == "OCCUPIED" and (new_state == "BOOKED" or new_state == "FREE"):
            logger.error(f"old state is OCCUPIED and new state is BOOKED or FREE")
            raise LambdaResponseError({"error": f"old state is OCCUPIED and new state is BOOKED or FREE", "code": "INVALID_REQUEST"})
    elif action == "userUpdateStationPorts":
        if not user_id:
            logger.error(f"user is required")
            raise LambdaResponseError({"error": f"user is required", "code": "INVALID_REQUEST"})
        old_user_states = ["FREE", "BOOKED", "OCCUPIED"]
        new_user_states = ["FREE", "BOOKED", "OCCUPIED"]
        if old_state not in old_user_states:
            logger.error(f"invalid old state: {old_state}")
            raise LambdaResponseError({"error": f"invalid old state: {old_state}", "code": "INVALID_REQUEST"})
        if new_state not in new_user_states:
            logger.error(f"invalid new state: {new_state}")
            raise LambdaResponseError({"error": f"invalid new state: {new_state}", "code": "INVALID_REQUEST"})
    elif action == "lambda_update_station_ports":
        pass
    updated_at = datetime.now(timezone.utc).isoformat()
    transact_items: list[dict] = []
    try:
        attr_values = {
            ":updated_at": {"S": updated_at},
            ":new_state": {"S": new_state},
            ":old_state": {"S": old_state},
        }
        update_expression = "SET updated_at = :updated_at, #s = :new_state"
        attr_names = {"#s": "state"}
        entity_key = f"PORT#{port_key}"
        transact_items.append({
            "Update": {"TableName": STATIONS_DYNAMO_TABLE,
                "Key": {"station_id": {"S": station_id}, "entity_key": {"S": entity_key}},
                "UpdateExpression": update_expression,
                "ConditionExpression": "attribute_exists(entity_key) AND #s = :old_state",
                "ExpressionAttributeNames": attr_names,
                "ExpressionAttributeValues": attr_values,}})
        update_info = {
            "station_id": station_id,
            "entity_key": entity_key,
            "new_state": new_state,
            "updated_at": updated_at,
        }
        now = datetime.now(timezone.utc)
        if user_id:
            update_info["user_id"] = user_id
            if old_state == "FREE" and new_state != "FREE": 
                if new_state == "BOOKED":
                    booked_by = now - timedelta(minutes=BOOKING_TIMEOUT_MINUTES)
                    update_info["time_booked_at"] = now.isoformat()
                    update_info["time_booked_before"] = booked_by.isoformat()
                elif new_state == "OCCUPIED":
                    update_info["time_started_at"] = now.isoformat()
                    random_charge_level_percent = random.randint(20, 95)
                    update_info["charge_level_percent"] = Decimal(str(random_charge_level_percent))
                session_object = build_session_object(update_info)
                session_lock_item = {
                    "station_id": user_id,
                    "entity_key": "SESSION_LOCK",
                    "session_id": session_object["session_id"],
                    "port_code": entity_key,
                    "created_at": now.isoformat(),
                }
                transact_items.extend([
                    {"Put": {"TableName": STATIONS_DYNAMO_TABLE,"Item": to_av_map(session_object),
                    "ConditionExpression": "attribute_not_exists(station_id) AND attribute_not_exists(entity_key)"}},
                    {"Put": {"TableName": STATIONS_DYNAMO_TABLE,"Item": to_av_map(session_lock_item),
                    "ConditionExpression": "attribute_not_exists(station_id) AND attribute_not_exists(entity_key)"
                        }}])
                update_info["session_id"] = session_object["session_id"]
                update_info["entity_key"] = port_key
            else:
                session = get_session_by_user(user_id)
                update_info["session_id"] = session["session_id"]
                update_info["entity_key"] = port_key
                if new_state == "OCCUPIED" and old_state == "BOOKED":
                    ts_iso = now.isoformat()
                    random_charge_level_percent = random.randint(20, 95)
                    update_info["charge_level_percent"] = str(random_charge_level_percent)
                    transact_items.append(_transact_update_session_booked_to_active(session, ts_iso, random_charge_level_percent))
                elif old_state in ["BOOKED", "OCCUPIED"] and new_state == "FREE":
                    transact_items.append(_transact_update_session_close_unpaid(session, now))
        elif new_state == "DISABLED":
            session = get_session_by_port(update_info["station_id"], entity_key)
            if session:
                transact_items.append(_transact_update_session_close_unpaid(session, now))
        response = client.transact_write_items(TransactItems=transact_items)
        logger.info(f"transaction response: {response}")
        return update_info
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        if err_code == "ConditionalCheckFailedException":
            logger.error(f"session not found or old state does not match: {e}")
            raise LambdaResponseError({"error": f"session not found or old state does not match: {e}", 
            "code": "INVALID_REQUEST"})
        if err_code == "TransactionCanceledException":
            reasons = e.response.get("CancellationReasons") or []
            logger.error(f"session not created due to transaction cancellation: {reasons}")
            raise LambdaResponseError({"error": f"session not created due to transaction cancellation: {reasons}",
             "code": "DATABASE_ERROR"})
        logger.error(f"error updating station ports: {e}")
        raise LambdaResponseError({"error": f"error updating station ports: {e}", "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error updating station ports: {e}")
        raise LambdaResponseError({"error": f"error updating station ports: {e}", "code": "UNHANDLED_ERROR"})

def delete_station_ports(station_id: str, port_key: str) -> list[dict]:
    try:
        client = get_dynamo_client()
    except Exception as e:
        logger.error(f"error getting dynamo client for delete: {e}")
        raise LambdaResponseError(
            {"error": f"error getting dynamo client: {e}", "code": "DATABASE_ERROR"}
        )
    deleted_at = datetime.now(timezone.utc).isoformat()
    try:
        entity_key = f"PORT#{port_key}"
        client.delete_item(
            TableName=STATIONS_DYNAMO_TABLE,
            Key={
                "station_id": {"S": station_id},
                "entity_key": {"S": entity_key},
            },
            ConditionExpression="attribute_exists(entity_key) AND #s = :disabled",
            ExpressionAttributeNames={"#s": "state"},
            ExpressionAttributeValues={":disabled": {"S": "DISABLED"}},
        )
        return {"station_id": station_id, "port_key": port_key, "deleted_at": deleted_at}
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise LambdaResponseError({"error": f"port not found or state is not DISABLED: {e}", "code": "INVALID_REQUEST"})
        else:
            raise LambdaResponseError({"error": f"error deleting station port: {e}", "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error deleting station ports from dynamo: {e}")
        raise LambdaResponseError({"error": f"error deleting station ports: {e}", "code": "UNHANDLED_ERROR"})

def get_tariff(station_id: str) -> Decimal:
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
        "service": {
        "action": "getStationById",
        "callerId": "dynamo_start_session_lambda",
        },
        "data": {
            "stationId": station_id,
        },
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_STATION_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    raw = resp["Payload"].read().decode()
    response_json = json.loads(raw)
    if response_json.get("error"):
        logger.error(f"error getting station info: {response_json.get('error')}")
        raise LambdaResponseError({"error": f"error getting station info: {response_json.get('error')}", "code": "DATABASE_ERROR"})
    tariff = str((response_json.get("data", {}).get("rate_plan", {}).get("offPeakRate", 0.0)))
    return tariff

def pay_session(session_data: dict) -> dict:
    try:
        client = get_dynamo_client()
    except Exception as e:
        logger.error(f"error getting dynamo client for pay session: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo client for pay session: {e}", "code": "DATABASE_ERROR"})
    user_id = session_data["user_id"]
    entity_key = session_data["entity_key"]
    event_id = session_data["event_id"]
    transact_items: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    transact_items.append({
        "Delete": {"TableName": STATIONS_DYNAMO_TABLE,
        "Key": {"station_id": {"S": str(user_id)}, "entity_key": {"S": "SESSION_LOCK"}},
        "ConditionExpression": "attribute_exists(station_id)"}})
    transact_items.append({
        "Update": {"TableName": STATIONS_DYNAMO_TABLE,
        "Key": {"station_id": {"S": str(session_data["station_id"])}, "entity_key": {"S": entity_key}},
        "UpdateExpression": "SET #st = :paid, updated_at = :ts, paid_at = :ts, last_event_id = :last_event_id",
        "ConditionExpression": """attribute_exists(station_id) AND attribute_exists(entity_key) AND attribute_type(paid_at, :type_null) 
        AND (attribute_type(last_event_id, :type_null) OR last_event_id <> :last_event_id)""",
        "ExpressionAttributeNames": {"#st": "state"},
        "ExpressionAttributeValues": {":paid": {"S": "PAID"}, ":ts": {"S": now}, ":last_event_id": {"S": event_id}, ":type_null": {"S": "NULL"}}},
    })
    try:
        client.transact_write_items(TransactItems=transact_items)
        session_id = entity_key.split("#")[-1]
        response = {
            "user_id": user_id,
            "session_id": session_id,
            "paid_at": now,
        }
        logger.info(f"session paid successfully: {response}")
        return response
    except ClientError as e:
        err_code = e.response.get("Error", {}).get("Code", "")
        if err_code == "ConditionalCheckFailedException":
            logger.error(f"session not found or old state does not match: {e}")
            raise LambdaResponseError({"error": f"session not found or old state does not match: {e}", 
            "code": "INVALID_REQUEST"})
        logger.error(f"error updating station ports: {e}")
        raise LambdaResponseError({"error": f"error updating station ports: {e}", "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error updating station ports: {e}")
        raise LambdaResponseError({"error": f"error updating station ports: {e}", "code": "UNHANDLED_ERROR"})

def build_session_object(session_data: dict) -> dict:
    try:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        tariff = get_tariff(session_data["station_id"])
        port_booked = session_data.get("time_booked_at")
        charge_level_percent = session_data.get("charge_level_percent")
        session_object: PortSessionInstance = {
            "session_id": session_id,
            "station_id": session_data["station_id"],
            "entity_key": f"{session_data['entity_key']}#SESSION#{session_id}",
            "state": "BOOKED" if port_booked else "ACTIVE",
            "user_id": session_data["user_id"],
            "energy_consumed_kwh": Decimal(0),
            "tariff": Decimal(tariff),
            "current_cost": Decimal(0),
            "final_cost": Decimal(0),
            "estimated_minutes_remaining": None,
            "duration_minutes": None,
            "charge_level_percent": charge_level_percent,
            "created_at": timestamp,
            "updated_at": timestamp,
            "time_booked_at": session_data.get("time_booked_at"),
            "time_booked_before": session_data.get("time_booked_before"),
            "booking_duration_minutes": None,
            "started_at": timestamp if not port_booked else None,
            "stopped_at": None,
            "ended_at": None,
            "last_event_id": None,
            "paid_at": None,
        }
        logger.info(f"Session object built successfully: {session_object}")
        return session_object
    except KeyError as e:
        logger.error(f"missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error building session object: {e}")
        raise LambdaResponseError({"error": f"error building session object: {e}", "code": "UNHANDLED_ERROR"})

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
            case "insertStationPorts":
                station_id = event["data"]["stationId"]
                ports = event["data"]["ports"]
                created_ports = insert_station_ports(station_id, ports)
                log_audit("INFO", message="station ports inserted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"created_ports": created_ports}, meta={})
            case "supportUpdateStationPorts":
                update_data = get_update_data_from_event(event)
                updated_port_data = update_station_ports(action, update_data)
                log_audit("INFO", message="station ports updated successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=updated_port_data, meta={})
            case "userUpdateStationPorts":
                user_id = event["data"]["userId"]
                update_data = get_update_data_from_event(event)
                updated_port_data = update_station_ports(action, update_data, user_id)
                log_audit("INFO", message="station ports updated successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=updated_port_data, meta={})
            case "deleteStationPorts":
                station_id = event["data"]["stationId"]
                port_key = event["data"]["portKey"]
                deleted_port = delete_station_ports(station_id, port_key)
                log_audit("INFO", message="station ports deleted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=deleted_port, meta={})
            case "pay_session":
                paid_sessions: list[dict] = []
                for session_data in event["data"]:
                    paid_session = pay_session(session_data)
                    paid_sessions.append(paid_session)
                    log_audit("INFO", message="session paid successfully", status="SUCCESS", **audit_base)
                log_audit("INFO", message="all sessions paid successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"paid_sessions": paid_sessions}, meta={})
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