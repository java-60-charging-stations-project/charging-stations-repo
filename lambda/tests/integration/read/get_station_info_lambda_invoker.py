import json
import boto3
import os
from dotenv import load_dotenv
import sys

load_dotenv()

GET_STATIONS_FUNCTION_NAME = os.getenv("GET_STATIONS_FUNCTION_NAME", "charging-stations-get-station-info")  # adjust if different
AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
LAMBDA_CLIENT = boto3.client("lambda", region_name=AWS_REGION)

def invoke_get_station_info(station_id: str):
    payload = {
        "service": {
        "action": "get_station_by_id",
        "caller_id": "string"},
        "data": {
            "station_id": station_id,
        },
    }
    response = LAMBDA_CLIENT.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_STATIONS_FUNCTION_NAME}",
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
    if len(sys.argv) != 2:
        print("Usage: python -m tests.integration.read.get_station_info_lambda_invoker <station_id>")
        sys.exit(1)
    station_id = sys.argv[1]
    invoke_get_station_info(station_id)