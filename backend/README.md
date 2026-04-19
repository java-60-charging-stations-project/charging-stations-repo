# Charging Stations Backend (Express + TypeScript)

Backend is an **Express + TypeScript** service that acts as a thin API gateway: it receives HTTP requests, performs validation/auth, and (when needed) invokes **AWS Lambda**.

## Local run

Requirements: **Node.js 18+**.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default: `http://localhost:8000`.

## Scripts

See `backend/package.json`:

- `npm run dev` — dev mode (ts-node-dev)
- `npm run build` — build to `dist/`
- `npm start` — run `dist/server.js`
- `npm run lint`
- `npm run valkey:smoke` — optional check that Valkey/Redis cache env is wired (requires `VALKEY_*`; see `.env.example`)

## `API_PREFIX` and `/health`

In `backend/src/app.ts`, health route is mounted **both without a prefix and with the prefix**:

- without prefix: `GET /health`
- with prefix (if `API_PREFIX` is set, e.g. `/api/v1`): `GET /api/v1/health`

Health is Lambda-backed only (`invokeHealthLambda`), local static health responses were removed.

## Environment variables

See `backend/.env.example`.

Key ones:

- **Server**: `PORT`, `API_PREFIX`, `CORS_ORIGIN`
- **Runtime**: `ENVIRONMENT`, `LOG_LEVEL`
- **AWS/Lambda gateway**: `AWS_REGION`, `USE_LAMBDA` — when `true`, modules that support it call Lambdas instead of local stubs where a function name is configured
- **Lambda ARNs/names**: `HEALTH_LAMBDA_FUNCTION_NAME`, `USER_INFO_LAMBDA_FUNCTION_NAME`, `USER_MANAGEMENT_LAMBDA_FUNCTION_NAME`, `STATIONS_LAMBDA_FUNCTION_NAME`, `STATIONS_LAMBDA_WRITE_FUNCTION_NAME`, `STATIONS_PORTS_READ_LAMBDA_FUNCTION_NAME`, `STATIONS_PORTS_WRITE_LAMBDA_FUNCTION_NAME`, `SESSIONS_READ_LAMBDA_FUNCTION_NAME`, **`LOGS_READ_LAMBDA_FUNCTION_NAME`**, **`LOGS_WRITE_LAMBDA_FUNCTION_NAME`** (RDS logs list `getLogs` / resolve `resolveLog` when `USE_LAMBDA=true`; defaults match `charging-stations-read-logs-rds` / `charging-stations-write-logs-rds`)
- **Auth (Cognito)**: `AUTH_DISABLED`, `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
- **Valkey / Redis-compatible cache** (optional): `VALKEY_ENABLED`, `VALKEY_URL` or host/port/password, `VALKEY_TLS`, `VALKEY_KEY_PREFIX`, … — see `backend/.env.example`

All keys are documented with examples in **`backend/.env.example`**.

## Auth and roles

- JWT middleware: `backend/src/middlewares/auth.ts` (`verifyCognitoJwt`, `requireGroups`)
- Roles (Cognito groups): `backend/src/common/authRoles.ts` (`ADMIN_GROUP`, `SUPPORT_GROUP`, ...)
- You can disable auth locally: `AUTH_DISABLED=true` (a local user with `sub=local-user` will be injected into `req.user`)

## Endpoints (based on `src/modules/**`)

Below are the main public paths. If `API_PREFIX` is set, it is added to all routes (except `/health*`, which are available both with and without the prefix).

### Health

- `GET /health` → invokes health Lambda, HTTP status = `result.code`, body = `result`

Example:

```bash
curl http://localhost:8000/health
```

### Auth config (for frontend)

- `GET /auth/config`

### Users

JWT is required for `/me`, `/users/*`, `/admin/users/*` (see `users.routes.ts`).

- `GET /me` (same as `/users/me`)
- `GET /users/me`
- `PATCH /users/me/profile`

Admin-only (`ADMIN` group):

- `GET /admin/users`
- `GET /admin/users/:userId`
- `PATCH /admin/users/:userId/role`
- `PATCH /admin/users/:userId/enable`
- `PATCH /admin/users/:userId/disable`
- `DELETE /admin/users/:userId`

Lambda split (see `config/env.ts`):

- reads (`GET /admin/users`, `GET /admin/users/:userId`) → `USER_INFO_LAMBDA_FUNCTION_NAME`
- mutations (`role/enable/disable/delete/...`) → `USER_MANAGEMENT_LAMBDA_FUNCTION_NAME`

### Stations

Public:

- `GET /stations`

JWT required:

- `GET /stations/:stationId`
- `GET /stations/:stationId/ports`

User catalog (JWT, no group requirement; duplicates `/stations`):

- `GET /user/stations`
- `GET /user/stations/:stationId`
- `GET /user/stations/:stationId/ports`

Support (JWT + `SUPPORT` group):

- `GET /support/stations`
- `GET /support/stations/:stationId`
- `PATCH /support/stations/:stationId` — partial update of station fields (same body as `PATCH /admin/stations/:stationId`; invokes stations write Lambda `updateStation`)
- `GET /support/stations/:stationId/ports`
- `POST /support/stations/:stationId/ports`
- `DELETE /support/stations/:stationId/ports/:portId`
- `PATCH /support/stations/:stationId/state` — station lifecycle (`INACTIVE` / `ACTIVE` / `OUT_OF_SERVICE`), same contract as admin
- `PATCH /support/stations/:stationId/ports/state` — change a **port’s** Dynamo state via Lambda `supportUpdateStationPorts` (optimistic: `oldState` must match the row). Typical: enable a new port `DISABLED` → `FREE`, or take offline `FREE` → `DISABLED`. Body:
  - `{ "portCode": "PORT-A1", "oldState": "DISABLED", "newState": "FREE" }`
  - `oldState`: `FREE` | `OCCUPIED` | `ERROR` | `DISABLED` | `BOOKED`; `newState`: `FREE` | `DISABLED` (forbidden on API: `BOOKED` → `FREE`, `OCCUPIED` → `FREE`; aligns with `lambda/db/write/write_ports_sessions_dynamo.py`)
- `PATCH /support/stations/:stationId/ports` — body `{ "deltaPorts": <positive int> }`; updates RDS port counters via `update_station_ports` (not the same as per-port state above)

Admin (JWT + `ADMIN` group):

- `GET /admin/stations`
- `GET /admin/stations/:stationId`
- `GET /admin/stations/:stationId/ports`
- `POST /admin/stations`
- `PATCH /admin/stations/:stationId`
- `PATCH /admin/stations/:stationId/state`
- `PATCH /admin/stations/:stationId/ports`
- `DELETE /admin/stations/:stationId`

### Bookings (JWT required)

Router is mounted at `/bookings` (see `bookings.routes.ts`):

- `GET /bookings` — list bookings for the current user
- `POST /bookings` — create a booking
- `GET /bookings/:bookingId` — get a booking (only your own, otherwise 404)
- `DELETE /bookings/:bookingId` — cancel a booking (only your own, otherwise 404)

Body for `POST /bookings`:

```json
{
  "stationId": "st-001",
  "slotFrom": "2026-02-23T10:00:00Z",
  "slotTo": "2026-02-23T11:00:00Z"
}
```

### Sessions (JWT required)

Router is mounted at `/sessions` (see `sessions.routes.ts`).

Admin/Support:

- `GET /sessions/all` — `ADMIN` or `SUPPORT` only

User port operations (body is validated; `oldState` matters):

- `GET /sessions/user` — sessions for the current user (Dynamo via userSessions service)
- `GET /sessions/user?latest=true|false|1|0` — same endpoint with scope control:
  - omitted / `false` / `0` → active/current sessions
  - `true` / `1` → full Dynamo history for target user
- `GET /sessions/user/history` — paginated history from RDS Lambda (`getSessions`) with filters:
  - query: `userId`, `date_from`, `date_to`, `sessionId`, `stationId`, `state`, `orderBy`, `page`, `pageSize`
- `POST /sessions/user/booking` — book a port, body:
  - `{ "stationId": "...", "portCode": "...", "oldState": "FREE" }`
- `POST /sessions/user/booking/stop` — stop booking, body:
  - `{ "stationId": "...", "portCode": "...", "oldState": "BOOKED" }`
- `POST /sessions/user/charging` — start charging, body:
  - `{ "stationId": "...", "portCode": "...", "oldState": "FREE" | "BOOKED" }`
- `POST /sessions/user/charging/stop` — stop charging, body:
  - `{ "stationId": "...", "portCode": "...", "oldState": "OCCUPIED" }`

Sessions (role-shaped responses for `USER` / `SUPPORT` / `ADMIN`):

- `GET /sessions?userId=...` — `USER` can only use own `userId` (must match `sub`), staff can use any
- `GET /sessions/:sessionId` — `USER` only own, staff any
- `POST /sessions` — start session, body: `{ "stationId": "...", "portId": "..." }`
- `POST /sessions/:sessionId/stop`

Support helper:

- `GET /sessions/support/sessions-current?userId=...` or `?stationId=...`
  - exactly one of the parameters is required

### Logs (JWT required)

Router is mounted at `/logs` (see `logs.routes.ts`).

- `GET /logs/support` — log list for support audience (`SUPPORT` role)
- `GET /logs/admin` — log list for admin audience (`ADMIN` role)

Query parameters for both list endpoints:

- **`page`** (default `1`), **`pageSize`** (default `50`, max `200`)
- **`date_from`**, **`date_to`** — optional ISO datetime (with offset); inclusive bounds on **`timestamp`**. Passed to in-memory listing when **`USE_LAMBDA=false`**; forwarded as **`dateFrom`** / **`dateTo`** to RDS Lambda **`getLogs`** when **`USE_LAMBDA=true`** (`lambda/db/read/get_logs_info.py`).
- **`level`**, **`service`** (substring, case-insensitive), **`caller_id`** (exact match on stored `caller_id`), **`event`** (substring), **`resolved`** (`true` / `false`), **`order_by`** — forwarded to **`getLogs`** when **`USE_LAMBDA=true`** (see `lambda/db/read/get_logs_info.py`).

Successful list response shape: **`{ data: { logs }, meta }`** where **`meta`** follows **`PaginationMeta`** (`page`, `pageSize`, `totalItems`, `totalPages`). See **`specification.yaml`** (`CollectorLogCollectionApiResponse`).

With **`USE_LAMBDA=true`**, list invokes **`LOGS_READ_LAMBDA_FUNCTION_NAME`** (default `…:function:charging-stations-read-logs-rds`) and resolve invokes **`LOGS_WRITE_LAMBDA_FUNCTION_NAME`** (default `…:function:charging-stations-write-logs-rds`). Resolve uses Lambda action **`resolveLog`**; the write Lambda sets **`resolve_time`** to the current UTC time (the HTTP **`resolve_time`** body field is still required for validation but is ignored on the Lambda path).

- `POST /logs/support/:log_id` — resolve support log
- `POST /logs/admin/:log_id` — resolve admin log

Resolve body:

```json
{
  "resolve_time": "2026-04-17T10:15:00.000Z"
}
```

Successful resolve response: **`{ data: { logId, resolverId, resolveTime } }`** (ISO **`resolveTime`** from Lambda).

With **`USE_LAMBDA=false`**, list/resolve use an in-memory store (empty unless populated elsewhere); resolve returns the same **`logId` / `resolverId` / `resolveTime`** shape using the body timestamp.

### Logging / collector hints

Structured logs use **`createLogger`** (`backend/src/utils/logger.ts`). Fatal-path and error responses can emit **`CollectorErrorLog`** JSON for downstream collectors (**`backend/src/common/logContracts.ts`**). Errors that originate from a Lambda invoke carry **`collectorSource`** (function name/ARN) so collectors can dedupe against Lambda-native logs (**`LAMBDA_TRANSPORT_ERROR`** / **`LAMBDA_RESPONSE_ERROR`** events in **`errorHandler`**).

## Valkey / Redis-compatible cache

The backend uses **`ioredis`** against any Redis-compatible endpoint (local Valkey, Redis, AWS ElastiCache for Valkey). **Browsers never connect to Valkey** — only the Node process does. The frontend keeps calling your REST API; responses may be faster if services use **`cacheGet` / `cacheSet`** from **`src/cache`**.

### 1. Configure environment (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| **`VALKEY_ENABLED`** | **`true`** to enable the client; **`false`** skips Valkey entirely (recommended when no server is running). |
| **`VALKEY_URL`** | Single connection URL. For AWS TLS: **`rediss://...`** (often includes auth token). If set, host/port/password below are ignored. |
| **`VALKEY_HOST`** / **`VALKEY_PORT`** | Alternative to URL for host/port mode (local Docker). Default port **6379**. |
| **`VALKEY_TLS`** | **`true`** with **`VALKEY_HOST`** when the server expects TLS (e.g. some cloud endpoints). Prefer **`VALKEY_URL=rediss://`** for ElastiCache. |
| **`VALKEY_PASSWORD`**, **`VALKEY_USERNAME`** | Auth when required by the endpoint. |
| **`VALKEY_KEY_PREFIX`** | Namespace prefix for keys (default **`charging:`**). |
| **`VALKEY_CONNECT_TIMEOUT_MS`** | TCP connect timeout (default **10000**). |

Missing **`VALKEY_URL`** and **`VALKEY_HOST`** while **`VALKEY_ENABLED=true`** produces a warning and **no client** — cache helpers no-op safely.

See **`backend/.env.example`** for a commented template.

### 2. Run Valkey locally (Docker)

1. Start **Docker Desktop** on Windows/macOS (wait until it is fully running).
2. Run an Valkey container (Redis protocol on **6379**):

```bash
docker run -d --name valkey-local -p 6379:6379 valkey/valkey:8
```

3. In **`backend/.env`** set:

```env
VALKEY_ENABLED=true
VALKEY_HOST=127.0.0.1
VALKEY_PORT=6379
VALKEY_TLS=false
```

### 3. Verify connectivity (smoke test)

From **`backend`**:

```bash
npm run valkey:smoke
```

Expect **`READ ok:`** and **`done.`**. Each operation times out after **15s** if nothing listens (so the script does not hang forever).

If you see **`ECONNREFUSED`**: nothing is listening on **`VALKEY_HOST`:`VALKEY_PORT`** — start Docker Valkey or fix host/port.

If **`VALKEY_ENABLED is not true`**: set **`VALKEY_ENABLED=true`** in **`backend/.env`** (loaded automatically when you run npm from **`backend`**).

### 4. Production (AWS ElastiCache for Valkey)

1. Create a Valkey replication group **in the same VPC** as the ECS tasks (or reachable subnets).
2. Security group for the cluster: **inbound TCP 6379** (or your port) **only from the ECS task security group** (not `0.0.0.0/0`).
3. Provide the primary endpoint to the task as **`VALKEY_URL`**, typically **`rediss://`** with TLS. Use Secrets Manager / SSM for the URL or password, inject into the task definition env.
4. ECS task instances must resolve and route to ElastiCache (same VPC / private subnets).

### 5. Using cache in application code

Infrastructure alone does not cache HTTP responses until you call the helpers. Example pattern:

```ts
import { cacheGetJson, cacheSetJson } from '../cache';

const key = `stations:list:${city ?? 'all'}`;
const cached = await cacheGetJson<MyDto>(key);
if (cached) return cached;
const fresh = await fetchFromLambdaOrDb();
await cacheSetJson(key, fresh, 60); // TTL seconds
return fresh;
```

Paths should match your module layout (**`../../cache`** etc.). Today, only **`scripts/valkey-smoke.ts`** uses these helpers unless you add calls in services/controllers.

Graceful shutdown closes the Valkey socket in **`server.ts`** (**`closeValkey`**).

## Deployment (ECS Fargate + SAM)

In this repo:

- `backend/Dockerfile`
- `backend/template.yaml` (ECS Fargate + ALB)
- `backend/samconfig.toml`

Minimal:

```bash
cd backend
sam build
sam deploy
```
