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

def extract_delete_station_data_from_event(event: dict) -> str:
    logger.info(f"Extracting station id from event")
    try:
        data = event["data"]
        station_id = data["stationId"]
        return {
            "station_id": station_id,
        }
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})

def extract_full_station_instance_from_event(event: dict) -> StationInstance:
    logger.info(f"Extracting station instance from event")
    try:
        data = event["data"]
        location = data["location"] if data.get("location") else {"longitude": 0.0, "latitude": 0.0}
        station_instance: StationInstance = {
            "id": str(uuid.uuid4()),
            "code": data["code"],
            "name": data["name"],
            "owner": data["owner"],
            "city": data["city"],
            "address": data["address"],
            "ratePlan": data["ratePlan"],
            "email": data["email"],
            "phone": data["phone"],
            "status": data.get("status", "ACTIVE"),
            "siteTechnician": data["siteTechnician"],
            "maxPowerKw": data.get("maxPowerKw", 0.0),
            "longitude": location.get("longitude", 0.0),
            "latitude": location.get("latitude", 0.0),
            "ports": data.get("ports", 0),
            "created_at": datetime.now(),
            "updated_at": None,
        }
        logger.info(f"Station instance extracted successfully: {station_instance}")
        return station_instance
    except KeyError as e:
        logger.error(f"Missing key: {e}")
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "INVALID_REQUEST"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}", "code": "UNHANDLED_ERROR"})

def extract_station_status_from_event(event: dict) -> dict:
    logger.info(f"Extracting station status from event")
    try:
        data = event["data"]
        station_id = data["stationId"]
        old_status = data["oldState"]
        new_status = data["newState"]
        for i in [old_status, new_status]:
            if not i in ["ACTIVE", "INACTIVE", "OUT_OF_SERVICE"]:
                logger.error(f"Invalid status: {i}")
                raise LambdaResponseError({"error": f"invalid status: {i}", "code": "INVALID_REQUEST"})
        if old_status == new_status:
            logger.error(f"Old status and new status are the same: {old_status}")
            raise LambdaResponseError({"error": f"old status and new status are the same: {old_status}", "code": "INVALID_REQUEST"})
        return {
            "station_id": station_id,
            "old_status": old_status,
            "new_status": new_status,
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
        rate_plan = station.get("ratePlan", None)
        rate_plan_json = json.dumps(rate_plan) if rate_plan else None
        with conn.cursor() as cur:
            cur.execute(
                """
                    INSERT INTO stations (
                        id, code, name, owner, city, address, email, 
                        siteTechnician, maxPowerKw, location, ports, 
                        ratePlan, status, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                        %s, %s, %s, %s, %s
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
                    station["siteTechnician"],
                    station["maxPowerKw"],
                    station["longitude"],
                    station["latitude"],
                    station["ports"],
                    rate_plan_json,
                    station["status"],
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

def change_station_status(station_id: str, old_status: str, new_status: str) -> datetime:
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
                    UPDATE stations SET status = %s, updated_at = %s WHERE id = %s AND status = %s
                """,
                (
                    new_status,
                    updated_at,
                    station_id,
                    old_status,
                ),
            )
            if cur.rowcount == 0:
                cur.execute("SELECT status FROM stations WHERE id = %s", (station_id,))
                row = cur.fetchone()
                if row is None:
                    logger.error(f"station not found: {station_id}")
                    raise LambdaResponseError({"error": f"station not found: {station_id}", "code": "NOT_FOUND"})
                logger.error(f"status mismatch for station {station_id}: expected {old_status}, actual {row[0]}")
                raise LambdaResponseError({"error": f"status mismatch for station {station_id}: expected {old_status}, actual {row[0]}", "code": "INVALID_STATE"})
        conn.commit()
        return updated_at
    except psycopg2.IntegrityError as e:
        conn.rollback()
        logger.error(f"Constraint violation updating station status: {e}")
        raise LambdaResponseError({"error": str(e), "code": "CONSTRAINT_VIOLATION"})
    except psycopg2.DatabaseError as e:
        conn.rollback()
        logger.error(f"Database error updating station status: {e}")
        raise LambdaResponseError({"error": str(e), "code": "DATABASE_ERROR"})
    except LambdaResponseError:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Unhandled error updating station status: {e}")
        raise LambdaResponseError({"error": str(e), "code": "UNHANDLED_ERROR"})

def delete_station(station_id: str) -> datetime:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
        updated_at = datetime.now()
        status = "OUT_OF_SERVICE"
        with conn.cursor() as cur:
            cur.execute("UPDATE stations SET status = %s, updated_at = %s WHERE id = %s AND (status = 'ACTIVE' OR status = 'INACTIVE')", 
                (status, updated_at, station_id),
            )
            if cur.rowcount == 0:
                cur.execute("SELECT status FROM stations WHERE id = %s", (station_id,))
                row = cur.fetchone()
                if row is None:
                    logger.error(f"station not found: {station_id}")
                    raise LambdaResponseError({"error": f"station not found: {station_id}", "code": "NOT_FOUND"})
                logger.error(f"status mismatch for station {station_id}: expected 'ACTIVE' or 'INACTIVE', actual {row[0]}")
                raise LambdaResponseError(
                    {"error": f"status mismatch for station {station_id}: expected 'ACTIVE' or 'INACTIVE', actual {row[0]}", 
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

def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    try:
        caller_id = event["service"]["caller_id"]
    except KeyError as e:
        log_audit("ERROR", message="missing caller_id", status="ERROR", errorMessage=f"missing caller_id: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing caller_id: {e}", code="UNAUTHORIZED")
    try:
        action = event["service"]["action"]
    except KeyError as e:
        log_audit("ERROR", message="missing action", status="ERROR", errorMessage=f"missing action: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing action: {e}", code="INVALID_REQUEST")
    audit_base = {
        "caller_id": caller_id,
        "service": context.function_name,
        "event": action,
        "requestId": context.aws_request_id,
    }
    try:
        match action:
            case "write_station":
                station_instance: StationInstance = extract_full_station_instance_from_event(event)
                insert_station_to_rds(station_instance)
                log_audit("INFO", message="station written to RDS successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"stationId": station_instance["id"]})
            case "change_station_status":
                station_status = extract_station_status_from_event(event)
                old_status = station_status["old_status"]
                new_status = station_status["new_status"]
                station_id = station_status["station_id"]
                updated_at = change_station_status(station_id, old_status, new_status)
                log_audit("INFO", message=f"{station_id} status changed from {old_status} to {new_status}", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"updatedAt": updated_at.isoformat()})
            case "delete_station":
                station_id = event["data"]["stationId"]
                updated_at = delete_station(station_id)
                log_audit("INFO", message=f"{station_id} deleted successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data={"deletedAt": updated_at.isoformat()})
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