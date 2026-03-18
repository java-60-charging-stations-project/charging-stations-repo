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

def extract_station_instance_from_event(event: dict) -> StationInstance:
    logger.info(f"Extracting station instance from event")
    try:
        data = event["data"]
        location = data["location"]
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
        raise LambdaResponseError({"error": f"missing key: {e}", "code": "MISSING_KEY"})
    except Exception as e:
        logger.error(f"Unhandled error: {e}")
        raise LambdaResponseError({"error": f"unhandled error: {e}", "code": "UNHANDLED_ERROR"})

def insert_station_to_rds(station: StationInstance) -> None:
    try:
        conn = get_connection()
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        raise LambdaResponseError({"error": f"Error getting connection: {e}", "code": "DATABASE_ERROR"})
    try:
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
                    json.dumps(station["ratePlan"]),
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


def handler(event: dict, context: Any) -> SuccessResponsePayload | ErrorResponsePayload:
    logger.info(f"Handler called with event: {event}")
    service_data = event.get("service")
    audit_base = {
    "caller_id": service_data.get("caller_id") if service_data else None,
    "service": context.function_name,
    "event": service_data.get("action") if service_data else None,
    "requestId": context.aws_request_id,
        }
    try:
        station_instance = extract_station_instance_from_event(event)
        insert_station_to_rds(station_instance)
        log_audit("INFO", message="station written to RDS successfully", status="SUCCESS", **audit_base)
        return SuccessResponsePayload(data={"stationId": station_instance["id"]})
    except LambdaResponseError as e:
        log_audit("ERROR", message="error writing station to RDS", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    except Exception as e:
        log_audit("ERROR", message="error writing station to RDS", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error="UNHANDLED_ERROR", code="UNHANDLED_ERROR")