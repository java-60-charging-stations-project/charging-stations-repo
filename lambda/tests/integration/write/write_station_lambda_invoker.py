import json
import sys
import boto3
import os
import dotenv
import random

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_STATION_FUNCTION_NAME = os.getenv("WRITE_STATION_FUNCTION_NAME", "charging-stations-write-station-rds")

def main():
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
      "service": { "action": "writeStation", "callerId": "script" },
      "data": {
        "code": f"TLV-FAST-{random.randint(1000, 9999)}",
        "name": "Skyline Hub",
        "owner": "ElectroNet Services Ltd.",
        "city": "Tel Aviv",
        "address": "44 Ibn Gabirol St",
        "email": None,
        "phone": None,
        "siteTechnician": None,
        "state": "ACTIVE",
        "ratePlan": {
          "currencyCode": "ILS",
          "currencyName": "Israeli Shekel",
          "peakRate": 2.14,
          "offPeakRate": 1.47
        },
        "location": {
          "longitude": 34.7818,
          "latitude": 32.0853
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
    assert resp.get("StatusCode") == 200
    assert payload is not None
    assert len(payload) > 0
    station_id = response_json["data"]["station_id"]
    assert station_id is not None
    print(station_id)
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)