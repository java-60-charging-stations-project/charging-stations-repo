import json
import os
import random
import sys
import boto3
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_PORTS_FUNCTION_NAME = os.getenv("WRITE_PORTS_FUNCTION_NAME", "charging-stations-write-station-ports-dynamo")


def build_ports(count: int) -> list[dict]:
    return [
        {
            "code": f"{random.randint(1000, 9999)}",
            "power": round(random.uniform(7.0, 22.0), 1),
            "lastMeterKw": round(random.uniform(0.0, 5000.0), 1),
        }
        for _ in range(count)
    ]


def invoke_write_ports(station_id: str, ports_count: int) -> None:
    client = boto3.client("lambda", region_name=AWS_REGION)

    payload = {
        "service": {"action": "insertStationPorts", "callerId": "script"},
        "data": {
            "stationId": station_id,
            "ports": build_ports(ports_count),
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
    created_port_keys = response_json["data"]["created_port_keys"]
    assert isinstance(created_port_keys, list), "created_port_keys must be a list"
    assert len(created_port_keys) == ports_count, (
        f"expected {ports_count} keys, got {len(created_port_keys)}"
    )
    print(json.dumps(response_json, indent=2))
    print(f"Created {len(created_port_keys)} port keys successfully.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python -m tests.integration.write.write_ports_dynamo_invoker <stationId> <portsCount>"
        )
        sys.exit(1)

    station_id = sys.argv[1]
    ports_count = int(sys.argv[2])
    invoke_write_ports(station_id, ports_count)