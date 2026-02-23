# Frontend pages & routes

This document defines the minimal set of pages/routes for the React SPA.

## Route map (minimal)

### Public (no auth)

| Route | Page | Notes |
|---|---|---|
| `/` | Home or redirect to `/stations` or `/login` |  |
| `/login` | Login |  |
| `/register` | Sign up |  |
| `/error/forbidden` | Access denied | Show error message |
| `/error/system` | Server errors | 500s, backend unavailable |
| `/*` | Not found |  |

Note: 401 errors -> redirect to login

### Authenticated (any role)

| Route | Page | Notes |
|---|---|---|
| `/stations` | Stations list | Search/filter; show status summary |
| `/stations/{stationId}` | Station details | View ports, select port, start charging |
| `/account/profile` | Profile | User details, support request, sign out |
| `/account/settings` | Settings | Tariffs? Notifications? Optional |
| `/sessions/current` | Current charging session | Progress, consumed energy, current cost, stop charging |
| `/sessions/history` | Session history | Cost, acquired energy, time spent |

### TECH_SUPPORT (Authorized only)

| Route | Page | Notes |
|---|---|---|
| `/support/dashboard` | Operations dashboard | Active requests/errors. Access to logs, sessions, stations |
| `/support/logs` | Error logs |  |
| `/support/stations` | Station management |  |
| `/support/sessions` | Active sessions management |  |

### ADMIN (Authorized only)

| Route | Page | Notes |
|---|---|---|
| `/admin/dashboard` | Admin dashboard |  |
| `/admin/users` | User management | Change role, block, delete |
| `/admin/stations` | Stations management | Create/edit stations, put into operation |
| `/admin/tariffs` | Tariffs management |  |