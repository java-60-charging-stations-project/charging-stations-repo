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

The template provisions: **Cognito** (User Pool, client, groups ADMIN/USER/SUPPORT), **RDS** PostgreSQL (IAM auth, private), **VPC endpoints** (RDS API for auth tokens, **Lambda API** for private Lambda-to-Lambda invoke, **SES API** for private-subnet email delivery, **DynamoDB** gateway for private-subnet access), **Lambdas** (WriteUserRDS, GetUserInfo, CreateRDSTables, ConfirmConsoleCreatedAdmin, Health, station read/write, ports writer, notification sender, Dynamo stream consumer), and permissions.

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

### Backend on Fargate (Cognito user groups)

The stack creates **`BackendCognitoUserGroupManagementPolicy`** — a managed IAM policy scoped to this stack’s **User Pool** (`AdminAddUserToGroup`, `AdminRemoveUserFromGroup`, `AdminListGroupsForUser`, `ListGroups`, `AdminGetUser`, `ListUsers`).

1. **Same account as the pool:** Attach the output **`BackendCognitoUserGroupManagementPolicyArn`** to your **ECS task role** (task role, not execution role).
2. **Cross-account backend:** The stack also creates **`BackendCognitoCrossAccountRole`** (output **`CognitoCrossAccountRoleArn`**) whose **trust policy** allows the same **`InvokerAccountIdA` / `InvokerAccountIdB`** principals as **`AWS::Lambda::Permission`**. On the backend task role, allow **`sts:AssumeRole`** to that ARN; use assumed-role credentials for **`cognito-idp`** calls.
3. **Network:** Ensure tasks can reach the **public** Cognito IdP API (HTTPS), e.g. **NAT** or **public task IPs**. This stack does not create a **cognito-idp** VPC endpoint.
4. Configure the app with **`UserPoolId`** and **`UserPoolClientId`** from stack outputs (and your app client settings).

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

The template provisions **RDS** (PostgreSQL, IAM auth), **VPC endpoints** (RDS API for `generate_db_auth_token`, **DynamoDB gateway**, **Lambda API interface endpoint** for private Lambda invoke without NAT). DB Lambdas run in the VPC and use IAM database authentication (no Secrets Manager at runtime).

| Function | Purpose | Invoker |
|----------|---------|--------|
| **charging-stations-create-rds-tables** | Create RDS tables (e.g. `users`). | Script or cross-account. |
| **charging-stations-write-user-rds** | Write user to RDS and add to Cognito group. | Cognito (PostConfirmation + PostAuthentication). |
| **charging-stations-get-user-info** | Users from RDS (list, by id, by email per actions). | Backend or cross-account. |
| **charging-stations-confirm-console-created-admin** | Cognito auth (InitiateAuth, NEW_PASSWORD_REQUIRED with `name`). | Script or backend. |
| **charging-stations-write-station-rds** | Write station to RDS; change state; delete (soft); update station `ports` count from stream-forwarded ops. | Admin, cross-account, or Dynamo stream consumer invoke. |
| **charging-stations-get-station-info** | Read station(s) from RDS. | Backend or cross-account. |
| **charging-stations-get-session-info** | Read archived session rows from RDS `sessions` table. | Backend or cross-account. |
| **charging-stations-get-logs-info** | Read logs from RDS with filtering/sorting/pagination. | Backend or cross-account. |
| **charging-stations-write-logs-rds** | Internal log writer (`write_logs`) and resolver (`resolveLog`). | Log subscription processor / backend. |
| **charging-stations-write-station-ports-dynamo** | Insert/update/delete ports in DynamoDB single-table; for user port updates it also creates a session item in the same transaction. | Support / backend. |
| **charging-stations-payment-notification** | Internal notification lambda; fetches user contact and sends SES payment-failure email. | Invoked by write-station-ports-dynamo. |
| **charging-stations-station-entities-stream-consumer** | DynamoDB stream: forward station-port updates, session payment, and paid-session archive events. | DynamoDB stream trigger. |

**WriteUserRDS** – Cognito triggers (e.g. PostConfirmation) **or** direct invoke with `service` + `data` (e.g. `changeUserStatus`). For Cognito: inserts the user into RDS from `request.userAttributes` and returns the **same event** back. For API invokes: `callerId` in `service`. **full_name**: if missing or Cognito sends `cognito:default_val`, stored as **"Console User"**.

**ConfirmConsoleCreatedAdmin** – For first login (NEW_PASSWORD_REQUIRED), the Lambda sends `userAttributes.name` in the challenge response (default **"Console User"**) because console-created user by default does not have `name`. 

**WriteStationRDS** – Action-based single handler (`callerId` in `service`; camelCase in `data`):
- `writeStation`: creates a station row. `data`: `code`, `name`, `owner`, `city`, `address`, `siteTechnician`, `ratePlan`, optional `email`, `phone`, `state`, `maxPowerKw`, `ports`, `location` (`longitude`/`latitude`).
- `changeStationState`: `stationId`, `oldState`, `newState`. Updates only when current state matches `oldState`.
- `deleteStation`: `data.stationId`. Soft-delete when state is `ACTIVE`, `INACTIVE`, or `OUT_OF_SERVICE`.
- `update_station_ports`: accepts `data` as list of operations (`station_id`, `event_id`, `delta`) from the stream consumer.
- `archive_session`: accepts stream-forwarded paid session payloads and inserts archived rows into RDS `sessions` (idempotent by `session_id` conflict handling).

**GetStationInfo** – Action-based (`callerId` in `service`):
- `getStationById`: `data.stationId`.
- `getAllStations`: optional `meta` — `city`, `owner`, `state`, `page`, `pageSize`. Response `data` is a list of station objects (**snake_case**); optional **`meta`** with totals/pages when implemented.

**GetSessionInfo** – Action-based (`callerId` in `service`):
- `getSessionById`: `data.sessionId`.
- `getSessions`: optional filters in `data` (`sessionId`, `stationId`, `userId`, `state`, `orderBy`) and pagination in `meta` (`page`, `pageSize`).

**WriteStationPortsDynamo** – Action-based (`callerId` in `service`):
- `insertStationPorts`: `data.stationId`, `data.ports` (array of `code`). Atomic batch via DynamoDB `TransactWriteItems`; response includes `data.created_ports`.
- `supportUpdateStationPorts` / `userUpdateStationPorts`: optimistic state updates using `oldState`/`newState`; `userUpdateStationPorts` requires `userId` and creates a session item in the same transaction. Support flow allows `OCCUPIED -> DISABLED` and closes the active session as `UNPAID` (`ended_at`, `final_cost`) in the same transaction when a session row is found.
- `deleteStationPorts`: delete one disabled port by `portKey`.
- `pay_session` (internal from stream consumer) and `paySessionUser` (direct retry/user call): payment success is probabilistic. With `PAYMENT_SUCCESS_RATE=80` and condition `random(1..100) <= PAYMENT_SUCCESS_RATE`, effective behavior is about 80% success / 20% simulated failure.
- On simulated payment failure, `pay_session` asynchronously invokes `charging-stations-payment-notification` (action `notify_payment_failure`) and returns `PAYMENT_FAILED`.
- `charging-stations-payment-notification` uses `SES_FROM_EMAIL` and requires SES identity verification; if SES is in sandbox, recipients must also be SES-verified.
See **`lambda_request_responces.md`** for exact request/response payloads.


### Request/response (plain JSON)

See **`lambda_request_responces.md`** for full shapes. Summary:

- **CreateRDSTables** – Payload optional (e.g. `{"trigger": "script_run"}`). Returns handler result.
- **WriteUserRDS** – Cognito: returns the same event. API: `service` + `data` (e.g. `changeUserStatus`).
- **GetUserInfo** – `service.callerId`, `service.action`, `data` per action (e.g. `userId` or `email`, not both). Success `data`: **snake_case** user fields from RDS.
- **ConfirmConsoleCreatedAdmin** – Payload: `username`, `password`, `new_password`, `name` (optional). Response tokens / message or error.
- **WriteStationRDS** – Success `data` uses **snake_case**: `station_id`, `updated_at`, `deleted_at` (ISO strings where applicable).
- **GetStationInfo** – Station objects in **snake_case**; `location` as GeoJSON when selected.
- **GetSessionInfo** – archived session objects from RDS `sessions`, with ISO datetime strings in response.
- **WriteLogsRDS** – `write_logs` (batch upsert by `request_id`) and `resolveLog` (set `resolved=true`, `resolver_id`, `resolve_time` by `logId`).
- **GetLogsInfo** – `getLogs` with filters (`level`, `service`, `callerId`, `event`, `resolved`), sortable `orderBy`, and pagination (`page`, `pageSize`, max 200).
- **WriteStationPortsDynamo** – `insertStationPorts`, port updates, `deleteStationPorts` (see **`lambda_request_responces.md`**).
- **GetPortsSessionsDynamo** – supports `getSessionByUser` (`data.latest=true` for history/all states on `user_id-index`), `getSessionByStation` (sessions by station partition), and `getHealthRecord` (`data.messageId`, `data.userId`) which returns `data.health_record` only when the record has not expired (`exp_time >= now`).
- **StationEntitiesStreamConsumer** – Dynamo stream: forwards port insert/remove and free-state changes to station RDS updates, `UNPAID` transitions to payment, and `PAID` transitions to RDS session archive (details in **`lambda_request_responces.md`**).

### Maintenance cron Lambdas

- **charging-stations-check-bookings** (`rate(5 minutes)`) — queries `BOOKED` sessions whose `time_booked_before <= now` (GSI `booking-state-time-index`) and asynchronously invokes `userUpdateStationPorts` with `BOOKED -> FREE`.
- **charging-stations-charge-sim-price-calc** (`rate(1 minute)`) — queries `BOOKED` + `ACTIVE` sessions (GSI `state-station-index`), recalculates `current_cost` with shared `utils.price_calculator.calculate_price(...)`, and simulates charging progress for ACTIVE sessions (`charge_level_percent`, `energy_consumed_kwh`, remaining time, optional `stopped_at`).

### Run scripts

Run from **`lambda`** with `.env` loaded (see `lambda/.env.example`).

For `python -m tests...` commands, run from `lambda/`.  
For helper scripts in `lambda/db`, run from `lambda/db`.

**Create RDS tables (run once after deploy):**

```bash
python run_create_rds_tables.py
```

**Confirm console-created admin (first login or password change):**

```bash
python run_confirm_console_created_admin.py <username> <password> <new_password>
```

After successful confirmation, open the Cognito User Pool console and move that user to the **`ADMIN`** group manually. The confirmation flow sets password/name and signs in, but it does not assign admin group membership.

**Ports and sessions integration helpers (from `lambda/`):**

```bash
# Insert ports for a station
python -m tests.integration.write.write_ports_dynamo_invoker <station_id> <portsCount>

# Update one port state (support mode)
python -m tests.integration.write.change_port_status_lambda_inv <station_id> <port_code> <old_state> <new_state> support

# Update one port state (user mode; creates session in current implementation)
python -m tests.integration.write.change_port_status_lambda_inv <station_id> <port_code> <old_state> <new_state> user <user_id>

# Delete one port (must be DISABLED)
python -m tests.integration.write.delete_port_lambda_invoker <station_id> <port_code>

# Read ports by station
python -m tests.integration.read.get_ports_dynamo_invoker <station_id>

# Read sessions by user
python -m tests.integration.read.get_sessions_lambda_invoker <user_id>
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
| **AWS_LAMBDA_HOST_ACCOUNT** | AWS account where these Lambdas are deployed (used by invoker scripts). |
| **RDS_DB_SECRET_NAME** | Secret name used by SAM for initial RDS bootstrap credentials. |
| **CREATE_RDS_TABLES_FUNCTION_NAME** | Function name for `charging-stations-create-rds-tables`. |
| **CONFIRM_CONSOLE_CREATED_ADMIN_FUNCTION_NAME** | Function name for `charging-stations-confirm-console-created-admin`. |
| **HEALTH_FUNCTION_NAME** | Function name for `charging-stations-health`. |
| **GET_USERS_FUNCTION_NAME** | Function name for `charging-stations-get-user-info`. |
| **GET_STATIONS_FUNCTION_NAME** | Function name for `charging-stations-get-station-info`. |
| **WRITE_STATION_FUNCTION_NAME** | Function name for `charging-stations-write-station-rds`. |
| **WRITE_PORTS_FUNCTION_NAME** | Function name for `charging-stations-write-station-ports-dynamo`. |
| **GET_PORTS_SESSIONS_FUNCTION_NAME** | Function name for `charging-stations-get-ports-sessions-dynamo`. |
| **SES_FROM_EMAIL** | Verified SES sender email used by `charging-stations-payment-notification`. |


---

## Audit logging (CloudWatch)

Lambdas use **`log_audit`** (from `utils.logger` in the common layer) to emit JSON audit payloads (for example `level`, `message`, `status`, `event`, `service`, `caller_id`, `request_id`).

In CloudWatch, many Python Lambda logs are stored as a prefixed message:

`[INFO|ERROR|...]\t<ISO timestamp>\t<request-id>\t{...json...}`

The subscription processor (`charging-stations-log-subscription-processor`) is expected to parse this shape by extracting:

1. Prefix timestamp/request id
2. JSON body starting at the first `{`

then writing normalized records through `charging-stations-write-logs-rds`.

- **Main app log group (subscription source):** `/charging-stations/${AWS::StackName}/lambda/application`
- **Processor log group (target function logs):** `/charging-stations/${AWS::StackName}/lambda/application/audit`
- **Query:** CloudWatch → Logs → Logs Insights; filter by `event`, `status`, `service`, `request_id`.
- **Log level:** Optional `LOGGER_LEVEL` per function in the template (`Environment.Variables.LOGGER_LEVEL`, e.g. `INFO` or `DEBUG`).

---

## Adding new Lambdas

Add the function resource and any `AWS::Lambda::Permission` (e.g. for cross-account or Cognito) in **`lambda/template.yaml`**. Use the same pattern as existing functions: `CodeUri`, `Handler`, `Layers`, `VpcConfig` for DB Lambdas, env vars, and IAM policies.
