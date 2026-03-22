# Charging Stations - Lambda Request/Response Formats

This document describes the JSON **shape** of the payloads sent to (and returned by) the Lambda handlers.

## Naming convention (frontend / backend ↔ Lambdas)

| Direction | JSON keys |
|-----------|-----------|
| **Requests** (from frontend or backend into Lambdas) | **camelCase** (e.g. `callerId`, `stationId`, `userId`, `siteTechnician`, `ratePlan`) |
| **Successful responses** (`data`, and nested objects from RDS/Dynamo) | **snake_case** (e.g. `station_id`, `created_at`, `rate_plan`, `max_power_kw`) |

Nested JSON stored as-is in the DB (e.g. inside `rate_plan`) may still contain camelCase **keys** inside the blob depending on how it was written; **top-level response fields** follow **snake_case** as returned by the handlers.

**Internal** payloads (e.g. **SQS** message bodies between Lambdas) may use **snake_case** keys and are not part of the frontend HTTP contract.

## Global Success Response

Most Lambdas return this shape on success:

```json
{
  "data": {}
}
```

`data` may also be a list (e.g. `{"data":[ ... ]}`) depending on the handler.

## Global Error Response

On error, Lambdas return:

```json
{
  "error": "Human readable message",
  "code": "UNHANDLED_ERROR | ALREADY_EXISTS | NOT_FOUND | UNAUTHORIZED | INVALID_REQUEST | CONSTRAINT_VIOLATION | DATABASE_ERROR | INVALID_STATE | QUEUE_ERROR"
}
```

`QUEUE_ERROR` is returned when a **post-write** step fails (e.g. enqueueing the **SQS** message that syncs port counts to RDS from `charging-stations-write-station-ports-dynamo`).

## Users - `charging-stations-get-user-info`

### Get all users

Request:

```json
{
  "service": { "action": "getAllUsers", "callerId": "string" }
}
```

Response (success):

```json
{
  "data": [
    {
      "user_id": "uuid",
      "full_name": "string",
      "email": "string",
      "phone": "string|null",
      "role": "USER|ADMIN|SUPPORT",
      "status": "ACTIVE|BANNED|DISABLED",
      "created_at": "ISO-8601-string",
      "updated_at": "ISO-8601-string"
    }
  ]
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|INVALID_REQUEST|DATABASE_ERROR|..."
}
```

### Get user by id

Request:

```json
{
  "service": {
    "action": "getUserById",
    "callerId": "string"
  },
  "data": {
    "userId": "string"
  }
}
```

Response (success):

```json
{
  "data": {
    "user_id": "string",
    "full_name": "string",
    "email": "string",
    "phone": "string|null",
    "role": "USER|ADMIN|SUPPORT",
    "status": "ACTIVE|BANNED|DISABLED",
    "created_at": "ISO-8601-string",
    "updated_at": "ISO-8601-string"
  }
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|UNAUTHORIZED|INVALID_REQUEST|..."
}
```

## Stations (RDS) - `charging-stations-get-station-info`

**Read responses (`getAllStations`, `getStationById`):** objects follow **snake_case** (PostgreSQL column names). `location` is returned as GeoJSON.

### Write station (RDS) - `charging-stations-write-station-rds`

This Lambda is **action-based**; it expects `event.service.action`.

For newly created stations state is always `"INACTIVE"`

Request:

```json
{
  "service": { "action": "writeStation", "callerId": "string" },
  "data": {
    "code": "string",
    "name": "string",
    "owner": "string",
    "city": "string",
    "address": "string",
    "email": null,
    "phone": null,
    "siteTechnician": null,
    "ratePlan": {
      "currencyCode": "ILS",
      "currencyName": "Israeli Shekel",
      "peakRate": 2.14,
      "offPeakRate": 1.47
    },
    "location": { "longitude": 34.7818, "latitude": 32.0853 },
    "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE",
    "maxPowerKw": 0.0,
    "ports": 0
  }
}
```

Response (success):

```json
{
  "data": { "station_id": "station-uuid" }
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "ALREADY_EXISTS|INVALID_REQUEST|DATABASE_ERROR|..."
}
```

### Get all stations

Optional filters and pagination are passed in **`meta`** (camelCase keys).

Request:

```json
{
  "service": { "action": "getAllStations", "callerId": "string" },
  "meta": {
    "city": "string|null",
    "owner": "string|null",
    "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE|DELETED",
    "page": 1,
    "pageSize": 20
  }
}
```

Response (success):

```json
{
  "data": [
    {
      "id": "station-uuid",
      "code": "string",
      "name": "string",
      "owner": "string",
      "city": "string",
      "address": "string",
      "email": "string|null",
      "site_technician": "string|null",
      "max_power_kw": 0.0,
      "ports": 0,
      "rate_plan": {
        "currencyCode": "string",
        "currencyName": "string",
        "peakRate": 0.0,
        "offPeakRate": 0.0
      },
      "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE|DELETED",
      "has_free_ports": true,
      "location": { "type": "Point", "coordinates": [34.7852, 32.0933] },
      "created_at": "ISO-8601-string",
      "updated_at": "ISO-8601-string"
    }
  ],
  "meta": {
    "total_items": 100,
    "total_pages": 5,
    "page": 1,
    "page_size": 20
  }
}
```

`meta` shape matches your handler when present; omit `meta` if your stack returns a plain list only.

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|DATABASE_ERROR|..."
}
```

### Get station by id

Request:

```json
{
  "service": {
    "action": "getStationById",
    "callerId": "string"
  },
  "data": {
    "stationId": "station-uuid"
  }
}
```

Response (success):

```json
{
  "data": {
    "id": "station-uuid",
    "code": "string",
    "name": "string",
    "owner": "string",
    "city": "string",
    "address": "string",
    "email": "string|null",
    "site_technician": "string|null",
    "max_power_kw": 0.0,
    "ports": 0,
    "rate_plan": {
      "currencyCode": "string",
      "currencyName": "string",
      "peakRate": 0.0,
      "offPeakRate": 0.0
    },
    "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE|DELETED",
    "has_free_ports": false,
    "location": { "type": "Point", "coordinates": [34.7854, 32.0946] },
    "created_at": "ISO-8601-string",
    "updated_at": "ISO-8601-string"
  }
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|INVALID_REQUEST|..."
}
```

### Change station state (optimistic update)

Request:

```json
{
  "service": { "action": "changeStationState", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "oldState": "ACTIVE|INACTIVE|OUT_OF_SERVICE",
    "newState": "ACTIVE|INACTIVE|OUT_OF_SERVICE"
  }
}
```

Response (success):

```json
{
  "data": { "updated_at": "ISO-8601-string" }
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|INVALID_STATE|INVALID_REQUEST|DATABASE_ERROR|..."
}
```

### Delete station (soft delete)

Request:

```json
{
  "service": { "action": "deleteStation", "callerId": "string" },
  "data": { "stationId": "station-uuid" }
}
```

Response (success):

```json
{
  "data": { "deleted_at": "ISO-8601-string" }
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|INVALID_REQUEST|CONSTRAINT_VIOLATION|DATABASE_ERROR|..."
}
```

## Station ports (DynamoDB single-table) - `charging-stations-write-station-ports-dynamo`

### Insert station ports

**Table:** `STATIONS_DYNAMO_TABLE` (e.g. `charging-stations-station-entities` from the SAM stack).

Key design:

- **Partition key:** `station_id`
- **Sort key:** `entity_key`
- Each port row uses `entity_key = "PORT#<uuid>"` (full sort-key value is returned in the success payload).

The item also stores the frontend port identifier as attribute `code`. New ports are created with `state: "DISABLED"`.

After a successful Dynamo write, the Lambda **enqueues an SQS message** (when `SYNC_RDS_QUEUE_URL` is set) so a consumer can run `UPDATE stations SET ports = ports + …` in RDS. The message body is JSON with fields such as `action`, `station_id`, `ports_delta`, `caller_id`, `correlation_id`.

Request:

```json
{
  "service": { "action": "insertStationPorts", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "ports": [
      {
        "code": "PORT-CODE-FROM-FRONTEND",
        "power": 22.0,
        "lastMeterKw": 0.0
      }
    ]
  }
}
```

Response (success):

```json
{
  "data": {
    "created_port_keys": ["PORT#<uuid>", "PORT#<uuid>"]
  }
}
```

`created_port_keys` values are the DynamoDB **sort key** strings (`entity_key`), suitable for deletes or follow-up APIs.

Response (error):

```json
{
  "error": "Human readable message",
  "code": "INVALID_REQUEST|DATABASE_ERROR|QUEUE_ERROR|UNHANDLED_ERROR|..."
}
```

`QUEUE_ERROR` means Dynamo writes succeeded but **SQS enqueue** for the RDS port-count sync failed.
