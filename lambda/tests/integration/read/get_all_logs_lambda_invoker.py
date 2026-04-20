import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT")
GET_LOGS_FUNCTION_NAME = os.getenv("GET_LOGS_FUNCTION_NAME")


def main():
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
        "service": {
            "action": "getLogs",
            "callerId": "integration-test",
        },
        "data": {},
        "meta": {
            "page": 1,
            "pageSize": 20,
        },
    }

    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{GET_LOGS_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )

    raw = resp["Payload"].read().decode()
    response_json = json.loads(raw)

    assert resp.get("StatusCode") == 200
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")

    logs = response_json["data"]
    meta = response_json.get("meta", {})

    assert isinstance(logs, list)
    assert all(isinstance(item, dict) for item in logs)

    # Optional shape checks (only if list not empty)
    if logs:
        assert all(item.get("log_id") is not None for item in logs)
        assert all(item.get("level") is not None for item in logs)
        assert all(item.get("message") is not None for item in logs)
        assert all(item.get("timestamp") is not None for item in logs)

    assert "page" in meta
    assert "page_size" in meta
    assert "total_items" in meta
    assert "total_pages" in meta

    print(logs)
    print(meta)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)