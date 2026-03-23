import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
GET_USERS_FUNCTION_NAME = os.getenv("GET_USERS_FUNCTION_NAME", "charging-stations-get-user-info")

def main():
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
        "service": {
        "action": "getAllUsers",
        "callerId": "string",
        }
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_USERS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    raw = resp["Payload"].read().decode()
    response_json = json.loads(raw)
    assert resp.get("StatusCode") == 200
    assert payload is not None
    assert len(payload) > 0
    list_users = response_json["data"]
    assert isinstance(list_users, list)
    assert all(isinstance(item, dict) for item in list_users)
    assert all(item.get("user_id") is not None for item in list_users)
    assert all(item.get("email") is not None for item in list_users)
    assert all(item.get("full_name") is not None for item in list_users)
    print(list_users)
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)