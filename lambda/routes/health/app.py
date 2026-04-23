import os
import boto3
import json
from typing import Any
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import ErrorResponsePayload, SuccessResponsePayload

AWS_REGION = os.environ["AWS_REGION"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
DYNAMO_WRITE_LAMBDA = os.environ["HEALTH_DYNAMO_TABLE"]

client = boto3.client("lambda", region_name=AWS_REGION)

def invoke_health_write_dynamo(caller_id: str, message_id: str) -> dict:
    payload = {
        "service": {"action": "write_health_record", "callerId": "health_lambda", },
        "data": {"user_id": caller_id, "message_id": message_id},
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{DYNAMO_WRITE_LAMBDA}",
        InvocationType="Event",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    if resp.get("StatusCode") != 202:
        raise LambdaResponseError({"error": f"error writing health record: {resp.get('error')}", "code": "DATABASE_ERROR"})
    if resp.get("FunctionError"):
        raise LambdaResponseError({"error": f"error writing health record: {resp['FunctionError']}", "code": "DATABASE_ERROR"})
    return {"result": "Successfully invoked health write dynamo lambda"}

def handler(event: dict, context: Any) -> dict|ErrorResponsePayload|SuccessResponsePayload:
    logger.info(f"Handler called with event: {event}")
    event_data = event.get("data")
    if not event_data:
        log_audit(
        "INFO",
        message="health function called",
        userId=event.get("user_id"),
        service=context.function_name,
        event="HEALTH",
        status="SUCCESS",
        requestId=context.aws_request_id,
        )
        return {"code": 200, "status": "running"}
    audit_base = {
        "service": context.function_name,
        "request_id": context.aws_request_id,
    }
    try:
        action = event["service"]["action"]
    except KeyError as e:
        log_audit("ERROR", message="missing action", status="ERROR", errorMessage=f"missing action: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing action: {e}", code="INVALID_REQUEST")
    try:
        caller_id = event["service"]["callerId"]
    except KeyError as e:
        log_audit("ERROR", message="missing callerId", status="ERROR", errorMessage=f"missing callerId: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing callerId: {e}", code="UNAUTHORIZED")
    audit_base["caller_id"] = caller_id
    audit_base["event"] = action
    try:
        match action:
            case "getHealth":
                message_id = event["service"]["messageId"]
                result = invoke_health_write_dynamo(caller_id, message_id)
                log_audit("INFO", message="health record written successfully", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=result, meta={})
            case _:
                log_audit("ERROR", message="invalid action", status="ERROR", errorMessage=f"invalid action: {action}", **audit_base)
                return ErrorResponsePayload(error=f"invalid action: {action}", code="INVALID_REQUEST")
    except KeyError as e:
        log_audit("ERROR", message="missing data", status="ERROR", errorMessage=f"missing data: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing data: {e}", code="INVALID_REQUEST")
    except LambdaResponseError as e:
        log_audit("ERROR", message="error writing health record", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    except Exception as e:
        log_audit("ERROR", message="error writing health record", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error=f"error writing health record: {e}", code="UNHANDLED_ERROR")