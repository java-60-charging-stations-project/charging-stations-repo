import json
import os
import sys
import boto3
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
WRITE_PORTS_FUNCTION_NAME = os.getenv(
    "WRITE_PORTS_FUNCTION_NAME", "charging-stations-write-station-ports-dynamo"
)


def invoke_pay_session_user(station_id: str, entity_key: str, user_id: str) -> None:
    client = boto3.client("lambda", region_name=AWS_REGION)

    payload = {
        "service": {"action": "paySessionUser", "callerId": "script"},
        "data": {
            "stationId": station_id,
            "entityKey": entity_key,  # e.g. PORT#A1#SESSION#<session_id>
            "userId": user_id,
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

    paid = response_json["data"].get("paid_session")
    assert isinstance(paid, dict), "data.paid_session must be an object"
    assert paid.get("session_id"), "missing session_id in response"

    print(json.dumps(response_json, indent=2))
    print(
        f"Paid session {paid.get('session_id')} for user {paid.get('user_id')} "
        f"at {paid.get('paid_at')}."
    )


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(
            "Usage: python -m tests.integration.write.pay_session_user_lambda_inv <stationId> <entityKey> <userId>"
        )
        sys.exit(1)

    invoke_pay_session_user(
        station_id=sys.argv[1],
        entity_key=sys.argv[2],
        user_id=sys.argv[3],
    )