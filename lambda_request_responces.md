
# Charging Stations - Lambda Request/Response Formats

This document describes the JSON **shape** of the payloads sent to (and returned by) the Lambda handlers.

## Global Error Response

```json
{
  "error": "Human readable message",
  "code": "UNHANDLED_ERROR | ALREADY_EXISTS | NOT_FOUND | UNAUTHORIZED | INVALID_REQUEST | CONSTRAINT_VIOLATION | DATABASE_ERROR"
}
```

## Users

### Get all users

Lambda function name: charging-stations-get-user-info

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

Lambda function name: charging-stations-get-user-info

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
  "user_id": "string",
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

Lambda function name: charging-stations-get-station-info

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

Lambda function name: charging-stations-get-station-info

Request:

```json
{
  "service": {
    "action": "get_station_by_id",
    "caller_id": "string"
    }
  "data":{
    "station_id": "string"
  }
}
```

Response (success):

```json
{
  'data': 
{
  'id': 'f8c5b22e-e8c7-448b-a9a7-5bf00171b8de', 
  code': 'TLV-FAST-5778', 
  'name': 'Skyline Hub', 
  'owner': 'ElectroNet Services Ltd.', 
  'city': 'Tel Aviv', 
  'address': '44 Ibn Gabirol St', 
  'email': None, 
  'sitetechnician': None, 
  'maxpowerkw': 0.0, 
  'ports': 0, 
  'rateplan': 
    {
    'peakRate': 2.14, 
    'offPeakRate': 1.47, 
    'currencyCode': 'ILS', 
    'currencyName': 'Israeli Shekel'
    }, 
    'state': 'INACTIVE', 
    'created_at': '2026-03-19T10:39:29.269144+00:00', 
    'updated_at': '2026-03-19T10:47:29.587575+00:00'
  }
}
```

Response (error):

```json
{ "error": "Human readable message", "code": "NOT_FOUND|UNHANDLED_ERROR|..." }
```

## Write station

Lambda function name: charging-stations-write-station-rds

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

Change station state

Lambda function name: charging-stations-write-station-rds

Request:

```json
{
      "service": { 
        "action": "change_station_status", 
        "caller_id": <str> },
      "data": {
            "stationId": station_id,
            "oldState": "ACTIVE" or "INACTIVE" or "OUT_OF_SERVICE",
            "newState": "ACTIVE" or "INACTIVE" or "OUT_OF_SERVICE",
      }
}
```

Response (success):

```json
{
  'data': {
  'updatedAt': '2026-03-19T10:47:29.587575+00:00'
  }
}
```

Response (error):

```json
{ "error": "Human readable message", "code": "NOT_FOUND|UNHANDLED_ERROR|..." }
```

Delete station

Lambda function name: charging-stations-write-station-rds

Request:

```json
{
      "service": { 
        "action": "delete_station", 
        "caller_id": <str> },
      "data": {
            "stationId": station_id,
      }
}
```

Response (success):

```json
{
  'data': {
  'deletedAt': '2026-03-19T10:47:29.587575+00:00'
  }
}
```

Response (error):

```json
{ "error": "Human readable message", "code": "NOT_FOUND|UNHANDLED_ERROR|..." }
```
