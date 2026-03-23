import os
import boto3
import psycopg2
from typing import Any
from utils.logger import logger, log_audit

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
            connect_timeout=30,
            sslmode="require",
        )
    return _conn

def create_tables() -> None:
    logger.info("Connecting to DB...")
    conn = get_connection()
    logger.info("Connected. Creating tables...")
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE EXTENSION IF NOT EXISTS "postgis";
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS stations (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    city TEXT NOT NULL,
                    address TEXT,
                    email TEXT,
                    site_technician TEXT,
                    max_power_kw FLOAT,
                    location GEOGRAPHY(Point, 4326),
                    ports INT NOT NULL,
                    rate_plan JSONB,
                    state TEXT NOT NULL,
                    has_free_ports BOOLEAN NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    event_id TEXT
                );
            """)
            cur.execute("""CREATE INDEX IF NOT EXISTS idx_stations_location ON stations USING GIST (location);""")
        conn.commit()
    finally:
        conn.close()

def handler(event: dict, context: Any) -> dict:
    logger.info(f"Handler called with event: {event}")
    try:
        log_audit(
            "INFO",
            message="tables created or already exist",
            user_id=event.get("user_id"),
            service=context.function_name,
            event="CREATE_RDS_TABLES",
            status="SUCCESS",
            request_id=context.aws_request_id,
            trigger=event.get("trigger"),
        )
        create_tables()
        return {"message": "Tables created or already exist"}
    except Exception as e:
        log_audit(
            "ERROR",
            message="error creating tables",
            user_id=event.get("user_id"),
            service=context.function_name,
            event="CREATE_RDS_TABLES",
            status="ERROR",
            errorMessage=str(e),
            request_id=context.aws_request_id,
            trigger=event.get("trigger"),
        )
        raise Exception(f"Error creating tables: {e}")
