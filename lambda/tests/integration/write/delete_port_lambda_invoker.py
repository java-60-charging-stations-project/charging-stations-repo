import json
import os
import sys
import boto3
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_PORTS_FUNCTION_NAME = os.getenv("WRITE_PORTS_FUNCTION_NAME", "charging-stations-write-station-ports-dynamo")

def invoke_delete_port(station_id: str, port_key: str) -> None:
    client = boto3.client("lambda", region_name=AWS_REGION)
    entity_key = port_key

    payload = {
        "service": {"action": "deleteStationPorts", "callerId": "script"},
        "data": {
            "stationId": station_id,
            "portKeys": [entity_key],
        },
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
    deleted = response_json["data"]["deleted_ports"]
    assert isinstance(deleted, list) and len(deleted) == 1, "expected one deleted_ports entry"
    print(json.dumps(response_json))
    print("Deleted port successfully (port must exist and be in DISABLED state).")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python -m tests.integration.write.delete_port_lambda_invoker <stationId> <portKey>\n"
            "  portKey: full entity_key (e.g. PORT#1234) or port code only (e.g. 1234)\n"
            "  Note: API only deletes one port per call; item must be DISABLED."
        )
        sys.exit(1)

    invoke_delete_port(sys.argv[1], sys.argv[2])