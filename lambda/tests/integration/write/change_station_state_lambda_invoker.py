import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_STATION_FUNCTION_NAME = os.getenv("WRITE_STATION_FUNCTION_NAME", "charging-stations-write-station-rds")

def invoke_change_station_state(station_id: str, old_state: str, new_state: str):
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
      "service": { "action": "change_station_state", "caller_id": "script" },
        "data": {
            "stationId": station_id,
            "oldState": old_state,
            "newState": new_state
      }
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    raw = resp["Payload"].read().decode()
    response_json = json.loads(raw)
    print(response_json)
    assert resp.get("StatusCode") == 200
    assert payload is not None
    assert len(payload) > 0
    updated_at = response_json["data"]["updatedAt"]
    assert updated_at is not None
    print(updated_at)
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m tests.integration.write.change_station_state_lambda_invoker <station_id> <old_state> <new_state>")
        sys.exit(1)
    station_id = sys.argv[1]
    old_state = sys.argv[2]
    new_state = sys.argv[3]
    invoke_change_station_state(station_id, old_state, new_state)