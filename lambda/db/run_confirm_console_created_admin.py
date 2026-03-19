import sys
import json
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
CONFIRM_CONSOLE_CREATED_ADMIN_FUNCTION_NAME = os.getenv(
    "CONFIRM_CONSOLE_CREATED_ADMIN_FUNCTION_NAME", "charging-stations-confirm-console-created-admin"
)
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")

lambda_client = boto3.client("lambda", region_name=AWS_REGION)


def invoke_confirm_console_created_admin(username: str, password: str, new_password: str) -> bytes:
    payload = {
        "username": username,
        "password": password,
        "new_password": new_password,
        "trigger": "script_run",
    }
    response = lambda_client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{CONFIRM_CONSOLE_CREATED_ADMIN_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    return response["Payload"].read()

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: python -m run_confirm_console_created_admin <username> <password> <new_password>",
            file=sys.stderr,
        )
        sys.exit(1)
    username = sys.argv[1]
    password = sys.argv[2]
    new_password = sys.argv[3]
    payload_bytes = invoke_confirm_console_created_admin(username, password, new_password)
    payload = json.loads(payload_bytes.decode("utf-8"))
    if "errorMessage" in payload:
        print(f"Lambda reported error: {payload['errorMessage']}", file=sys.stderr)
        sys.exit(1)
    else:
        print("Console created admin confirmed successfully")
        sys.exit(0)
