import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_STATION_FUNCTION_NAME = os.getenv("WRITE_STATION_FUNCTION_NAME", "charging-stations-write-station-rds")


def invoke_update_station(station_id: str):
    client = boto3.client("lambda", region_name=AWS_REGION)

    payload = {
        "service": {"action": "updateStation", "callerId": "script"},
        "data": {
            "stationId": station_id,
            "name": "UHub",
            "owner": "ElecoNSLtd.",
            "city": "Tel Aviv",
            "address": "99 Ibn Gabirol St",
            "ratePlan": {
                "currencyCode": "ILS",
                "currencyName": "Israeli Shekel",
                "peakRate": 2.55,
                "offPeakRate": 1.55
            },
            "email": "ops@exple.com",
            "phone": "0541234567",
            "siteTechnician": "Tioch 42",
            "maxPowerKw": 110.0,
            "location": {
                "longitude": 39.7821,
                "latitude": 38.0850
            }
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

    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")

    if response_json.get("error"):
        raise SystemExit(f"Business error: code={response_json.get('code')} error={response_json.get('error')}")

    assert resp.get("StatusCode") == 200
    assert response_json.get("data") is not None


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m tests.integration.write.update_station_lambda_invoker <stationId>")
        sys.exit(1)
    station_id = sys.argv[1]
    invoke_update_station(station_id)
    print(f"Updated station {station_id}")