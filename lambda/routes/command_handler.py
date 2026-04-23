import json
import os
from typing import Any
import boto3
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError

AWS_REGION = os.environ.get("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.environ.get("AWS_LAMBDA_HOST_ACCOUNT", "")
LAMBDA_CLIENT = boto3.client("lambda", region_name=AWS_REGION)

def invoke_target(function_name: str, payload: dict[str, Any]) -> dict:
    response = LAMBDA_CLIENT.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{function_name}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    if response.get("StatusCode") != 200:
        raise LambdaResponseError({"error": f"invoke failed, status={response.get('StatusCode')}", "code": "DATABASE_ERROR"})
    if response.get("FunctionError"):
        raise LambdaResponseError({"error": f"function error: {response.get('FunctionError')}", "code": "DATABASE_ERROR"})
    raw = response["Payload"].read().decode("utf-8") or "{}"
    response_json = json.loads(raw)
    if response_json.get("error"):
        raise LambdaResponseError({"error": f"function error: {response_json.get('error')}", "code": "DATABASE_ERROR"})
    return response_json["data"]

def handle_single_message(record: dict[str, Any], message_id: str) -> dict:
    try:
        body = record["body"]
    except KeyError as e:
        raise LambdaResponseError({"error": f"missing message data: {e}", "code": "INVALID_REQUEST"})
    try:
        event = json.loads(body)
        event["data"]["messageId"] = message_id
    except json.JSONDecodeError as e:
        raise LambdaResponseError({"error": f"invalid JSON body: {e}", "code": "INVALID_REQUEST"})
    try:
        service = event["service"]
        caller_id = service["callerId"]
        target_fn = service["targetFn"]
        action = service["action"]
    except KeyError as e:
        raise LambdaResponseError({"error": f"missing service data: {e}", "code": "INVALID_REQUEST"})
    audit_base = {
        "caller_id": caller_id,
        "service": target_fn,
        "event": action,
        "request_id": message_id,
    }
    logger.info(f"routing sqs command: messageId={message_id}, action={action}, targetFn={target_fn}")
    try:
        result = invoke_target(target_fn, event)
        log_audit("INFO", message=f"command routed successfully to {target_fn}", status="SUCCESS", **audit_base)
        logger.info(f"command result: messageId={message_id}, result={result}")
        return result
    except LambdaResponseError as e:
        log_audit("ERROR", message=f"error routing command to {target_fn}", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        raise e
    except Exception as e:
        log_audit("ERROR", message=f"error routing command to {target_fn}", status="ERROR", errorMessage=str(e), **audit_base)
        raise e

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    records = event.get("Records", [])
    failures: list[dict[str, str]] = []
    for record in records:
        message_id = record.get("messageId", "")
        try:
            result = handle_single_message(record, message_id)
            logger.info(f"command result: messageId={message_id}, result={result}")
        except LambdaResponseError as e:
            failures.append({"itemIdentifier": message_id})
            logger.error(f"failed processing messageId={message_id}: {e.response.get('error')}")
        except Exception as e:
            failures.append({"itemIdentifier": message_id})
            logger.error(f"failed processing message : {str(e)}")
    return {"batchItemFailures": failures}