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

## `API_PREFIX` and `/health`

In `backend/src/app.ts`, health routes are mounted **both without a prefix and with the prefix**:

- without prefix: `GET /health`, `GET /health/api`, `GET /health/secured-lambda`
- with prefix (if `API_PREFIX` is set, e.g. `/api/v1`): `GET /api/v1/health`, ...

## Environment variables

See `backend/.env.example`.

Key ones:

- **Server**: `PORT`, `API_PREFIX`, `CORS_ORIGIN`
- **AWS/Lambda**: `AWS_REGION`, `HEALTH_LAMBDA_FUNCTION_NAME`, `USER_INFO_LAMBDA_FUNCTION_NAME`, `USER_MANAGEMENT_LAMBDA_FUNCTION_NAME`, `STATIONS_LAMBDA_FUNCTION_NAME`, `STATIONS_LAMBDA_WRITE_FUNCTION_NAME`, `STATIONS_PORTS_READ_LAMBDA_FUNCTION_NAME`, `STATIONS_PORTS_WRITE_LAMBDA_FUNCTION_NAME`
- **Auth (Cognito)**: `AUTH_DISABLED`, `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`

## Auth and roles

- JWT middleware: `backend/src/middlewares/auth.ts` (`verifyCognitoJwt`, `requireGroups`)
- Roles (Cognito groups): `backend/src/common/authRoles.ts` (`ADMIN_GROUP`, `SUPPORT_GROUP`, ...)
- You can disable auth locally: `AUTH_DISABLED=true` (a local user with `sub=local-user` will be injected into `req.user`)

## Endpoints (based on `src/modules/**`)

Below are the main public paths. If `API_PREFIX` is set, it is added to all routes (except `/health*`, which are available both with and without the prefix).

### Health

- `GET /health` → `200 { "status": "ok" }`
- `GET /health/api` → invokes the health Lambda, HTTP status = `result.code`, body = `result`
- `GET /health/secured-lambda` → JWT required, writes structured logs, body:
  - `{ "success": boolean, "user": { "sub": string }, "lambda": { ... } }`

Examples:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/api
curl http://localhost:8000/health/secured-lambda -H "Authorization: Bearer <ACCESS_TOKEN>"
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
