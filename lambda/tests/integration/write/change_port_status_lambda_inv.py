import json
import os
import sys
import boto3
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_PORTS_FUNCTION_NAME = os.getenv(
    "WRITE_PORTS_FUNCTION_NAME", "charging-stations-write-station-ports-dynamo"
)


def invoke_update_port_status(
    station_id: str,
    port_code: str,
    old_state: str,
    new_state: str,
    mode: str = "support",
    user_id: str | None = None,
) -> None:
    client = boto3.client("lambda", region_name=AWS_REGION)

    if mode not in {"support", "user"}:
        raise SystemExit("mode must be 'support' or 'user'")

    action = "supportUpdateStationPorts" if mode == "support" else "userUpdateStationPorts"

    data = {
        "stationId": station_id,
        "portCode": port_code,  # code only; lambda builds PORT#<code>
        "oldState": old_state,
        "newState": new_state,
    }
    if mode == "user":
        if not user_id:
            raise SystemExit("user mode requires user_id")
        data["userId"] = user_id

    payload = {
        "service": {"action": action, "callerId": "script"},
        "data": data,
    }

    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_PORTS_FUNCTION_NAME}",
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

    updated = response_json["data"]
    assert isinstance(updated, dict), "data must be an object"
    assert updated.get("entity_key"), "missing entity_key in response"

    print(json.dumps(response_json, indent=2))
    print(
        f"Updated port {updated.get('entity_key')} "
        f"from {old_state} to {updated.get('new_state')}."
    )


if __name__ == "__main__":
    if len(sys.argv) not in {6, 7}:
        print(
            "Usage:\n"
            """  python -m tests.integration.write.change_port_status_lambda_inv 
            <stationId> <portCode> <oldState> <newState> <mode[support|user]> [userId]"""
        )
        sys.exit(1)

    station_id = sys.argv[1]
    port_code = sys.argv[2]
    old_state = sys.argv[3]
    new_state = sys.argv[4]
    mode = sys.argv[5]
    user_id = sys.argv[6] if len(sys.argv) == 7 else None

    invoke_update_port_status(station_id, port_code, old_state, new_state, mode, user_id)