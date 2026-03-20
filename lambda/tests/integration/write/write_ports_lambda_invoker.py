import json
import sys
import boto3
import os
import dotenv
import random

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_PORTS_FUNCTION_NAME = os.getenv("WRITE_PORTS_FUNCTION_NAME", "charging-stations-write-ports-dynamo")

def invoke_write_ports(station_id: str):
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
      "service": { "action": "insert_station_ports", "caller_id": "script" },
      "data": {
        "stationId": station_id,
        "ports": [
          {
            "code": f"PORT-{random.randint(1000, 9999)}",
            "status": "DISABLED",
            "power": 10.0,
            "lastMeterKw": 100.0
          }
        ]
      }
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_PORTS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    raw = resp["Payload"].read().decode()
    response_json = json.loads(raw)
    print(response_json)
    assert resp.get("StatusCode") == 200
    assert payload is not None
    assert len(payload) > 0
    created_port_ids = response_json["data"]
    assert created_port_ids is not None
    assert isinstance(created_port_ids, list)
    assert len(created_port_ids) == 1
    assert created_port_ids[0] is not None
    assert isinstance(created_port_ids[0], str)
    assert len(created_port_ids[0]) > 0
    print(f"Created port id: {created_port_ids[0]}")
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")\

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m tests.integration.write.write_ports_lambda_invoker <station_id>")
        sys.exit(1)
    station_id = sys.argv[1]
    invoke_write_ports(station_id)