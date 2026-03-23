import os
import boto3
import psycopg2
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
                        rate_plan, state, has_free_ports, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                        %s, %s, %s, %s, %s, %s
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

def update_station_ports_count_in_rds(station_id: str, ports_delta: int) -> tuple[int, datetime]:
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
                    UPDATE stations SET ports = ports + %s, updated_at = %s WHERE id = %s RETURNING ports
                """,
                (
                    ports_delta,
                    updated_at,
                    station_id,
                ),
            )
            row = cur.fetchone()
            if row is None:
                logger.error(f"station not found: {station_id}")
                raise LambdaResponseError({"error": f"station not found: {station_id}", "code": "NOT_FOUND"})
            ports = row[0]
        conn.commit()
        return ports, updated_at
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
    sqs_request_id = None
    sqs_caller_id = None
    sqs_action = None
    sqs_ports_delta = None
    sqs_station_id = None
    if event.get("Records"):
        try:
            sqs_request_id = event["Records"][0]["body"]["correlation_id"]
            sqs_caller_id = event["Records"][0]["body"]["caller_id"]
            sqs_action = event["Records"][0]["body"]["action"]
            sqs_ports_delta = event["Records"][0]["body"]["ports_delta"]
            sqs_station_id = event["Records"][0]["body"]["station_id"]
        except KeyError as e:
            log_audit("ERROR", message="missing SQS records keys", status="ERROR", errorMessage=f"missing SQS records keys: {e}")
            return ErrorResponsePayload(error=f"missing SQS records keys: {e}", code="INVALID_REQUEST")
    try:
        caller_id = event["service"]["callerId"] if event.get("service") else sqs_caller_id
    except KeyError as e:
        log_audit("ERROR", message="missing callerId", status="ERROR", errorMessage=f"missing callerId: {e}")
        return ErrorResponsePayload(error=f"missing callerId: {e}", code="UNAUTHORIZED")
    try:
        action = event["service"]["action"] if event.get("service") else sqs_action
    except KeyError as e:
        log_audit("ERROR", message="missing action", status="ERROR", errorMessage=f"missing action: {e}")
        return ErrorResponsePayload(error=f"missing action: {e}", code="INVALID_REQUEST")
    audit_base = {
        "caller_id": caller_id,
        "service": context.function_name,
        "event": action,
        "request_id": sqs_request_id if sqs_request_id else context.aws_request_id,
    }
    try:
        match action:
            case "writeStation":
                station_instance: StationInstance = extract_full_station_instance_from_event(event)
                insert_station_to_rds(station_instance)
                log_audit("INFO", message="station written to RDS successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"station_id": station_instance["id"]})
            case "changeStationState":
                station_state = extract_station_state_from_event(event)
                old_state = station_state["old_state"]
                new_state = station_state["new_state"]
                station_id = station_state["station_id"]
                updated_at = change_station_state(station_id, old_state, new_state)
                log_audit("INFO", message=f"{station_id} state changed from {old_state} to {new_state}", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"updated_at": updated_at.isoformat()})
            case "deleteStation":
                station_id = event["data"]["stationId"]
                updated_at = delete_station(station_id)
                log_audit("INFO", message=f"{station_id} deleted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"deleted_at": updated_at.isoformat()})
            case "update_station_ports_count":
                station_id = sqs_station_id
                ports_delta = sqs_ports_delta
                update_station_ports_count_in_rds(station_id, ports_delta)
                log_audit("INFO", message=f"{station_id} ports count updated to {ports_delta}", status="SUCCESS", **audit_base)
                return event
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