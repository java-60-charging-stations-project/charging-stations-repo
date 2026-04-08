# Charging Stations - Lambda Request/Response Formats

This document describes the JSON **shape** of the payloads sent to (and returned by) the Lambda handlers.

## Naming convention (frontend / backend ↔ Lambdas)

**Requests** (from frontend or backend into Lambdas) - **camelCase** (e.g. `callerId`, `stationId`, `userId`, `siteTechnician`, `ratePlan`)  

**Successful responses** (`data`, and nested objects from RDS/Dynamo) - **snake_case** (e.g. `station_id`, `created_at`, `rate_plan`, `max_power_kw`)  

Nested JSON stored as-is in the DB (e.g. inside `rate_plan`) may still contain camelCase **keys** inside the blob depending on how it was written; **top-level response fields** follow **snake_case** as returned by the handlers.

**Internal** payloads (e.g. Dynamo stream-consumer payloads between Lambdas) may use **snake_case** keys and are not part of the frontend HTTP contract.

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
  "code": "UNHANDLED_ERROR | ALREADY_EXISTS | NOT_FOUND | UNAUTHORIZED | INVALID_REQUEST | CONSTRAINT_VIOLATION | DATABASE_ERROR | INVALID_STATE"
}
```

## Users

### Get all users

Lambda: `charging-stations-get-user-info`  
Action: `getAllUsers`

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
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp",
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

Lambda: `charging-stations-get-user-info`  
Action: `getUserById`

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
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
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

## Stations (RDS)

**Read responses (`getAllStations`, `getStationById`):** objects follow **snake_case** (PostgreSQL column names). `location` is returned as GeoJSON.

### Write station

Lambda: `charging-stations-write-station-rds`  
Action: `writeStation`

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

### Update station (partial RDS update)

Lambda: `charging-stations-write-station-rds`  
Action: `updateStation`

Updates only fields present in `data`. Omit fields you are not changing.

- **`stationId`** (required): target station UUID.
- **`ratePlan`** (optional): object with `currencyCode`, `currencyName`, `peakRate`, `offPeakRate` — stored as JSONB (`rate_plan`). If provided, `peakRate` and `offPeakRate` are required inside the object.
- **`location`** (optional): `{ "longitude": number, "latitude": number }`. When **both** are present, RDS `location` (PostGIS geography) is set via `ST_MakePoint(longitude, latitude)` in SRID 4326. Omit `location` to leave coordinates unchanged.
- Other optional fields: `name`, `owner`, `city`, `address`, `email`, `phone`, `siteTechnician`, `maxPowerKw` (maps to `site_technician`, `max_power_kw` in RDS).

Request example:

```json
{
  "service": { "action": "updateStation", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "name": "string",
    "owner": "string",
    "city": "string",
    "address": "string",
    "email": "string",
    "phone": "string",
    "siteTechnician": "string",
    "maxPowerKw": 22.0,
    "ratePlan": {
      "currencyCode": "ILS",
      "currencyName": "Israeli Shekel",
      "peakRate": 2.25,
      "offPeakRate": 1.55
    },
    "location": { "longitude": 34.7818, "latitude": 32.0853 }
  }
}
```

Response (success): `data` is a map of updated attributes (snake_case column names). `updated_at` is ISO formatted. If `location` was updated, the response includes a `location` object with `longitude` and `latitude` (not GeoJSON).

```json
{
  "data": {
    "station attributes updated": {
      "name": "string",
      "owner": "string",
      "city": "string",
      "address": "string",
      "email": "string",
      "phone": "string",
      "siteTechnician": "string",
      "maxPowerKw": 22.0,
      "ratePlan": {
        "currencyCode": "ILS",
        "currencyName": "Israeli Shekel",
        "peakRate": 2.25,
        "offPeakRate": 1.55
    },
      "location": { "longitude": 34.7818, "latitude": 32.0853 }
    }
  }
}
```

Response (error): same error envelope as other write-station actions (`INVALID_REQUEST`, `DATABASE_ERROR`, etc.).

### Get all stations

Lambda: `charging-stations-get-station-info`  
Action: `getAllStations`

Optional filters and pagination are passed in `**meta**` (camelCase keys).

Request:

```json
{
  "service": { "action": "getAllStations", "callerId": "string" },
  "data" : {
    "city": "string|null",
    "owner": "string|null",
    "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE|DELETED",
    "orderBy" : "city+,name-|..."
  },
  "meta": {
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
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp"
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

Lambda: `charging-stations-get-station-info`  
Action: `getStationById`

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
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
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

Lambda: `charging-stations-write-station-rds`  
Action: `changeStationState`

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
  "data": { "updated_at": "ISO timestamp" }
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

Lambda: `charging-stations-write-station-rds`  
Action: `deleteStation`

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
  "data": { "deleted_at": "ISO timestamp" }
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "NOT_FOUND|INVALID_REQUEST|CONSTRAINT_VIOLATION|DATABASE_ERROR|..."
}
```

## Station ports (DynamoDB single-table)

**Table:** `STATIONS_DYNAMO_TABLE` (e.g. `charging-stations-station-entities` from the SAM stack).

Key design:

- **Partition key:** `station_id`
- **Sort key:** `entity_key`
- **Port rows:** `entity_key = "PORT#<code>"`, initial `state: "DISABLED"`, plus `port_id`, `last_meter_kw`, `state` (required for GSI), timestamps.
- **Session rows:** `entity_key = "PORT#<code>#SESSION#<session_id>"` (same station partition key as the port).
- **Session lock row (user-wide):** one item per user so they cannot start two sessions at once. Uses the same attribute names as the table (`station_id`, `entity_key`) but **`station_id` is set to the user id** (not the station uuid) and **`entity_key` = `SESSION_LOCK`**. That key is global per user across all stations.
- **GSI `state-station-index`:** partition key `state`, sort key `station_id` — query `state = FREE` + `station_id` for “any free port on this station” and for hourly RDS reconciliation.

---

## Write — `charging-stations-write-station-ports-dynamo`

Action-based handler: `event.service.action` and `event.service.callerId`. Success responses include `"meta": {}` where applicable.

**Environment (deploy):** this function needs `GET_PORTS_SESSIONS_FUNCTION_NAME` set to the deployed name of `charging-stations-get-ports-sessions-dynamo`, plus IAM permission to invoke it, so user flows that load an existing session (e.g. `BOOKED` → `OCCUPIED`, release to `FREE`) can call `getSessionByUser` internally.

### `insertStationPorts`

Lambda: `charging-stations-write-station-ports-dynamo`  
Action: `insertStationPorts`

Inserts one or more ports using **DynamoDB `TransactWriteItems`**: either **all** `Put` operations in the request commit, or **none** (no partial insert for that invoke). AWS allows at most **25** items per transaction; this stack assumes a single station does not exceed that in one request.

**Validation:**

- Each port object must include `code`.
- The same `code` twice in one `ports` array returns `INVALID_REQUEST` with `duplicate port code in request: <code>`.
- Empty `ports` → success with `created_ports: []`.

Request:

```json
{
  "service": { "action": "insertStationPorts", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "ports": [
      { "code": "A1"},
      { "code": "A2"}
    ]
  }
}
```

Response (success):

```json
{
  "data": {
    "created_ports": [
      {
        "station_id": "station-uuid",
        "entity_key": "A1",
        "port_id": "port-uuid",
        "state": "DISABLED",
        "last_meter_kw": 0.0,
        "created_at": "ISO timestamp",
        "updated_at": "ISO timestamp"
      }
    ]
  },
  "meta": {}
}
```

Each element in `created_ports` corresponds to one inserted port (same order as deduplicated input). Dynamo `entity_key` values are `<code>`.

Response (error examples):


| Situation                                         | Typical `code`                      |
| ------------------------------------------------- | ----------------------------------- |
| Duplicate code in request                         | `INVALID_REQUEST`                   |
| Transaction failed (e.g. sort key already exists) | `ALREADY_EXISTS`                    |
| Other Dynamo / config errors                      | `DATABASE_ERROR`, `UNHANDLED_ERROR` |


---

### `supportUpdateStationPorts` / `userUpdateStationPorts`

Lambda: `charging-stations-write-station-ports-dynamo`  
Actions: `supportUpdateStationPorts`, `userUpdateStationPorts`

Optimistic port **state** update: Dynamo condition `state = oldState` must hold.

Request:

```json
{
  "service": { "action": "supportUpdateStationPorts", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "portCode": "A1",
    "oldState": "FREE|OCCUPIED|ERROR|DISABLED|BOOKED",
    "newState": "FREE|OCCUPIED|ERROR|DISABLED|BOOKED"
  }
}
```

Use `userUpdateStationPorts` with the same `data` shape and include `data.userId`:

```json
{
  "service": { "action": "userUpdateStationPorts", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "portCode": "A1",
    "oldState": "FREE|BOOKED|OCCUPIED",
    "newState": "FREE|BOOKED|OCCUPIED",
    "userId": "user-uuid"
  }
}
```

`userUpdateStationPorts` requires `userId`. Valid **`oldState`** values include **`OCCUPIED`** (e.g. ending a charging session and returning the port to `FREE`).

**Session lock:** the **session lock** item uses sort key `SESSION_LOCK` and stores the user id in the table’s **`station_id`** attribute (overload in the single-table design). A conditional `Put` ensures **at most one lock per user** everywhere, so a user cannot open a second session on another port/station until the first flow completes and the lock is cleared as designed.

**Transactional updates:** for **`FREE` → `BOOKED`** or **`FREE` → `OCCUPIED`** with `userId`, one **`TransactWriteItems`** call typically includes: (1) port state update, (2) new session row `Put`, (3) session lock `Put`. All succeed or all roll back.

**New session `BOOKED` vs `ACTIVE`:** when creating the session row, **`BOOKED`** is used if `time_booked_at` is present on the payload (reservation path); **`FREE` → `OCCUPIED`** without booking leaves `time_booked_at` unset so the new session is **`ACTIVE`**. Do not set `time_booked_at` on immediate-charge flows.

**Continuing / ending a session:** for **`BOOKED` → `OCCUPIED`**, **`OCCUPIED` → `FREE`**, etc., the writer loads the current session via **`getSessionByUser`** and appends session row updates in the same transaction as the port update where applicable.

`session_id` is returned when a new session is created from **`FREE`**; when updating an existing session, the response includes the current `session_id` from that session. `entity_key` in the success payload is the **port code** (not the full `PORT#…` sort key).

Response (success):

```json
{
  "data": {
    "station_id": "station-uuid",
    "entity_key": "A1",
    "new_state": "FREE",
    "updated_at": "ISO timestamp",
    "session_id": "session-uuid"
  },
  "meta": {}
}
```

For user flows, the success payload may also include:

- `time_booked_at`, `time_booked_before` (booking path)
- `time_started_at` (when applicable)
- `user_id`

Response (error): `INVALID_REQUEST` (bad states, condition failed, stale port/session state), `DATABASE_ERROR` (including Dynamo **`TransactionCanceledException`** when a multi-item transaction is rolled back — e.g. port state mismatch, session conditional failure, or **session lock already present** if the user already has an open session elsewhere). The error text may include Dynamo **`CancellationReasons`** for debugging.

---

### `deleteStationPorts`

Lambda: `charging-stations-write-station-ports-dynamo`  

Action: `deleteStationPorts`  

**Current rule:** exactly one sort key per request (`portKey`). Port must exist and have state `DISABLED`.

Request:

```json
{
  "service": { "action": "deleteStationPorts", "callerId": "string" },
  "data": {
    "stationId": "station-uuid",
    "portKey": "A1"
  }
}
```

Response (success):

```json
{
  "data": {
    "station_id": "station-uuid",
    "port_key": "A1",
    "deleted_at": "ISO timestamp"
  },
  "meta": {}
}
```

---

### `pay_session` (internal)

Lambda: `charging-stations-write-station-ports-dynamo`  
Action: `pay_session`

Used internally by the DynamoDB stream consumer when a session transitions to `UNPAID`.  
Input `data` is an array of operations (batch-friendly).

Internal request:

```json
{
  "service": { "action": "pay_session", "callerId": "DynamoDB Stream Consumer" },
  "data": [
    {
      "event_id": "dynamodb-stream-event-id",
      "station_id": "station-uuid",
      "entity_key": "PORT#A1#SESSION#session-uuid",
      "operation": "SESSION_UNPAID",
      "user_id": "user-uuid"
    }
  ]
}
```

Response (success):

```json
{
  "data": {
    "paid_sessions": [
      {
        "user_id": "user-uuid",
        "session_id": "session-uuid",
        "paid_at": "ISO timestamp"
      }
    ]
  },
  "meta": {}
}
```

Implementation notes:

- Requires an existing user lock row (`station_id = <user_id>`, `entity_key = "SESSION_LOCK"`); payment is rejected if lock is missing.
- Uses conditional update/idempotency guards on `paid_at` and `last_event_id` to prevent duplicate payment state updates from stream retries.

---

## Read

### `get_has_free_ports_by_station`  

Lambda: `charging-stations-get-ports-sessions-dynamo`  

Action: `get_has_free_ports_by_station`  

Lightweight check: queries GSI **`state-station-index`** with `state = FREE` and `station_id = <stationId>`, `Limit=1`, `ProjectionExpression=station_id`. Returns whether **at least one** port on the station is `FREE`.

Used internally by `charging-stations-write-station-rds` (`update_station_ports_state`) and by the hourly reconcile job.

Request:

```json
{
  "service": { "action": "get_has_free_ports_by_station", "callerId": "string" },
  "data": { "stationId": "station-uuid" }
}
```

Response (success):

```json
{
  "data": { "has_free_ports": true },
  "meta": {}
}
```

---

### `getPortsByStation`

Reads **port** rows for one station. Query uses `Key("station_id").eq(stationId)` and keeps only items where `entity_key` has exactly one `#` separator (`PORT#<code>`), so session rows (`PORT#<code>#SESSION#...`) are excluded.

Lambda: `charging-stations-get-ports-sessions-dynamo`  
Action: `getPortsByStation`

Request:

```json
{
  "service": { "action": "getPortsByStation", "callerId": "string" },
  "data": { "stationId": "station-uuid" }
}
```

Response (success):

```json
{
  "data": {
    "ports": [
      {
        "station_id": "station-uuid",
        "entity_key": "<code>",
        "port_id": "port-uuid",
        "state": "FREE|OCCUPIED|ERROR|DISABLED|BOOKED",
        "last_meter_kw": 0.0,
        "created_at": "ISO timestamp",
        "updated_at": "ISO timestamp"
      }
    ]
  },
  "meta": {}
}
```

---

### `getSessionByUser`

Lambda: `charging-stations-get-ports-sessions-dynamo`  
Action: `getSessionByUser`

Requires DynamoDB GSI `user_id-index` on `user_id`.

Request:

```json
{
  "service": { "action": "getSessionByUser", "callerId": "string" },
  "data": { "userId": "user-uuid" }
}
```

Response (success):

```json
{
  "data": {
    "session": [
      {
        "entity_key": "PORT#7237#SESSION#ed65575c-4988-41a7-b4fc-003b318fa1ad",
        "tariff": "1.55",
        "station_id": "station-uuid",
        "created_at": "ISO timestamp",
        "energy_consumed_kwh": int,
        "time_booked_at": "ISO timestamp" or null,
        "state": "BOOKED",
        "time_booked_before": "ISO timestamp" or null,
        "updated_at": "ISO timestamp",
        "user_id": "123",
        "ended_at": null,
        "session_id": "session-uuid",
        "stopped_at": null,
        "charge_level_percent": null,
        "booking_duration_minutes": null,
        "estimated_minutes_remaining": null,
        "current_cost": int,
        "duration_minutes": null,
        "started_at": null,
        "port_code": "7237"
      }
    ]
  },
  "meta": {}
}
```

Implementation notes:

- Query uses GSI **`user_id-index`** with `KeyConditionExpression = user_id` and filter **`state IN (BOOKED, ACTIVE, UNPAID)`**.
- Numeric fields are JSON numbers when returned through the API (they may be stored as `Decimal` in Dynamo).

---

## Stream consumer — `charging-stations-station-entities-stream-consumer`

Triggered by the **DynamoDB stream** on the station entities table (after insert/update/remove).

**Port detection:** `entity_key` split by `#` has **exactly two** segments (`PORT#<code>`) — excludes session and lock rows.
**Session detection:** `entity_key` split by `#` has **exactly four** segments (`PORT#<code>#SESSION#<session_id>`).

### `INSERT` / `REMOVE` (port rows)

Forwards to `charging-stations-write-station-rds` action **`update_station_ports`** to adjust RDS `ports` count (idempotent per stream `event_id`).

Internal payload:

```json
{
  "service": { "action": "update_station_ports", "callerId": "DynamoDB Stream Consumer" },
  "data": [
    {
      "event_id": "dynamodb-stream-event-id",
      "station_id": "station-uuid",
      "entity_key": "PORT#<code>",
      "operation": "PORT_INSERTED_OR_REMOVED",
      "delta": 1
    }
  ]
}
```

`delta` is `1` on insert, `-1` on remove.

### `MODIFY` (port rows — free ↔ non-free)

When a port’s `state` changes between **`FREE` and any non-FREE state** (and not `FREE`→`FREE`), the consumer forwards to **`update_station_ports_state`**, which recomputes `has_free_ports` in RDS (via `get_has_free_ports_by_station`) and updates idempotently using `ports_state_event_id`.

Internal payload:

```json
{
  "service": { "action": "update_station_ports_state", "callerId": "DynamoDB Stream Consumer" },
  "data": [
    {
      "event_id": "dynamodb-stream-event-id",
      "station_id": "station-uuid",
      "entity_key": "PORT#<code>",
      "operation": "PORT_RELEASED_OR_OCCUPIED"
    }
  ]
}
```

### `MODIFY` (session rows — transition to `UNPAID`)

When a session row changes from `BOOKED`/`ACTIVE` to `UNPAID`, the consumer forwards to the write-dynamo lambda action `pay_session`.

Internal payload:

```json
{
  "service": { "action": "pay_session", "callerId": "DynamoDB Stream Consumer" },
  "data": [
    {
      "event_id": "dynamodb-stream-event-id",
      "station_id": "station-uuid",
      "entity_key": "PORT#A1#SESSION#session-uuid",
      "operation": "SESSION_UNPAID",
      "user_id": "user-uuid"
    }
  ]
}
```

All forward paths use **`lambda:InvokeFunction`** with **`InvocationType: Event`** (asynchronous). Failures are surfaced via CloudWatch on the **target** write Lambda, not as a synchronous error to the stream consumer.

---

## Maintenance — `charging-stations-reconcile-free-ports`

Scheduled **hourly** (`rate(1 hour)`). Compares DynamoDB port states (GSI `state-station-index`) with RDS `stations.has_free_ports` for active stations and batch-updates rows where values differ (`IS DISTINCT FROM`). Serves as a safety net next to stream-driven updates.

Not part of the public HTTP API; invoked by EventBridge only.