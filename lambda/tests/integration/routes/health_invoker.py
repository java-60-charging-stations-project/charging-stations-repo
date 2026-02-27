import boto3
import json
from tests.common.argument_parsers import parse_aws_account_id_from_args

REGION = 'il-central-1'

lambda_client = boto3.client('lambda', region_name=REGION)

def invoke_health_function(account_id):
    response = lambda_client.invoke(
        FunctionName=f"arn:aws:lambda:{REGION}:{account_id}:function:charging-stations-health",
        InvocationType='RequestResponse',
        Payload=json.dumps({})
    )
    return response['Payload'].read()

def test_health_function(account_id):
    responseBytes = invoke_health_function(account_id)
    response = json.loads(responseBytes)
    assert response['code'] == 200
    assert response['status'] == 'running'

if __name__ == '__main__':
    account_id = parse_aws_account_id_from_args()
    test_health_function(account_id)