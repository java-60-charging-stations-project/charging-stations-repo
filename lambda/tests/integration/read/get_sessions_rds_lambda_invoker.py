import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
GET_SESSIONS_FUNCTION_NAME = os.getenv("GET_SESSIONS_FUNCTION_NAME", "charging-stations-get-session-info")


def invoke_lambda(payload: dict) -> dict:
    client = boto3.client("lambda", region_name=AWS_REGION)
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_SESSIONS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )

    raw = resp["Payload"].read().decode() or "{}"
    response_json = json.loads(raw)

    assert resp.get("StatusCode") == 200, f"Invoke failed, status={resp.get('StatusCode')}"
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda runtime error: {resp['FunctionError']}, payload={raw}")
    if response_json.get("error"):
        raise SystemExit(
            f"Business error: code={response_json.get('code')} error={response_json.get('error')}"
        )

    return response_json


def get_all_sessions() -> None:
    payload = {
        "service": {"action": "getSessions", "callerId": "script"},
        "data": {},
        "meta": {"page": 1, "pageSize": 50},
    }

    response_json = invoke_lambda(payload)
    sessions = response_json["data"]

    assert isinstance(sessions, list), "data must be a list"
    assert all(isinstance(item, dict) for item in sessions), "all sessions must be objects"

    # Optional shape checks (safe even if list empty)
    if sessions:
        assert all(item.get("session_id") is not None for item in sessions), "missing session_id"
        assert all(item.get("station_id") is not None for item in sessions), "missing station_id"
        assert all(item.get("entity_key") is not None for item in sessions), "missing entity_key"

    print(json.dumps(response_json, indent=2))
    print(f"Retrieved {len(sessions)} session(s).")


def get_session_by_id(session_id: str) -> None:
    payload = {
        "service": {"action": "getSessionById", "callerId": "script"},
        "data": {"sessionId": session_id},
    }

    response_json = invoke_lambda(payload)
    session = response_json["data"]

    assert isinstance(session, dict), "data must be an object"
    assert session.get("session_id") == session_id, "session_id mismatch"

    print(json.dumps(response_json, indent=2))
    print(f"Retrieved session {session_id}.")


def main():
    # Usage:
    #   python -m tests.integration.read.get_sessions_rds_lambda_invoker
    #   python -m tests.integration.read.get_sessions_rds_lambda_invoker <sessionId>
    if len(sys.argv) == 1:
        get_all_sessions()
    elif len(sys.argv) == 2:
        get_session_by_id(sys.argv[1])
    else:
        print(
            "Usage:\n"
            "  python -m tests.integration.read.get_sessions_rds_lambda_invoker\n"
            "  python -m tests.integration.read.get_sessions_rds_lambda_invoker <sessionId>"
        )
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)