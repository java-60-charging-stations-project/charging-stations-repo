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
TOTAL_STATIONS = 10


def random_phone() -> str:
    # Must start with 0 and contain 10 digits total.
    return "0" + "".join(str(random.randint(0, 9)) for _ in range(9))


def random_location() -> dict:
    # Four decimal places, e.g. 45.7865
    return {
        "longitude": round(random.uniform(-179.9999, 179.9999), 4),
        "latitude": round(random.uniform(-89.9999, 89.9999), 4),
    }


def station_payload(i: int) -> dict:
    return {
        "service": {"action": "writeStation", "callerId": "script"},
        "data": {
            "code": f"RND-{i:03d}-{random.randint(1000, 9999)}",
            "name": f"Random Station {i}",
            "owner": random.choice(["ElectroNet", "Voltix", "ChargeFlow", "GridGo"]),
            "city": random.choice(["Tel Aviv", "Haifa", "Jerusalem", "Beer Sheva", "Netanya"]),
            "address": f"{random.randint(1, 250)} Random St",
            "email": None,
            "phone": random_phone(),
            "siteTechnician": f"Tech {random.randint(1, 500)}",
            "ratePlan": {
                "currencyCode": "ILS",
                "currencyName": "Israeli Shekel",
                "peakRate": round(random.uniform(1.5, 3.5), 2),
                "offPeakRate": round(random.uniform(1.0, 2.5), 2),
            },
            "location": random_location(),
            "hasFreePorts": random.choice([True, False]),
        },
    }

def main():
    client = boto3.client("lambda", region_name=AWS_REGION)
    function_arn = f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_STATION_FUNCTION_NAME}"
    station_ids: list[str] = []

    for i in range(1, TOTAL_STATIONS + 1):
        payload = station_payload(i)
        resp = client.invoke(
            FunctionName=function_arn,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload).encode("utf-8"),
        )
        raw = resp["Payload"].read().decode()
        response_json = json.loads(raw)
        assert resp.get("StatusCode") == 200
        if resp.get("FunctionError"):
            raise SystemExit(f"Lambda error on station {i}: {response_json}")

        station_id = response_json["data"]["station_id"]
        assert station_id is not None
        station_ids.append(station_id)
        print(f"[{i}/{TOTAL_STATIONS}] station_id={station_id}")

    print(f"Created {len(station_ids)} stations successfully.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)