import json
import os
from typing import Any
import boto3
from botocore.exceptions import ClientError
from utils.logger import logger, log_audit

# writeStation
# changeStationState
# deleteStation
# update_station_ports
# insertStationPorts
# supportUpdateStationPorts
# userUpdateStationPorts
# deleteStationPorts
# create_session
# resolveLog
# write_logs


AWS_REGION = os.environ.get("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.environ.get("AWS_LAMBDA_HOST_ACCOUNT", "")
LAMBDA_CLIENT = boto3.client("lambda", region_name=AWS_REGION)


def _resolve_function_name(raw_name: str) -> str:
    """Allow either plain function name or full ARN in env."""
    if not raw_name:
        return ""
    if raw_name.startswith("arn:aws:lambda:"):
        return raw_name
    if AWS_LAMBDA_HOST_ACCOUNT:
        return f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{raw_name}"
    return raw_name


def _invoke_target(function_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = LAMBDA_CLIENT.invoke(
        FunctionName=_resolve_function_name(function_name),
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )

    if response.get("StatusCode") != 200:
        raise RuntimeError(f"invoke failed, status={response.get('StatusCode')}")

    if response.get("FunctionError"):
        raise RuntimeError(f"function error: {response.get('FunctionError')}")

    raw = response["Payload"].read().decode("utf-8") if response.get("Payload") else "{}"
    parsed = json.loads(raw or "{}")

    # Preserve existing contract semantics from your direct invocations
    if isinstance(parsed, dict) and parsed.get("error"):
        raise RuntimeError(f"target lambda error: {parsed.get('error')}")

    return parsed


def _handle_single_message(record: dict[str, Any], context: Any) -> None:
    message_id = record.get("messageId", "")
    body = record.get("body", "")

    if not body:
        raise ValueError("empty message body")

    try:
        event = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON body: {exc}") from exc

    service = event.get("service") or {}
    action = service.get("action")
    caller_id = service.get("callerId")
    target_fn = event.get("targetFn")

    if not action:
        raise ValueError("missing service.action")
    if not caller_id:
        raise ValueError("missing service.callerId")
    if not target_fn:
        raise ValueError("missing targetFn")

    audit_base = {
        "caller_id": caller_id,
        "service": context.function_name,
        "event": action,
        "request_id": context.aws_request_id,
    }

    logger.info(f"routing sqs command: messageId={message_id}, action={action}")
    result = _invoke_target(target_fn, event)

    log_audit(
        "INFO",
        message="command routed successfully",
        status="SUCCESS",
        **audit_base,
    )
    logger.debug(f"command result: messageId={message_id}, result={result}")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    SQS batch handler with partial batch failure response.
    Requires event source mapping FunctionResponseTypes: [ReportBatchItemFailures].
    """
    records = event.get("Records", [])
    failures: list[dict[str, str]] = []

    for record in records:
        message_id = record.get("messageId", "")
        try:
            _handle_single_message(record, context)
        except (ValueError, ClientError, RuntimeError, Exception) as exc:
            logger.error(f"failed processing messageId={message_id}: {exc}")
            failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": failures}