import os
import json
import boto3
from typing import Any
from datetime import datetime, timezone
from utils.logger import logger, log_audit
from utils.error_handlers import LambdaResponseError
from data_types.contract_types import SuccessResponsePayload, ErrorResponsePayload

_conn = None

AWS_REGION = os.environ["AWS_REGION"]
AWS_LAMBDA_HOST_ACCOUNT = os.environ["AWS_LAMBDA_HOST_ACCOUNT"]
GET_USER_FUNCTION_NAME = os.environ["GET_USER_FUNCTION_NAME"]

def get_user_contact(user_id: str) -> dict | None:
    client = boto3.client("lambda", region_name=AWS_REGION)
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_USER_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps({"service": {"action": "getUserById", "callerId": "notification_lambda"}, 
        "data": {"userId": user_id}}).encode("utf-8"))
    if resp.get("StatusCode") != 200:
        logger.error(f"error getting user contact: {resp}")
        raise LambdaResponseError({"error": f"error getting user contact: {resp}", "code": "LAMBDA_ERROR"})
    if resp.get("FunctionError"):
        raise LambdaResponseError({"error": f"error getting user contact: {resp.get('FunctionError')}", "code": "LAMBDA_ERROR"})
    raw = resp["Payload"].read().decode("utf-8") or "{}"
    response_json = json.loads(raw)
    if response_json.get("error"):
        raise LambdaResponseError({"error": f"error getting user contact: {response_json.get('error')}", "code": "INVALID_REQUEST"})
    return response_json["data"]

def publish_payment_failure_notification(payload_data: dict) -> dict:
    user_id = payload_data["user_id"]
    station_id = payload_data["station_id"]
    entity_key = payload_data["entity_key"]
    session_id = payload_data.get("session_id") or entity_key.split("#")[-1]
    reason = payload_data.get("reason", "payment_failed")
    occurred_at = payload_data.get("occurred_at") or datetime.now(timezone.utc).isoformat()
    user = get_user_contact(user_id)
    if not user:
        logger.error(f"user not found: {user_id}")
        raise LambdaResponseError({"error": f"user not found: {user_id}", "code": "NOT_FOUND"})
    try:
        email = user["email"]
        full_name = user["full_name"]
        ses = boto3.client("ses", region_name=AWS_REGION)
        response = ses.send_email(
            Source=os.environ["SES_FROM_EMAIL"],
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": "Payment failed for charging session"},
                "Body": {
                    "Text": {
                        "Data": (
                            f"Hello, {full_name}!\n\n"
                            f"Your payment failed.\n"
                            f"Session: {session_id}\n"
                            f"Station: {station_id}\n"
                            f"Reason: {reason}\n\n"
                            f"Occurred at: {occurred_at}\n\n"
                            f"Please retry in the app.\n\n"
                            f"Best regards,\n"
                            f"The Charging Stations Team"
                        )
                    }
                },
            },
        )
        return {"message_id": response.get("MessageId"), "notified_email": email, "session_id": session_id}
    except Exception as e:
        logger.error(f"error publishing notification: {e}")
        raise LambdaResponseError({"error": f"error sending email: {e}", "code": "EMAIL_ERROR"})

def publish_charging_stopped_notification(payload_data: dict) -> dict:
    user_id = payload_data["user_id"]
    station_id = payload_data["station_id"]
    entity_key = payload_data["entity_key"]
    session_id = payload_data.get("session_id") or entity_key.split("#")[-1]
    reason = payload_data.get("reason", "Charging stopped by the system at 100% charge level")
    occurred_at = payload_data.get("occurred_at") or datetime.now(timezone.utc).isoformat()
    user = get_user_contact(user_id)
    if not user:
        logger.error(f"user not found: {user_id}")
        raise LambdaResponseError({"error": f"user not found: {user_id}", "code": "NOT_FOUND"})
    try:
        email = user["email"]
        full_name = user["full_name"]
        ses = boto3.client("ses", region_name=AWS_REGION)
        response = ses.send_email(
            Source=os.environ["SES_FROM_EMAIL"],
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": "Charging stopped for charging session"},
                "Body": {
                    "Text": {
                        "Data": (
                            f"Hello, {full_name}!\n\n"
                            f"Your charging session has been stopped.\n"
                            f"Session: {session_id}\n"
                            f"Station: {station_id}\n"
                            f"Reason: {reason}\n\n"
                            f"Occurred at: {occurred_at}\n\n"
                            f"Please check the app for more details.\n\n"
                            f"Best regards,\n"
                            f"The Charging Stations Team"
                        )
                    }
                },
            },
        )
        return {"message_id": response.get("MessageId"), "notified_email": email, "session_id": session_id}
    except Exception as e:
        logger.error(f"error publishing notification: {e}")
        raise LambdaResponseError({"error": f"error sending email: {e}", "code": "EMAIL_ERROR"})

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
            case "notify_payment_failure":
                data = event["data"]
                result = publish_payment_failure_notification(data)
                log_audit("INFO", message="payment failure notification sent", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=result, meta={})
            case "notify_charging_stopped":
                data = event["data"]
                result = publish_charging_stopped_notification(data)
                log_audit("INFO", message="charging stopped notification sent", status="SUCCESS", **audit_base)
                return SuccessResponsePayload(data=result, meta={})
            case _:
                log_audit("ERROR", message=f"invalid action {action}", status="ERROR", errorMessage=f"invalid action {action}", 
                **audit_base)
                return ErrorResponsePayload(error=f"invalid action {action}", code="INVALID_REQUEST")
    except KeyError as e:
        log_audit("ERROR", message="missing data", status="ERROR", errorMessage=f"missing data: {e}", **audit_base)
        return ErrorResponsePayload(error=f"missing data: {e}", code="INVALID_REQUEST")
    except LambdaResponseError as e:
        log_audit("ERROR", message=f"error performing {action}", status="ERROR", errorMessage=e.response.get("error"), **audit_base)
        return ErrorResponsePayload(error=e.response["error"], code=e.response["code"])
    except Exception as e:
        log_audit("ERROR", message=f"unhandled error performing {action}", status="ERROR", errorMessage=str(e), **audit_base)
        return ErrorResponsePayload(error=f"unhandled error performing {action}: {e}", code="UNHANDLED_ERROR")                    