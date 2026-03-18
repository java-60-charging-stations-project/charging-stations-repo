
# Charging Stations - Lambda Request/Response Formats

This document describes the JSON **shape** of the payloads sent to (and returned by) the Lambda handlers.

## Global Error Response

```json
{
  "error": "Human readable message",
  "code": "UNHANDLED_ERROR | ALREADY_EXISTS | NOT_FOUND | UNAUTHORIZED | INVALID_REQUEST | CONSTRAINT_VIOLATION | DATABASE_ERROR | MISSING_KEY"
}
```

## Users

### Get all users

Request:

```json
{
  "service": { "action": "get_all_users", "caller_id": "<string>" },
  "data": {
    "role": "<optional>",
    "status": "<optional>"
  },
  "meta": {
    "page": 1,
    "pageSize": 200
  }
}
```

Response (success):

```json
[
  {
    "user_id": "uuid",
    "full_name": "string",
    "email": "string",
    "phone": "string|null",
    "role": "USER|ADMIN|SUPPORT",
    "status": "ACTIVE|BANNED|DISABLED|null",
    "created_at": "ISO-8601-string",
    "updated_at": "ISO-8601-string|null"
  }
]
```

Response (error):

```json
{ "error": "Human readable message" }
```

### Get user by id

Request:

```json
{
  "service": {
    "action": "get_user_by_id",
    "caller_id": "string",
    "user_id": "string"
  }
}
```

Response (success):

```json
{
  "user_id": "uuid",
  "full_name": "string",
  "email": "string",
  "phone": "string|null",
  "role": "USER|ADMIN|SUPPORT",
  "status": "ACTIVE|BANNED|DISABLED|null",
  "created_at": "ISO-8601-string",
  "updated_at": "ISO-8601-string|null"
}
```

Response (error):

```json
{ "error": "Human readable message" }
```

## Stations

### Get all stations

Request:

```json
{
  "service": { "action": "get_all_stations", "caller_id": "<string>" }
}
```

Response (success):

```json
{
  "data": [
    {
      "id": "string",
      "code": "string",
      "name": "string"
    }
  ]
}
```

Response (error):

```json
{ "error": "Human readable message", "code": "NOT_FOUND|UNHANDLED_ERROR|..." }
```

### Get station by id

Request:

```json
{
  "service": {
    "action": "get_station_by_id",
    "caller_id": "string",
    "station_id": "string"
  }
}
```

Response (success):

```json
{
  "data": {
    "id": "string",
    "code": "string",
    "name": "string"
  }
}
```

Response (error):

```json
{ "error": "Human readable message", "code": "NOT_FOUND|UNHANDLED_ERROR|..." }
```

## Write station

Request:

```json
{
  "service": { "action": "write_station", "caller_id": "<string>" },
  "data": {
    "code": "TLV-FAST-904",
    "name": "Skyline Hub",
    "owner": "ElectroNet Services Ltd.",
    "city": "Tel Aviv",
    "address": "44 Ibn Gabirol St",
    "email": null,
    "phone": null,
    "siteTechnician": null,
    "status": "ACTIVE",
    "ratePlan": {
      "currencyCode": "ILS",
      "currencyName": "Israeli Shekel",
      "peakRate": 2.14,
      "offPeakRate": 1.47
    },
    "location" : {
    "longitude": 34.7818, (optional)
    "latitude": 32.0853 (optional)
    }
  }
}
```

Response (success):

```json
{
  "data": { "stationId": "string" }
}
```
