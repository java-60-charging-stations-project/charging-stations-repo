import os
import uuid
import boto3
import json
from decimal import Decimal
from datetime import datetime
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload
from data_types.db_instance_types import PortInstance, PortSessionInstance
from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeSerializer

AWS_REGION = os.environ["AWS_REGION"]
STATIONS_DYNAMO_TABLE = os.environ["STATIONS_DYNAMO_TABLE"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
GET_STATION_FUNCTION_NAME = os.environ["GET_STATION_FUNCTION_NAME"]
PORT_STATES = ["FREE", "OCCUPIED", "ERROR", "DISABLED", "BOOKED"]

_dynamo = None
_stations_table = None
_serializer = TypeSerializer()

def to_av_map(py_obj: dict) -> dict:
    return {k: _serializer.serialize(v) for k, v in py_obj.items()}

def get_dynamo_stations_table():
    global _dynamo, _stations_table
    if _stations_table is None:
        _dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
        _stations_table = _dynamo.Table(STATIONS_DYNAMO_TABLE)
    return _stations_table

def build_port_item(station_id: str, port: dict) -> PortInstance:
    try:
        port_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        port_item: PortInstance = {
            "station_id": station_id,
            "entity_key": f"PORT#{port["code"]}",
            "port_id": port_id,
            "state": "DISABLED",
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
                created_port_keys.append(port_item["entity_key"] if port_item["entity_key"] else "")
                batch.put_item(Item=port_item)
        return created_port_keys
    except Exception as e:
        logger.error(f"error inserting station ports: {e}")
        raise LambdaResponseError({"error": f"error inserting station ports: {e}", "code": "DATABASE_ERROR"})

def get_update_data_from_event(event: dict) -> dict:
    try:
        data = event["data"]
        station_id = data["stationId"]
        port_keys = data["ports"]
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
        return {"station_id": station_id, "port_keys": port_keys, "old_state": old_state, "new_state": new_state}
    except KeyError as e:
        logger.error(f"missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error getting update data from event: {e}")
        raise LambdaResponseError({"error": f"error getting update data from event: {e}", "code": "UNHANDLED_ERROR"})

def update_station_ports(action: str, station_id: str, port_keys: list[str], old_state: str, new_state: str, user: str| None = None) -> list[dict]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"})
    if action == "supportUpdateStationPorts":
        old_support_states = ["FREE", "ERROR", "DISABLED", "BOOKED"]
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
    elif action == "userUpdateStationPorts":
        if len(port_keys) != 1:
            logger.error(f"invalid number of port keys: {len(port_keys)}")
            raise LambdaResponseError({"error": f"invalid number of port keys: {len(port_keys)}", "code": "INVALID_REQUEST"})
        if not user:
            logger.error(f"user is required")
            raise LambdaResponseError({"error": f"user is required", "code": "INVALID_REQUEST"})
        old_user_states = ["FREE", "BOOKED"]
        new_user_states = ["FREE", "BOOKED", "OCCUPIED"]
        if old_state not in old_user_states:
            logger.error(f"invalid old state: {old_state}")
            raise LambdaResponseError({"error": f"invalid old state: {old_state}", "code": "INVALID_REQUEST"})
        if new_state not in new_user_states:
            logger.error(f"invalid new state: {new_state}")
            raise LambdaResponseError({"error": f"invalid new state: {new_state}", "code": "INVALID_REQUEST"})
    elif action == "lambda_update_station_ports":
        pass
    updated_ports: list[dict] = []
    updated_at = datetime.now().isoformat()
    transact_items: list[dict] = []
    try:
        for port_key in port_keys:
            attr_values = {
                ":updated_at": {"S": updated_at},
                ":new_state": {"S": new_state},
                ":old_state": {"S": old_state},
            }
            update_expression = "SET updated_at = :updated_at, state = :new_state"
            if user:
                update_expression += ", user_id = :user_id"
                attr_values[":user_id"] = {"S": user}
            transact_items.append({
                "Update": {
                    "TableName": STATIONS_DYNAMO_TABLE,
                    "Key": {
                        "station_id": {"S": station_id},
                        "entity_key": {"S": port_key},
                    },
                    "UpdateExpression": update_expression,
                    "ConditionExpression": "attribute_exists(entity_key) AND state = :old_state",
                    "ExpressionAttributeValues": attr_values,
                }
            })
            updated_ports.append({"station_id": station_id, "port_key": port_key, "new_state": new_state, "updated_at": updated_at})
        response = table.meta.client.transact_write_items(TransactItems=transact_items)
        logger.info(f"transaction response: {response}")
        return updated_ports
    except ClientError as e:
        logger.error(f"error updating station ports: {e}")
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise LambdaResponseError({"error": f"port not found or old state does not match: {e}", "code": "INVALID_REQUEST"})
        elif e.response["Error"]["Code"] == "TransactionCanceledException":
            raise LambdaResponseError({"error": f"transaction canceled: {e}", "code": "TRANSACTION_CANCELED"})
        else:
            raise LambdaResponseError({"error": f"error updating station ports: {e}", "code": "UNHANDLED_ERROR"})
    except Exception as e:
        logger.error(f"error updating station ports: {e}")
        raise LambdaResponseError({"error": f"error updating station ports: {e}", "code": "UNHANDLED_ERROR"})

def delete_station_ports(station_id: str, port_keys: list[str]) -> list[dict]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo stations table for delete: {e}")
        raise LambdaResponseError(
            {"error": f"error getting dynamo stations table: {e}", "code": "DATABASE_ERROR"}
        )
    if len(port_keys) != 1:
        logger.error(f"Only one port can be deleted at a time: {len(port_keys)}")
        raise LambdaResponseError({"error": f"Only one port can be deleted at a time: {len(port_keys)}", "code": "INVALID_REQUEST"})
    deleted_at = datetime.now().isoformat()
    deleted_ports: list[dict] = []
    try:
        for port_key in port_keys:
            table.delete_item(
                Key={"station_id": station_id, "entity_key": port_key},
                ConditionExpression="attribute_not_exists(entity_key) OR state = :disabled",
                ExpressionAttributeValues={":disabled": "DISABLED"},
            )
            deleted_ports.append({"station_id": station_id, "port_key": port_key, "deleted_at": deleted_at})
        return deleted_ports
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise LambdaResponseError({"error": f"port not found or state is not DISABLED: {e}", "code": "INVALID_REQUEST"})
        else:
            raise LambdaResponseError({"error": f"error deleting station port: {e}", "code": "DATABASE_ERROR"})
    except Exception as e:
        logger.error(f"error deleting station ports from dynamo: {e}")
        raise LambdaResponseError(
            {"error": f"error deleting station ports: {e}", "code": "DATABASE_ERROR"}
        )



def get_tariff(station_id: str) -> float:
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
    tariff = response_json.get("data", {}).get("rate_plan", {}).get("offPeakRate", 0.0)
    return tariff

def build_session_object(session_data: dict) -> PortSessionInstance:
    try:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        tariff = get_tariff(session_data["station_id"])
        session_object: PortSessionInstance = {
            "session_id": session_id,
            "station_id": session_data["station_id"],
            "entity_key": f"{session_data['entity_key']}#SESSION#{session_id}",
            "state": "BOOKED" if session_data["port_booked"] else "ACTIVE",
            "user_id": session_data["user_id"],
            "energy_consumed_kwh": 0.0,
            "tariff": tariff,
            "current_cost": 0.0,
            "estimated_minutes_remaining": None,
            "duration_minutes": None,
            "booking_duration_minutes": None,
            "charge_level_percent": None,
            "created_at": timestamp,
            "updated_at": timestamp,
            "booked_at": timestamp if session_data["port_booked"] else None,
            "started_at": None,
            "ended_at": None,
            "event_id": session_data["event_id"],
        }
        logger.info(f"Session object built successfully: {session_object}")
        return session_object, session_data["port_id"]
    except KeyError as e:
        logger.error(f"missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"error building session object: {e}")
        raise LambdaResponseError({"error": f"error building session object: {e}", "code": "UNHANDLED_ERROR"})

def create_session(session_data: list[dict]) -> list[str]:
    try:
        table = get_dynamo_stations_table()
    except Exception as e:
        logger.error(f"error getting dynamo sessions table: {e}")
        raise LambdaResponseError({"error": f"error getting dynamo sessions table: {e}", "code": "DATABASE_ERROR"})
    session_ids: list[str] = []
    for session_data in session_data:
        session_object, port_key = build_session_object(session_data)
        station_id = session_object["station_id"]
        event_id = session_object["event_id"]
        now = datetime.now().isoformat()
        logger.info(f"Session object built successfully: {session_object}")
        try:
            client = table.meta.client
            client.transact_write_items(
                TransactItems=[
                    {"ConditionCheck": {"TableName": STATIONS_DYNAMO_TABLE, "Key": 
                    {"station_id": {"S": station_id}, "entity_key": {"S": port_key}},
                            "ConditionExpression": (
                                "attribute_exists(entity_key) "
                                "AND #s = :free "
                                "AND (attribute_not_exists(last_event_id) OR last_event_id <> :event_id)"
                            ),
                            "ExpressionAttributeNames": {"#s": "state"},
                            "ExpressionAttributeValues": {":free": {"S": "FREE"}, ":event_id": {"S": event_id}},
                        }
                    },
                    {"Update": {"TableName": STATIONS_DYNAMO_TABLE, "Key": {"station_id": {"S": station_id}, "entity_key": {"S": port_key}},
                            "UpdateExpression": "SET #s = :new_state, updated_at = :updated_at, last_event_id = :event_id",
                            "ExpressionAttributeNames": {"#s": "state"},
                            "ExpressionAttributeValues": {
                                ":new_state": {"S": "OCCUPIED"},
                                ":updated_at": {"S": now},
                                ":event_id": {"S": event_id},
                            },
                        }
                    },
                    {
                    "Put": {
                        "TableName": STATIONS_DYNAMO_TABLE,
                        "Item": to_av_map(session_object),
                        "ConditionExpression": "attribute_not_exists(station_id) AND attribute_not_exists(entity_key)",
                        }
                    },
                ]
            )
            logger.info(f"Session object put successfully: {session_object}")
            session_ids.append(session_object["session_id"])
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code == "TransactionCanceledException":
                raise LambdaResponseError(
                    {"error": f"session not created (duplicate event or port not FREE): {e}", "code": "INVALID_REQUEST"}
                )
            raise LambdaResponseError({"error": f"error putting session object: {e}", "code": "DATABASE_ERROR"})
        except Exception as e:
            logger.error(f"error putting session object: {e}")
            raise LambdaResponseError({"error": f"error putting session object: {e}", "code": "UNHANDLED_ERROR"})
    return session_ids

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
                created_port_keys = insert_station_ports(station_id, ports)
                log_audit("INFO", message="station ports inserted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"created_port_keys": created_port_keys}, meta={})
            case "supportUpdateStationPorts":
                update_data = get_update_data_from_event(event)
                updated_port_keys = update_station_ports(action, update_data["station_id"], update_data["port_keys"], 
                update_data["old_state"], update_data["new_state"])
                log_audit("INFO", message="station ports updated successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"updated_port_keys": updated_port_keys}, meta={})
            case "userUpdateStationPorts":
                update_data = get_update_data_from_event(event)
                updated_port_keys = update_station_ports(action, update_data["station_id"], update_data["port_keys"], 
                update_data["old_state"], update_data["new_state"], caller_id)
                log_audit("INFO", message="station ports updated successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"updated_port_keys": updated_port_keys}, meta={})
            case "deleteStationPorts":
                station_id = event["data"]["stationId"]
                port_keys = event["data"]["portKeys"]
                deleted_ports = delete_station_ports(station_id, port_keys)
                log_audit("INFO", message="station ports deleted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"deleted_ports": deleted_ports}, meta={})
            case "create_session":
                session_ids = create_session(event["data"])
                log_audit("INFO", message="session created successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"session_ids": session_ids}, meta={})
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