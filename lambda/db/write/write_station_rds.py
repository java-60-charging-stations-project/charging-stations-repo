import os
import boto3
import psycopg2
from psycopg2 import sql
import json
import uuid
from datetime import datetime
from typing import Any
from utils.logger import logger
from utils.logger import log_audit
from utils.error_handlers import LambdaResponseError
from data_types.db_instance_types import StationInstance
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload

_conn = None
AWS_REGION = os.environ["AWS_REGION"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
GET_PORTS_SESSIONS_FUNCTION_NAME = os.environ["GET_PORTS_SESSIONS_FUNCTION_NAME"]

def get_db_config() -> dict:
    return {
        "host": os.environ["DB_HOST"],
        "port": int(os.environ.get("DB_PORT", "5432")),
        "dbname": os.environ["DB_NAME"],
        "user": os.environ["DB_USER"],
        "region": os.environ.get("AWS_REGION", "il-central-1"),
    }

def get_connection() -> psycopg2.extensions.connection:
    global _conn
    if _conn is None or _conn.closed:
        cfg = get_db_config()
        rds = boto3.client("rds", region_name=cfg["region"])
        token = rds.generate_db_auth_token(
            DBHostname=cfg["host"],
            Port=cfg["port"],
            DBUsername=cfg["user"],
            Region=cfg["region"],
        )
        _conn = psycopg2.connect(
            host=cfg["host"],
            port=cfg["port"],
            dbname=cfg["dbname"],
            user=cfg["user"],
            password=token,
            sslmode="require",
        )
    return _conn

def extract_partial_station_instance_from_event(data: dict) -> dict:
    logger.info(f"Extracting partial station instance from event")
    try:
        station_data = {
        "id": data["stationId"],
        "name": data.get("name"),
        "owner": data.get("owner"),
        "city": data.get("city"),
        "address": data.get("address"),
        "rate_plan": data.get("ratePlan"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "site_technician": data.get("siteTechnician"),
        "max_power_kw": data.get("maxPowerKw", 0.0),
        "longitude": data.get("longitude", 0.0),
        "latitude": data.get("latitude", 0.0),
        }
        station_obj = {}
        for key, value in station_data.items():
            if value is not None:
                station_obj[key] = value
        return station_obj
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}", "code": "UNHANDLED_ERROR"})

def extract_full_station_instance_from_event(event: dict) -> StationInstance:
    logger.info(f"Extracting station instance from event")
    try:
        data = event["data"]
        location = data["location"] if data.get("location") else {"longitude": 0.0, "latitude": 0.0}
        timestamp = datetime.now()
        station_instance: StationInstance = {
            "id": str(uuid.uuid4()),
            "code": data["code"],
            "name": data["name"],
            "owner": data["owner"],
            "city": data["city"],
            "address": data["address"],
            "rate_plan": data["ratePlan"],
            "email": data["email"],
            "phone": data["phone"],
            "state": "INACTIVE",
            "site_technician": data["siteTechnician"],
            "max_power_kw": data.get("maxPowerKw", 0.0),
            "longitude": location.get("longitude", 0.0),
            "latitude": location.get("latitude", 0.0),
            "ports": data.get("ports", 0),
            "has_free_ports": False,
            "created_at": timestamp,
            "updated_at": timestamp,
            "ports_number_event_id": None,
            "ports_state_event_id": None,
        }
        logger.info(f"Station instance extracted successfully: {station_instance}")
        return station_instance
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}", "code": "UNHANDLED_ERROR"})

def extract_station_state_from_event(event: dict) -> dict:
    logger.info(f"Extracting station state from event")
    try:
        data = event["data"]
        station_id = data["stationId"]
        old_state = data["oldState"]
        new_state = data["newState"]
        for i in [old_state, new_state]:
            if not i in ["ACTIVE", "INACTIVE", "OUT_OF_SERVICE"]:
                logger.error(f"Invalid state: {i}")
                raise LambdaResponseError({"error": f"invalid state: {i}", "code": "INVALID_REQUEST"})
        if old_state == new_state:
            logger.error(f"Old state and new state are the same: {old_state}")
            raise LambdaResponseError({"error": f"old state and new state are the same: {old_state}", "code": "INVALID_REQUEST"})
        return {
            "station_id": station_id,
            "old_state": old_state,
            "new_state": new_state,
        }
    except LambdaResponseError:
        raise
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})

def update_station_to_rds(station: dict) -> None:
    station_id = station.get("station_id")
    if not station_id:
        raise LambdaResponseError({"error": "missing station_id", "code": "INVALID_REQUEST"})
    updates = {k: v for k, v in station.items() if k != "station_id"}
    if not updates:
        return
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            set_parts = [
                sql.SQL("{} = %s").format(sql.Identifier(col))
                for col in updates.keys()
            ]
            query = sql.SQL("UPDATE stations SET {} WHERE id = %s").format(
                sql.SQL(", ").join(set_parts)
            )
            params = list(updates.values()) + [station_id]
            cur.execute(query, params)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise LambdaResponseError({"error": f"Error updating station: {e}", "code": "DATABASE_ERROR"})

def insert_station_to_rds(station: StationInstance) -> None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        rate_plan = station.get("rate_plan")
        rate_plan_json = json.dumps(rate_plan) if rate_plan else None
        with conn.cursor() as cur:
            cur.execute(
                """
                    INSERT INTO stations (
                        id, code, name, owner, city, address, email, 
                        site_technician, max_power_kw, location, ports, 
                        rate_plan, state, has_free_ports, created_at, updated_at, ports_number_event_id, ports_state_event_id
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """,
                (
                    station["id"],
                    station["code"],
                    station["name"],
                    station["owner"],
                    station["city"],
                    station["address"],
                    station["email"],
                    station["site_technician"],
                    station["max_power_kw"],
                    station["longitude"],
                    station["latitude"],
                    station["ports"],
                    rate_plan_json,
                    station["state"],
                    station["has_free_ports"],
                    station["created_at"],
                    station["updated_at"],
                    station["ports_number_event_id"],
                    station["ports_state_event_id"],
                ),
            )
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if e.pgcode == "23505":
            logger.error(f"Station already exists: {e}")
            raise LambdaResponseError({"error": "Station already exists", "code": "ALREADY_EXISTS"})
        logger.error(f"Constraint violation inserting station: {e}")
        raise LambdaResponseError({"error": str(e), "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error inserting station: {e}")
        raise LambdaResponseError({"error": str(e), "code": "DATABASE_ERROR"})
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error inserting station: {e}")
        raise LambdaResponseError({"error": str(e), "code": "UNHANDLED_ERROR"})

def change_station_state(station_id: str, old_state: str, new_state: str) -> datetime:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor() as cur:
            updated_at = datetime.now()
            cur.execute(
                """
                    UPDATE stations SET state = %s, updated_at = %s WHERE id = %s AND state = %s
                """,
                (
                    new_state,
                    updated_at,
                    station_id,
                    old_state,
                ),
            )
            if cur.rowcount == 0:
                cur.execute("SELECT state FROM stations WHERE id = %s", (station_id,))
                row = cur.fetchone()
                if row is None:
                    logger.error(f"station not found: {station_id}")
                    raise LambdaResponseError({"error": f"station not found: {station_id}", "code": "NOT_FOUND"})
                logger.error(f"state mismatch for station {station_id}: expected {old_state}, actual {row[0]}")
                raise LambdaResponseError({"error": f"state mismatch for station {station_id}: expected {old_state}, actual {row[0]}", "code": "INVALID_STATE"})
        conn.commit()
        return updated_at
    except psycopg2.IntegrityError as e:
        conn.rollback()
        logger.error(f"Constraint violation updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "UNHANDLED_ERROR"})

def delete_station(station_id: str) -> datetime:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        updated_at = datetime.now()
        state = "DELETED"
        with conn.cursor() as cur:
            cur.execute("""
            UPDATE stations SET state = %s, updated_at = %s WHERE id = %s 
            AND state IN ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE')
            """, 
                (state, updated_at, station_id),
            )
            if cur.rowcount == 0:
                cur.execute("SELECT state FROM stations WHERE id = %s", (station_id,))
                row = cur.fetchone()
                if row is None:
                    logger.error(f"station not found: {station_id}")
                    raise LambdaResponseError({"error": f"station not found: {station_id}", "code": "NOT_FOUND"})
                logger.error(f"state mismatch for station {station_id}: expected 'ACTIVE', 'INACTIVE' or 'OUT_OF_SERVICE', actual {row[0]}")
                raise LambdaResponseError(
                    {"error": f"state mismatch for station {station_id}: expected 'ACTIVE', 'INACTIVE' or 'OUT_OF_SERVICE', actual {row[0]}", 
                    "code": "INVALID_REQUEST"})
        conn.commit()
        return updated_at
    except psycopg2.IntegrityError as e:
        conn.rollback()
        logger.error(f"Constraint violation deleting station: {e}")
        raise LambdaResponseError({"error": str(e), "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error deleting station: {e}")
        raise LambdaResponseError({"error": str(e), "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error deleting station: {e}")
        raise LambdaResponseError({"error": str(e), "code": "UNHANDLED_ERROR"})

def update_station_ports(station_id: str, delta: int, event_id: str) -> datetime | None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor() as cur:
            updated_at = datetime.now()
            cur.execute(
                """
                    UPDATE stations SET ports = ports + %s, updated_at = %s, ports_number_event_id = %s WHERE id = %s 
                    AND (ports_number_event_id IS DISTINCT FROM %s) AND (ports + %s) >= 0
                    RETURNING ports
                """,
                (
                    delta,
                    updated_at,
                    event_id,
                    station_id,
                    event_id,
                    delta,
                ),
            )
            row = cur.fetchone()
            if row is None:
                cur.execute("SELECT ports FROM stations WHERE id = %s", (station_id,))
                row = cur.fetchone()
                if row is None:
                    logger.error(f"station not found: {station_id}")
                    raise LambdaResponseError({"error": f"station not found: {station_id}", "code": "NOT_FOUND"})
                logger.info(f"duplicate event, no-op for station {station_id}")
                conn.commit()
                return None
        conn.commit()
        return updated_at
    except psycopg2.IntegrityError as e:
        conn.rollback()
        logger.error(f"Constraint violation updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "UNHANDLED_ERROR"})

def update_station_ports_state(station_id: str, event_id: str) -> datetime | None:
    try:
        client = boto3.client("lambda", region_name=AWS_REGION)
        payload = {
            "service": {"action": "get_has_free_ports_by_station", "callerId": "script"},
            "data": {"stationId": station_id},
        }
        resp = client.invoke(
            FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_PORTS_SESSIONS_FUNCTION_NAME}",
            InvocationType="RequestResponse",
            Payload=json.dumps(payload).encode("utf-8"),
        )
        raw = resp["Payload"].read().decode("utf-8") or "{}"
        response_json = json.loads(raw)
        if response_json.get("error"):
            raise LambdaResponseError({"error": f"Business error: code={response_json.get('code')} error={response_json.get('error')}", "code": "DATABASE_ERROR"})
        has_free_ports = response_json.get("data").get("has_free_ports")
    except LambdaResponseError:
        raise
    except Exception as e:
        logger.error(f"Error getting ports by station: {e}")
        raise LambdaResponseError({"error": f"Error getting ports by station: {e}", "code": "UNHANDLED_ERROR"})
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        with conn.cursor() as cur:
            updated_at = datetime.now()
            cur.execute(
                """
                    UPDATE stations SET has_free_ports = %s, updated_at = %s, ports_state_event_id = %s WHERE id = %s 
                    AND (ports_state_event_id IS DISTINCT FROM %s) AND (has_free_ports IS DISTINCT FROM %s)
                """,
                (
                    has_free_ports,
                    updated_at,
                    event_id,
                    station_id,
                    event_id,
                    has_free_ports,
                ),
            )
        conn.commit()
        return updated_at
    except psycopg2.IntegrityError as e:
        conn.rollback()
        logger.error(f"Constraint violation updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error updating station state: {e}")
        raise LambdaResponseError({"error": str(e), "code": "UNHANDLED_ERROR"})

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    try:
        caller_id = event["service"]["callerId"]
    except KeyError as e:
        log_audit("ERROR", message="missing callerId", status="ERROR", errorMessage=f"missing callerId: {e}")
        return ErrorResponsePayload(error=f"missing callerId: {e}", code="UNAUTHORIZED")
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
            case "writeStation":
                station_instance: StationInstance = extract_full_station_instance_from_event(event)
                insert_station_to_rds(station_instance)
                log_audit("INFO", message="station written to RDS successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"station_id": station_instance["id"]}, meta={})
            case "changeStationState":
                station_state = extract_station_state_from_event(event)
                old_state = station_state["old_state"]
                new_state = station_state["new_state"]
                station_id = station_state["station_id"]
                updated_at = change_station_state(station_id, old_state, new_state)
                log_audit("INFO", message=f"{station_id} state changed from {old_state} to {new_state}", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"updated_at": updated_at.isoformat()}, meta={})
            case "updateStation":
                station = extract_partial_station_instance_from_event(event)
                update_station_to_rds(station)
                log_audit("INFO", message="station updated to RDS successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"station_id": station["station_id"]}, meta={})
            case "deleteStation":
                station_id = event["data"]["stationId"]
                updated_at = delete_station(station_id)
                log_audit("INFO", message=f"{station_id} deleted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"deleted_at": updated_at.isoformat()}, meta={})
            case "update_station_ports":
                operations = event["data"]
                for operation in operations:
                    station_id = operation["station_id"]
                    ports_delta = operation["delta"]
                    event_id = operation["event_id"]
                    update_station_ports(station_id, ports_delta, event_id)
                    logger.info(f"ports count updated with delta {ports_delta} for station {station_id} with event {event_id}")
                log_audit("INFO", message=f"ports count updated for {len(operations)} stations", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"operations": operations}, meta={})
            case "update_station_ports_state":
                operations = event["data"]
                for operation in operations:
                    station_id = operation["station_id"]
                    event_id = operation["event_id"]
                    update_station_ports_state(station_id, event_id)
                    logger.info(f"ports state updated for station {station_id} with operation {operation} and event {event_id}")
                log_audit("INFO", message=f"ports state updated for {len(operations)} stations", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"operations": operations}, meta={})
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