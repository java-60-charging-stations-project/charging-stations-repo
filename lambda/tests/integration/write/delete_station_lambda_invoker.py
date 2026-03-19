import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_STATION_FUNCTION_NAME = os.getenv("WRITE_STATION_FUNCTION_NAME", "charging-stations-write-station-rds")

def invoke_delete_station(station_id: str):
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
      "service": { "action": "delete_station", "caller_id": "script" },
        "data": {
            "stationId": station_id,
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
    deleted_at = response_json["data"]["deletedAt"]
    assert deleted_at is not None
    print(deleted_at)
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m tests.integration.write.delete_station_lambda_invoker <station_id>")
        sys.exit(1)
    station_id = sys.argv[1]
    invoke_delete_station(station_id)