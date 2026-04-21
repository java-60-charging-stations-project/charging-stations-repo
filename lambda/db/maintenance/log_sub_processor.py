from __future__ import annotations
import base64
import gzip
import json
import boto3
import logging
from datetime import datetime, timezone
import os
import re
from typing import Any, Optional, Tuple

AWS_REGION = os.environ.get("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.environ.get("AWS_LAMBDA_HOST_ACCOUNT")
WRITE_LOGS_RDS_FUNCTION_NAME = os.environ.get("WRITE_LOGS_RDS_FUNCTION_NAME")

logger = logging.getLogger()
logger.setLevel(logging.INFO)
_PREFIX_RE = re.compile(
    r'(?P<prefix_ts>\d{4}-\d{2}-\d{2}T[0-9:.]+Z)\t'
)

def _parse_prefixed_json_message(message_raw: str) -> Tuple[Optional[datetime], Optional[dict[str, Any]]]:
    if not message_raw:
        return None, None
    prefix_ts_dt: Optional[datetime] = None
    m = _PREFIX_RE.match(message_raw)
    json_part = message_raw
    if m:
        ts_raw = m.group("prefix_ts")
        try:
            prefix_ts_dt = datetime.strptime(ts_raw, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
        except ValueError:
            # tolerate odd timestamp precision
            prefix_ts_dt = None
        # JSON starts after the prefix
        json_start = message_raw.find("{", m.end())
        if json_start != -1:
            json_part = message_raw[json_start:]
    # fallback: if no prefix, still try to parse pure JSON or JSON tail
    if json_part is message_raw:
        idx = message_raw.find("{")
        if idx != -1:
            json_part = message_raw[idx:]
    try:
        payload = json.loads(json_part)
        if isinstance(payload, dict):
            return prefix_ts_dt, payload
    except json.JSONDecodeError:
        logger.error(f"Message not parsed: {json_part}")
        pass
    return prefix_ts_dt, None

def cloudwatch_subscription_to_records(payload: dict[str, Any]) -> list[dict[str, Any]]:
    log_group = payload.get("logGroup")
    log_stream = payload.get("logStream")
    out: list[dict[str, Any]] = []
    for ev in payload.get("logEvents") or []:
        message_raw = ev.get("message")
        if not message_raw:
            logger.error(f"Message not extracted: {ev}")
            continue
        prefix_ts_dt, message_dict = _parse_prefixed_json_message(message_raw)
        if not message_dict:
            logger.error(f"Message not parsed: {message_raw}")
            continue
        ts_ms = ev.get("timestamp") or int(datetime.now(timezone.utc).timestamp() * 1000)
        json_ts = message_dict.get("timestamp")
        if isinstance(json_ts, str):
            try:
                json_ts = datetime.fromisoformat(json_ts.replace("Z", "+00:00"))
            except ValueError:
                json_ts = None
        fallback_ts = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
        ts = prefix_ts_dt or json_ts or fallback_ts
        try:
            out.append(
                {
                    "logGroup": log_group,
                    "logStream": log_stream,
                    "eventId": ev.get("id"),
                    "timestamp": ts.isoformat(),
                    "message": message_dict["message"],
                    "level": message_dict["level"],
                    "service": message_dict["service"],
                    "event": message_dict["event"],
                    "source_service": message_dict.get("source_service"),
                    "caller_id": message_dict["caller_id"],
                    "request_id": message_dict["request_id"],
                }
            )
        except Exception as e:
            logger.error(f"Message skipped: {message_dict} - {e}")
            continue
    return out

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    logger.info(f"Handler called with event: {event}")
    try:
        raw = base64.b64decode(event["awslogs"]["data"])
        payload: dict[str, Any] = json.loads(gzip.decompress(raw))
    except (KeyError, ValueError, json.JSONDecodeError, OSError) as e:
        logger.warning(f"invalid subscription payload: {e}")
        return {"ok": False}
    records = cloudwatch_subscription_to_records(payload)
    logger.info(f"Records: {len(records)}")
    if not records:
        logger.info("No records to write")
        return {"ok": True}
    req = {
        "service": {
            "action": "write_logs",
            "callerId": "log_sub_processor",
        },
        "data": records,
    }
    client = boto3.client("lambda", region_name=AWS_REGION)
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_LOGS_RDS_FUNCTION_NAME}",
        InvocationType="Event",
        Payload=json.dumps(req).encode("utf-8"),
    )
    if resp.get("StatusCode") != 202:
        logger.error(f"Error invoking write_logs: {resp}")
        return {"ok": False, "error": f"Error invoking write_logs: {resp}"}
    if resp.get("FunctionError"):
        logger.error(f"Error invoking write_logs: {resp.get('FunctionError')}")
        return {"ok": False, "error": f"Error invoking write_logs: {resp.get('FunctionError')}"}
    logger.info(f"Successfully invoked write_logs: {resp}")
    return {"ok": True, "records": len(records)}