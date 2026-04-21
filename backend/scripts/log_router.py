import boto3
import os
from typing import Any
import json

AWS_REGION = os.environ.get("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.environ.get("AWS_LAMBDA_HOST_ACCOUNT")
LOG_PROCESSOR_FUNCTION_ARN = os.environ.get("LOG_PROCESSOR_FUNCTION_ARN")

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    print(f"Handler called with event: {event}")
    client = boto3.client("lambda", region_name=AWS_REGION)
    resp = client.invoke(
        FunctionName=LOG_PROCESSOR_FUNCTION_ARN,
        InvocationType="Event",
        Payload=json.dumps(event).encode("utf-8"),
    )
    if resp.get("StatusCode") != 202:
        print(f"Error invoking write_logs: {resp}")
        return {"error": f"Error invoking write_logs: {resp}"}
    if resp.get("FunctionError"):
        print(f"Error invoking write_logs: {resp.get('FunctionError')}")
        return {"error": f"Error invoking write_logs: {resp.get('FunctionError')}"}
    print(f"Successfully invoked write_logs: {resp}")
    return {"data": {"message": "Log router invoked successfully"}}