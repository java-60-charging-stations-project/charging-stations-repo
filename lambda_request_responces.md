# Charging Stations - Lambda Request/Response Formats

This document describes the JSON **shape** of the payloads sent to (and returned by) the Lambda handlers.

## Global Success Response

Most Lambdas return this shape on success:

```json
{
  "data": { }
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

## Users - `charging-stations-get-user-info`

### Get all users

Request:

```json
{
  "service": { "action": "get_all_users", "caller_id": "string" }
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
    "action": "get_user_by_id",
    "caller_id": "string"
  },
  "data": {
    "user_id": "string"
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

### Write station (RDS) - `charging-stations-write-station-rds`

This Lambda is **action-based**; it expects `event.service.action`.  

For newly created stations state is always `"INACTIVE"`

Request:

```json
{
  "service": { "action": "write_station", "caller_id": "string" },
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
  "data": { "stationId": "station-uuid" }
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

Request:

```json
{
  "service": { "action": "get_all_stations", "caller_id": "string" }
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
      "siteTechnician": "string|null",
      "maxPowerKw": 0.0,
      "ports": 0,
      "ratePlan": {
        "currencyCode": "string",
        "currencyName": "string",
        "peakRate": 0.0,
        "offPeakRate": 0.0
      },
      "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE|DELETED",
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
  "code": "NOT_FOUND|DATABASE_ERROR|..."
}
```

### Get station by id

Request:

```json
{
  "service": {
    "action": "get_station_by_id",
    "caller_id": "string"
  },
  "data": {
    "station_id": "station-uuid"
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
    "siteTechnician": "string|null",
    "maxPowerKw": 0.0,
    "ports": 0,
    "ratePlan": {
      "currencyCode": "string",
      "currencyName": "string",
      "peakRate": 0.0,
      "offPeakRate": 0.0
    },
    "state": "ACTIVE|INACTIVE|OUT_OF_SERVICE|DELETED",
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
  "service": { "action": "change_station_state", "caller_id": "string" },
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
  "data": { "updatedAt": "ISO-8601-string" }
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
  "service": { "action": "delete_station", "caller_id": "string" },
  "data": { "stationId": "station-uuid" }
}
```

Response (success):

```json
{
  "data": { "deletedAt": "ISO-8601-string" }
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

Your DynamoDB writer currently uses:
- `PK`: `station_id`
- `SK` (sort key): `entity_key`
- each port item is written with `entity_key = "PORT#<generated-port_id-uuid>"`

It also stores the frontend’s unique port code inside the item as attribute `code`.  

For newly created ports state is always `"DISABLED"`  

Request:

```json
{
  "service": { "action": "insert_station_ports", "caller_id": "string" },
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
  "data": ["generated-port-id-uuid", "generated-port-id-uuid"]
}
```

Response (error):

```json
{
  "error": "Human readable message",
  "code": "INVALID_REQUEST|DATABASE_ERROR|UNHANDLED_ERROR|..."
}
```
