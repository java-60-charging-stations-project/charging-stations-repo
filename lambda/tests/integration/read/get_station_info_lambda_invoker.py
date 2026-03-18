import json
import boto3
import os
from dotenv import load_dotenv
import sys

load_dotenv()

GET_STATIONS_FUNCTION_NAME = os.getenv("GET_STATIONS_FUNCTION_NAME", "charging-stations-get-station-info")  # adjust if different
REGION = os.getenv("REGION", "il-central-1")
LAMBDA_CLIENT = boto3.client("lambda", region_name=REGION)

def invoke_get_station_info(account_id: str, station_id: str):
    payload = {
        "service": {
        "action": "get_station_by_id",
        "caller_id": "string",
        "station_id": station_id,
        }
    }
    response = LAMBDA_CLIENT.invoke(
        FunctionName=f"arn:aws:lambda:{REGION}:{account_id}:function:{GET_STATIONS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    # Read and decode the Lambda response payload
    response_payload = response["Payload"].read()
    try:
        response_json = json.loads(response_payload)
    except json.JSONDecodeError:
        print("Non-JSON response body")
        return
    assert response['StatusCode'] == 200          # Lambda service-level
    assert response_json is not None
    assert response_json['data']['id'] == station_id
    print(response_json)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m tests.integration.read.get_station_info_lambda_invoker <account_id> <station_id>")
        sys.exit(1)
    account_id = sys.argv[1]
    station_id = sys.argv[2]
    invoke_get_station_info(account_id, station_id)