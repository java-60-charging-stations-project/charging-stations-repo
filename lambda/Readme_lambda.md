# Charging Stations Control System – Lambda Microservices

Lambda functions used as backends for the Charging Stations Control System. 
They are invoked directly (e.g. from Node.js) and return a result. 
There is no SNS subscription; callers invoke the functions and get a response.

## Access

Invoke permission is granted at the **AWS account** level. Provide the caller’s AWS Account ID when deploying 
so that account can invoke these Lambdas.

## Routes

### `/health` – Health check

- **Payload:** Empty (e.g. `{}`).
- **Response:** `{"code": 200, "status": "running"}`.

## Integration test

The health route has an integration test that invokes the deployed Lambda. If the test **passes**, the script exits with code 0 and prints nothing. On failure, it prints an assertion error and traceback.