# Charging Stations Backend (Express Gateway)

This backend is an **Express (Node.js + TypeScript)** service intended to run on **ECS Fargate**.

It acts as a **thin gateway**:
- receives HTTP requests from the Frontend
- verifies **AWS Cognito JWT** (optional in local dev)
- (optionally) calls **Python AWS Lambda** for business-logic
- returns responses using agreed API contracts

## Architecture

```mermaid
flowchart LR
  FE[Frontend] -->|HTTP| GW[Express Gateway (ECS Fargate)]

  subgraph GW[Express Gateway]
    R[Routes] --> C[Controllers]
    C --> S[Services]
    S -->|optional| L[AWS Lambda (Python)]
  end

  L --> DDB[(DynamoDB)]
  L --> SNS[(SNS Topics)]
  GW --> CW[(CloudWatch Logs)]
  L --> CW

  FE -. auth .-> COG[AWS Cognito]
```

## Local Run

Requirements: Node.js 18+.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default port: `8000`

### Health check

Frontend currently calls `GET /health`.

```bash
curl http://localhost:8000/health
```

Response contract:

```json
{ "code": 200, "status": "running" }
```

## Environment Variables

See `.env.example`.

Key variables:
- `PORT` (default `8000`)
- `API_PREFIX` (optional, e.g. `/api/v1`)
- `CORS_ORIGIN`

### Health Lambda (optional)
- `USE_LAMBDA=false|true`
- `AWS_REGION`
- `HEALTH_LAMBDA_FUNCTION_NAME`

### Cognito Auth
- `AUTH_DISABLED=true|false` (recommended `true` locally)
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`

## API Endpoints

> **Note:** only `/health` is required by the current frontend.
> Other endpoints are a **skeleton** (router/controller/service) and can be replaced with Lambda-backed implementations.

### Health

- `GET /health` (also available as `${API_PREFIX}/health` if `API_PREFIX` is set)

Response:
```json
{ "code": 200, "status": "running" }
```

### Auth

- `GET /auth/config`

Response:
```json
{
  "code": 200,
  "data": {
    "region": "il-central-1",
    "userPoolId": "...",
    "clientId": "..."
  }
}
```

### Users

- `GET /users/me` (JWT required unless `AUTH_DISABLED=true`)

Response:
```json
{
  "code": 200,
  "data": {
    "userId": "...",
    "email": "...",
    "username": "...",
    "groups": []
  }
}
```

### Stations (skeleton)

- `GET /stations`

Response:
```json
{ "code": 200, "data": [ { "stationId": "st-001", "name": "..." } ] }
```

- `GET /stations/:stationId`

Response:
```json
{ "code": 200, "data": { "stationId": "st-001", "name": "..." } }
```

### Bookings (skeleton)

- `GET /bookings` (JWT required)

Response:
```json
{ "code": 200, "data": [ { "bookingId": "bk-...", "status": "created" } ] }
```

- `POST /bookings` (JWT required)

Request:
```json
{ "stationId": "st-001", "slotFrom": "2026-02-23T10:00:00Z", "slotTo": "2026-02-23T11:00:00Z" }
```

Response:
```json
{ "code": 201, "data": { "bookingId": "bk-...", "status": "created" } }
```

- `DELETE /bookings/:bookingId` (JWT required)

Response:
```json
{ "code": 200, "data": { "bookingId": "bk-...", "status": "cancelled" } }
```

## ECS Fargate Deployment Notes

Minimal steps (high level):
1. Build & push Docker image to **ECR**.
2. Create an ECS **Task Definition** with env vars.
3. Create an ECS **Service** (Fargate) behind an **ALB**.
4. Configure ALB health check path to `/health`.

This repository includes a production Dockerfile: `backend/Dockerfile`.

## CloudWatch Logs

- ECS task logs should be routed to a log group (configured in Task Definition).
- Lambda logs go to CloudWatch by default.