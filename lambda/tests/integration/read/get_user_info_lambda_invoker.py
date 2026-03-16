import json
import boto3
import os
from dotenv import load_dotenv
import sys

load_dotenv()

GET_USERS_FUNCTION_NAME = os.getenv("GET_USERS_FUNCTION_NAME", "charging-stations-get-user-info")  # adjust if different
REGION = os.getenv("REGION", "il-central-1")
LAMBDA_CLIENT = boto3.client("lambda", region_name=REGION)

def invoke_get_user_info(account_id: str, user_id: str):
    payload = {
        "user_id": user_id,
    }
    response = LAMBDA_CLIENT.invoke(
        FunctionName=f"arn:aws:lambda:{REGION}:{account_id}:function:{GET_USERS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    # Read and decode the Lambda response payload
    response_payload = response["Payload"].read()
    try:
        response_json = json.loads(response_payload)
    except json.JSONDecodeError:
        print("Non-JSON response body")
        return
    assert response['StatusCode'] == 200          # Lambda service-level
    assert response_json is not None
    assert response_json['userId'] == user_id
    print(response_json)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m tests.integration.read.get_user_info_lambda_invoker <account_id> <user_id>")
        sys.exit(1)
    account_id = sys.argv[1]
    user_id = sys.argv[2]
    invoke_get_user_info(account_id, user_id)