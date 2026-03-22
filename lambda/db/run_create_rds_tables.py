import json
import sys
import boto3
import os
import dotenv

dotenv.load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "il-central-1")
AWS_LAMBDA_HOST_ACCOUNT = os.getenv("AWS_LAMBDA_HOST_ACCOUNT", "852215679994")
CREATE_RDS_TABLES_FUNCTION_NAME = os.getenv("CREATE_RDS_TABLES_FUNCTION_NAME", "charging-stations-create-rds-tables")

def main():
    client = boto3.client("lambda", region_name=AWS_REGION)
    payload = {
        "action": "create_tables",
        "caller_id": "script_run",
    }
    resp = client.invoke(
        FunctionName=f"arn:aws:lambda:{AWS_REGION}:{AWS_LAMBDA_HOST_ACCOUNT}:function:{CREATE_RDS_TABLES_FUNCTION_NAME}",
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode("utf-8"),
    )
    payload = resp["Payload"].read().decode()
    print("StatusCode:", resp.get("StatusCode"))
    print("Payload:", payload)
    if resp.get("FunctionError"):
        raise SystemExit(f"Lambda error: {resp['FunctionError']}")
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)