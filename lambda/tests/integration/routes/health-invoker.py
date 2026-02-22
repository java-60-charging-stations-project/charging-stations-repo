import boto3
import json

lambda_client = boto3.client('lambda', region_name='il-central-1')

def invoke_health_function():
    response = lambda_client.invoke(
        FunctionName='charging-stations-health',
        InvocationType='RequestResponse',
        Payload=json.dumps({})
    )
    return response['Payload'].read()

def test_health_function():
    responseBytes = invoke_health_function()
    response = json.loads(responseBytes)
    assert response['statusCode'] == 200
    assert json.loads(response['body']) == {'code': 200, 'status': 'running'}

if __name__ == '__main__':
    test_health_function()