# Charging Stations Control System – Lambda Microservices

Lambda functions used as backends for the Charging Stations Control System.  
They are invoked directly (e.g. from Node.js) and return a result.  
There is no SNS subscription; callers invoke the functions and get a response.

## Access

Invoke permission is granted at the **AWS account** level.  
Provide the caller’s AWS Account ID when deploying using sam deploy --guided (or via samconfig / parameter overrides) so that account can invoke these Lambdas.  
Provide your own AWS Account ID in LAMBDA_ACCOUNT_ID variable in GitHub repo → Settings → Secrets and variables → Actions → Variables
so that other contributors can access your lambdas  
For each additional AWS account that you want to grant access to your functions, add corresponding parameter (eg. InvokerAccountId)  


## Routes

Route lambdas are deployed from lambda/routes  

Route lambdas are deployed via a single template.yaml file, so with addition of new route lambdas add them as new resources in template.yaml, also add permissions to invoke them for cross-account usage.

### `/health` – Health check

- **Payload:** Empty (e.g. `{}`).
- **Response:** `{"code": 200, "status": "running"}`.

#### Integration test

Prerequisites: Lambdas must be deployed, boto3 library installed, AWS IAM role that allows lambda:InvokeFunction  
All tests are run from /lambda directory  
Provide desired REGION variable in .env file in /lambda directory to specify the regional location of AWS lambdas, `'il-central-1'` by default

##### `/health` – Health check

The health route has an integration test that invokes the deployed Lambda.  

Run test from deployer AWS account with  

`python -m tests.integration.routes.health_invoker` **Your AWS Account ID**  

If the test **passes**, the script exits with code 0 and prints nothing. On failure, it prints an assertion error and traceback.

To run the test from non-deployer AWS account, get LAMBDA_ACCOUNT_ID from 
GitHub repo → Settings → Secrets and variables → Actions → Variables  
Then run one of these commands from /lambda directory passing LAMBDA_ACCOUNT_ID as an argument:  

Example 1  

`python -m tests.integration.routes.health_invoker` **LAMBDA_ACCOUNT_ID**  

Example 2:  

`python -m tests.integration.routes.health_invoker --account` **LAMBDA_ACCOUNT_ID**  

  