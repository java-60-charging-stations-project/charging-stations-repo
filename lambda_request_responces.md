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
- **Port rows:** `entity_key = "PORT#<code>"`, initial `state: "DISABLED"`, plus `port_id`, `last_meter_kw`, timestamps.
- **Session rows:** `entity_key = "PORT#<code>#SESSION#<session_id>"` (same partition key).

---

## Write — `charging-stations-write-station-ports-dynamo`

Action-based handler: `event.service.action` and `event.service.callerId`. Success responses include `"meta": {}` where applicable.

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
    "oldState": "FREE|BOOKED",
    "newState": "FREE|BOOKED|OCCUPIED",
    "userId": "user-uuid"
  }
}
```

`userUpdateStationPorts` requires `userId`.

Current implementation creates a session item in the same DynamoDB transaction for `userUpdateStationPorts` requests and returns the created `session_id`.

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

For user flows, response may also include:

- `time_booked_at`
- `time_booked_before`
- `time_started_at`
- `user_id`
- `port_booked`

Response (error): `INVALID_REQUEST` (bad states, wrong number of keys for user path, condition failed), `DATABASE_ERROR`, etc.

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

## Read

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
        "session_id": "session-uuid",
        "station_id": "station-uuid",
        "entity_key": "PORT#A1#SESSION#session-uuid",
        "port_code": "A1",
        "state": "BOOKED|ACTIVE|UNPAID",
        "user_id": "user-uuid",
        "created_at": "ISO timestamp",
        "updated_at": "ISO timestamp"
      }
    ]
  },
  "meta": {}
}
```

Current implementation queries `user_id-index` with `KeyConditionExpression = user_id` and applies `state IN (BOOKED, ACTIVE, UNPAID)`.

---

## Stream consumer — `charging-stations-station-entities-stream-consumer`

Triggered by the **DynamoDB stream** on the station entities table (after insert/update/remove).

**Port detection:** `entity_key` split by `#` has **exactly two** segments (`PORT#<code>`) — excludes session rows.

Current implementation handles only `INSERT` / `REMOVE` for port rows and forwards those events to `charging-stations-write-station-rds` action `update_station_ports` to adjust RDS `ports` count.

Internal payload to RDS (insert/remove):

```json
{
  "service": { "action": "update_station_ports", "callerId": "script" },
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

The consumer treats Lambda invoke errors as failures: it checks `FunctionError` on the invoke response and the JSON `error` field in the payload.

After a successful port insert/remove in Dynamo, the stream consumer runs as above so RDS `ports` stays in sync.