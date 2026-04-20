import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT")
WRITE_LOGS_FUNCTION_NAME = os.getenv("WRITE_LOGS_FUNCTION_NAME")


def invoke_resolve_log(log_id: str, caller_id: str = "integration-test"):
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
        "service": {
            "action": "resolveLog",
            "callerId": caller_id,
        },
        "data": {
            "logId": log_id,
        },
    }

    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{WRITE_LOGS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )

    raw = resp["Payload"].read().decode()
    response_json = json.loads(raw)

    assert resp.get("StatusCode") == 200
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")

    data = response_json["data"]
    assert data["logId"] == log_id
    assert data["resolverId"] == caller_id
    assert data.get("resolveTime") is not None

    print(response_json)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        print("Usage: python -m tests.integration.write.resolve_log_lambda_invoker <logId> [callerId]")
        sys.exit(1)

    log_id_arg = sys.argv[1]
    caller_id_arg = sys.argv[2] if len(sys.argv) == 3 else "integration-test"
    invoke_resolve_log(log_id_arg, caller_id_arg)