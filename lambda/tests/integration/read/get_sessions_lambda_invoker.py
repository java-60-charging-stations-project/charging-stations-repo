import json
import os
import sys
import boto3
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
GET_PORTS_SESSIONS_FUNCTION_NAME = os.getenv(
    "GET_PORTS_SESSIONS_FUNCTION_NAME", "charging-stations-get-ports-sessions-dynamo"
)


def invoke_get_sessions_by_user(user_id: str, latest: bool = False) -> None:
    client = boto3.client("lambda", region_name=AWS_REGION)

    payload = {
        "service": {"action": "getSessionByUser", "callerId": "script"},
        "data": {"userId": user_id, "latest": latest},
    }

    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_PORTS_SESSIONS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )

    if resp.get("StatusCode") != 200:
        raise SystemExit(f"Invoke failed, StatusCode={resp.get('StatusCode')}")
    if resp.get("FunctionError"):
        raw = resp["Payload"].read().decode("utf-8")
        raise SystemExit(f"Lambda runtime error: {resp['FunctionError']}, payload={raw}")
    raw = resp["Payload"].read().decode("utf-8") or "{}"
    response_json = json.loads(raw)
    if response_json.get("error"):
        raise SystemExit(
            f"Business error: code={response_json.get('code')} error={response_json.get('error')}"
        )

    sessions = response_json["data"]["session"]
    assert isinstance(sessions, list), "session must be a list"
    print(json.dumps(response_json, indent=2))
    print(f"Retrieved {len(sessions)} session(s) for user {user_id} (latest={latest}).")


if __name__ == "__main__":
    if len(sys.argv) not in {2, 3}:
        print(
            "Usage: python -m tests.integration.read.get_sessions_lambda_invoker <userId> [latest(true|false)]"
        )
        sys.exit(1)

    latest = False
    if len(sys.argv) == 3:
        latest_arg = sys.argv[2].strip().lower()
        if latest_arg not in {"true", "false"}:
            print("latest flag must be 'true' or 'false'")
            sys.exit(1)
        latest = latest_arg == "true"

    invoke_get_sessions_by_user(sys.argv[1], latest=latest)