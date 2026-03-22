# Charging Stations – Lambda Backends

Lambda functions for the Charging Stations Control System. They are invoked directly (e.g. from Node.js or run scripts) or by AWS (Cognito triggers, SQS). Callers get a synchronous response unless noted.

### JSON naming (HTTP / backend → Lambda)

- **Requests** from frontend or backend: use **camelCase** keys (e.g. `callerId`, `stationId`, `userId`, `siteTechnician`, `ratePlan`).
- **Successful Lambda responses** (`data`): **snake_case** keys matching RDS/Dynamo (e.g. `station_id`, `created_at`, `rate_plan`, `created_port_keys`).

Full examples: **`lambda_request_responces.md`** at repo root.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `lambda/` | Single SAM template (`template.yaml`) and `samconfig.toml`; deploy from here. |
| `lambda/db` | DB and auth Lambdas (RDS, DynamoDB), run scripts, RDS table creation. |
| `lambda/routes` | Route Lambdas (e.g. health). |
| `lambda/layers/common` | Shared layer: logger, `log_audit`, data types, utils. |
| `lambda/tests/integration` | Integration tests that invoke deployed Lambdas. |

---

## Deployment

### Prerequisites

- **AWS CLI v2** – installed and IDE logged in to AWS IAM role with Admin permissions. Run `aws configure` once and configure credentials.
- **Docker Desktop** – installed and running (needed for `sam build --use-container` so dependencies such as psycopg2 build correctly).
- **AWS Secrets Manager** – a secret with at least `username` and `password`. The template uses **DBSecretArn** only to **initialise the RDS instance** at create time (CloudFormation resolves it). Lambdas use **IAM database authentication** at runtime (no secret at runtime).
- **VPC and private subnets** – template parameters: **VpcId**, **PrivateSubnet1Id**, **PrivateSubnet2Id** (same subnets for RDS, Lambdas, and VPC endpoints), **DynamoDBRouteTable1Id** (route table IDs from default **VPC** `rtb-...`).
- **pgAdmin** (or any PostgreSQL client) – to connect to RDS once to run `GRANT rds_iam` for the DB user (one-time setup).
- **Python packages** – `pip install boto3 mypy` – `boto3` for Lambda invocations from the IDE; `mypy` optional for type checking.

### Single stack (Cognito, RDS, Lambdas, Health)

From **`lambda`**:

```bash
sam build --use-container
sam deploy --guided   # first time; then sam deploy
```

Use `--use-container` so dependencies (e.g. psycopg2 on Python 3.12) build correctly. On first deploy, set VPC, subnets, DB secret ARN, invoker account ID(s); save to `samconfig.toml` for later runs.

The template provisions: **Cognito** (User Pool, client, groups ADMIN/USER/SUPPORT), **RDS** PostgreSQL (IAM auth, private), **VPC endpoints** (RDS API for auth tokens, Cognito IdP, **SQS** so VPC Lambdas can enqueue without NAT, **DynamoDB** gateway for private-subnet access), **SQS** (station ports → RDS sync queue + DLQ), **Lambdas** (WriteUserRDS, GetUserInfo, CreateRDSTables, ConfirmConsoleCreatedAdmin, Health, station read/write, ports writer), and permissions.

1. In the RDS console, temporarily:
   - On the **Databases** tab of **Aurora and RDS** page select desired **db**, in Modify - Connectivity - Additional configuration set **Publicly accessible = Yes**, apply the change, and wait for **db** to modify.
   - In **db** - Security group rules find the security group attached to the DB and add an inbound rule:
     - Type: **PostgreSQL** (or **TCP** port `5432`)
     - Source: `<your public IP>/32`.
2. From your local machine, use **pgAdmin** - Query Tool Workspace - Welcome tab. Use the following data to connect:
   - **Host**: the RDS Endpoint from **db** - Endpoints .
   - **Port**: `5432`.
   - **Database**: the DB name from the template (default `charging_stations_rds_postgres`).
   - **Username / Password**: the `username` / `password` values from the Secrets Manager secret.
   - **Server Name**: choose name for the connection
   
3. Run:
   ```sql
   GRANT rds_iam TO "<username>";
   ```
   (Use the same `username` as in the secret.)
4. Revert RDS to **Publicly accessible = No** and remove the temporary inbound rule.

### Adding a Cognito self-signup user

Use the **User Pool Client ID** from the stack output (or Cognito console). Replace `<region>`, `<client-id>`, `<email>`.

1. Sign up (username = email):
   ```bash
   aws cognito-idp sign-up --region <region> --client-id <client-id> --username <email> --password '<password>' --user-attributes Name=email,Value=<email> Name=name,Value="Your Name"
   ```
2. Confirm with the code from email:
   ```bash
   aws cognito-idp confirm-sign-up --region <region> --client-id <client-id> --username <email> --confirmation-code <code>
   ```
   The **WriteUserRDS** Lambda runs on PostConfirmation (and PostAuthentication), writes the user to RDS, and adds them to the Cognito group USER (or ADMIN for PostAuthentication).

---

## Access (cross-account)

Invoke permission is per **AWS account**. At deploy time, set:

- **InvokerAccountIdA** (and optionally **InvokerAccountIdB**) in the template parameters so those accounts can call the Lambdas.
- For CI or scripts, use the deployer account ID (e.g. `LAMBDA_ACCOUNT_ID`) when invoking by ARN.

---

## Functions

### Health – `charging-stations-health`

- **Payload:** `{}` or any JSON.
- **Response:** `{"code": 200, "status": "running"}`.
- **Invoker:** Cross-account (invoker account IDs in template).

**Integration test** (from `lambda`, with boto3 and IAM allowing `lambda:InvokeFunction`):

```bash
python -m tests.integration.routes.health_invoker <account_id>
```

---

### DB stack – functions

The template provisions **RDS** (PostgreSQL, IAM auth), **VPC endpoints** (RDS API for `generate_db_auth_token`, **DynamoDB gateway**, **SQS interface** for `SendMessage` from VPC without NAT). DB Lambdas run in the VPC and use IAM database authentication (no Secrets Manager at runtime).

| Function | Purpose | Invoker |
|----------|---------|--------|
| **charging-stations-create-rds-tables** | Create RDS tables (e.g. `users`). | Script or cross-account. |
| **charging-stations-write-user-rds** | Write user to RDS and add to Cognito group. | Cognito (PostConfirmation + PostAuthentication). |
| **charging-stations-get-user-info** | Users from RDS (list, by id, by email per actions). | Backend or cross-account. |
| **charging-stations-confirm-console-created-admin** | Cognito auth (InitiateAuth, NEW_PASSWORD_REQUIRED with `name`). | Script or backend. |
| **charging-stations-write-station-rds** | Write station to RDS; change state; delete (soft); update port count (incl. from **SQS**). | Admin, cross-account, or SQS trigger. |
| **charging-stations-get-station-info** | Read station(s) from RDS. | Backend or cross-account. |
| **charging-stations-write-station-ports-dynamo** | Insert ports in DynamoDB; enqueue **SQS** to sync `ports` in RDS (when `SYNC_RDS_QUEUE_URL` is set). | Support / backend. |

**WriteUserRDS** – Cognito triggers (e.g. PostConfirmation) **or** direct invoke with `service` + `data` (e.g. `changeUserStatus`). For Cognito: inserts the user into RDS from `request.userAttributes` and returns the **same event** back. For API invokes: `callerId` in `service`. **full_name**: if missing or Cognito sends `cognito:default_val`, stored as **"Console User"**.

**ConfirmConsoleCreatedAdmin** – For first login (NEW_PASSWORD_REQUIRED), the Lambda sends `userAttributes.name` in the challenge response (default **"Console User"**) because console-created user by default does not have `name`. 

**WriteStationRDS** – Action-based single handler (`callerId` in `service`; camelCase in `data`):
- `write_station`: creates a station row. `data`: `code`, `name`, `owner`, `city`, `address`, `siteTechnician`, `ratePlan`, optional `email`, `phone`, `state`, `maxPowerKw`, `ports`, `location` (`longitude`/`latitude`).
- `change_station_state`: `stationId`, `oldState`, `newState`. Updates only when current state matches `oldState`.
- `delete_station`: `data.stationId`. Soft-delete when state is `ACTIVE`, `INACTIVE`, or `OUT_OF_SERVICE`.
- **SQS**: messages (e.g. port-count sync) are handled separately; body uses snake_case fields expected by the consumer.

**GetStationInfo** – Action-based (`callerId` in `service`):
- `get_station_by_id`: `data.stationId`.
- `get_all_stations`: optional `meta` — `city`, `owner`, `state`, `page`, `pageSize`. Response `data` is a list of station objects (**snake_case**); optional **`meta`** with totals/pages when implemented.

**WriteStationPortsDynamo** – `insert_station_ports`: `data.stationId`, `data.ports` (array of `code`, `power`, `lastMeterKw`). Response `data.created_port_keys` (**snake_case**), values are Dynamo `entity_key` strings (`PORT#...`). Enqueues SQS for RDS `ports` update when configured.


### Request/response (plain JSON)

See **`lambda_request_responces.md`** for full shapes. Summary:

- **CreateRDSTables** – Payload optional (e.g. `{"trigger": "script_run"}`). Returns handler result.
- **WriteUserRDS** – Cognito: returns the same event. API: `service` + `data` (e.g. `change_user_status`).
- **GetUserInfo** – `service.callerId`, `service.action`, `data` per action (e.g. `userId` or `email`, not both). Success `data`: **snake_case** user fields from RDS.
- **ConfirmConsoleCreatedAdmin** – Payload: `username`, `password`, `new_password`, `name` (optional). Response tokens / message or error.
- **WriteStationRDS** – Success `data` uses **snake_case**: `station_id`, `updated_at`, `deleted_at` (ISO strings where applicable).
- **GetStationInfo** – Station objects in **snake_case**; `location` as GeoJSON when selected.
- **WriteStationPortsDynamo** – `insert_station_ports`: success `data.created_port_keys` (list of `PORT#...` strings). Possible **`QUEUE_ERROR`** if SQS enqueue fails after Dynamo write.

### Run scripts

From **`lambda/db`** (or `lambda` with env set). Ensure `.env` has the right region, account, and function names (see `.env.example`).

**Create RDS tables (run once after deploy):**

```bash
python run_create_rds_tables.py
```

**Confirm console-created admin (first login or password change):**

```bash
python run_confirm_console_created_admin.py <username> <password> <new_password>
```

### Integration tests

From **`lambda`** (with boto3 and IAM allowing `lambda:InvokeFunction` on the target account).

**Health** – no extra data needed; exits 0 on success:

```bash
python -m tests.integration.routes.health_invoker <invoker account_id>
```

**GetUserInfo** – requires a real user id in RDS; asserts success and **snake_case** fields in `data` (e.g. `user_id`):

```bash
python -m tests.integration.read.get_user_info_lambda_invoker <user_id>
```

**Stations (write/change/list/read/delete)**:

```bash
# Create a station (prints stationId)
python -m tests.integration.write.write_station_lambda_invoker

# Replace <station_id> with the printed value above
python -m tests.integration.write.change_station_state_lambda_invoker <station_id> <old state> <new state>
python -m tests.integration.read.get_all_stations_lambda_invoker
python -m tests.integration.read.get_station_info_lambda_invoker <station_id>
python -m tests.integration.write.delete_station_lambda_invoker <station_id>
# List users
python -m tests.integration.read.get_all_users_lambda_invoker
```


---

## Environment variables

Copy **`lambda/.env.example`** to **`lambda/.env`** and set values for local runs and integration tests.

| Variable | Use |
|----------|-----|
| **AWS_REGION** | AWS region (e.g. `il-central-1`). |
| **AWS_LAMBDA_HOST_ACCOUNT** | Account where DB Lambdas are deployed (for scripts). |
| **CREATE_RDS_TABLES_FUNCTION_NAME**, **CONFIRM_CONSOLE_CREATED_ADMIN_FUNCTION_NAME**| Function names for setting up RDS, confirming console-created admins|
**HEALTH_FUNCTION_NAME** | Health function name |
| **GET_USERS_FUNCTION_NAME**, **GET_STATIONS_FUNCTION_NAME** | Function names for read lambdas. |
| **WRITE_STATION_FUNCTION_NAME** | Function name for writing stations to RDS. |
| **RDS_DB_SECRET_NAME** | Name of your secret used by the SAM template for DB credentials creation Lambdas and (DB requests with IAM tokens). |
| **STATIONS_DYNAMO_TABLE** | Optional for local invocation of `charging-stations-write-station-ports-dynamo` (single-table name/ARN). |
| **SYNC_RDS_QUEUE_URL** | Optional for local tests: SQS queue URL for async RDS port-count sync (deployed Lambda gets this from `lambda/template.yaml`; copy from stack output **StationPortsRdsSyncQueueUrl**). |


---

## Audit logging (CloudWatch)

Lambdas use **`log_audit`** (from `utils.logger` in the common layer) to write one JSON line per event (e.g. `message`, `userId`, `event`, `status`, `requestId`, `source`/`trigger`).

- **Log groups:** `/aws/lambda/<function-name>`.
- **Query:** CloudWatch → Logs → Logs Insights; filter by `event`, `status`, `userId`, `requestId` in the message.
- **Log level:** Optional `LOGGER_LEVEL` per function in the template (`Environment.Variables.LOGGER_LEVEL`, e.g. `INFO` or `DEBUG`).

---

## Adding new Lambdas

Add the function resource and any `AWS::Lambda::Permission` (e.g. for cross-account or Cognito) in **`lambda/template.yaml`**. Use the same pattern as existing functions: `CodeUri`, `Handler`, `Layers`, `VpcConfig` for DB Lambdas, env vars, and IAM policies.
