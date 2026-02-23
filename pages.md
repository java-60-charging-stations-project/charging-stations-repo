# Frontend Pages & Routes

This document is the single source of truth for all pages in the React SPA.  
It covers routes, roles, UI content, Redux state, API calls, and navigation flows.

---

## Table of Contents

1. [Route Map Summary](#route-map-summary)
2. [Guard & Redirect Rules](#guard--redirect-rules)
3. [Layout Groups](#layout-groups)
4. [Public Pages](#public-pages)
5. [Authenticated Pages (any role)](#authenticated-pages-any-role)
6. [TECH_SUPPORT Pages](#tech_support-pages)
7. [ADMIN Pages](#admin-pages)
8. [Query Parameters](#query-parameters)
9. [Page Titles](#page-titles)
10. [State Persistence](#state-persistence)
11. [Destructive Actions](#destructive-actions)

---

## Route Map Summary

### Public (no auth)

| Route | Component | Notes |
|---|---|---|
| `/` | `Dashboard` | Redirects to `/login` if not authenticated |
| `/login` | `Login` | Redirects to `/` (or `?redirect=`) if already authenticated |
| `/register` | `Register` | — |
| `/error/forbidden` | `ErrorForbidden` | 403 — access denied |
| `/error/system` | `ErrorSystem` | 500 / backend unavailable |
| `/*` | `NotFound` | 404 catch-all |

### Authenticated (any role)

| Route | Component | USER | TECH_SUPPORT | ADMIN |
|---|---|:---:|:---:|:---:|
| `/stations` | `StationList` | ✓ | ✓ | ✓ |
| `/stations/:stationId` | `StationDetail` | ✓ | ✓ | ✓ |
| `/sessions/current` | `ChargingSession` | ✓ | ✓ | ✓ |
| `/sessions/history` | `SessionHistory` | ✓ | ✓ | ✓ |
| `/account/profile` | `Profile` | ✓ | ✓ | ✓ |
| `/account/settings` | `Settings` | ✓ | ✓ | ✓ |

### TECH_SUPPORT (authorized only)

| Route | Component | Notes |
|---|---|---|
| `/support/dashboard` | `SupportDashboard` | Also accessible by ADMIN |
| `/support/logs` | `ErrorLog` | Also accessible by ADMIN |
| `/support/stations` | `StationManagement` | Also accessible by ADMIN |
| `/support/sessions` | `SupportSessions` | Also accessible by ADMIN |

### ADMIN (authorized only)

| Route | Component | Notes |
|---|---|---|
| `/admin/dashboard` | `AdminDashboard` | ADMIN only |
| `/admin/users` | `UserManagement` | ADMIN only |
| `/admin/stations` | `StationAdmin` | ADMIN only |
| `/admin/tariffs` | `TariffManagement` | ADMIN only |

---

## Guard & Redirect Rules

| Condition | Behaviour |
|---|---|
| Not authenticated | → `/login?redirect={original_path}` |
| Authenticated, wrong role | → `/error/forbidden` |
| HTTP 401 from API | → clear tokens + `/login?redirect={path}` |
| HTTP 403 from API | → `/error/forbidden` |
| HTTP 5xx from API | → `/error/system` |
| Authenticated on `/login` or `/register` | → `/` |

Guards are enforced in two places:
- **`ProtectedRoute`** component — wraps every authenticated route in `App.tsx`
- **Axios response interceptor** — in `src/api/client.ts`

---

## Layout Groups

| Group | Layout shell | Routes |
|---|---|---|
| Public (unauthenticated) | No navbar, centered card | `/login`, `/register` |
| Error | Full-screen dark gradient, no navbar | `/error/*`, `/*` |
| App | Sticky navbar + content padding | All authenticated routes |

---

## Public Pages

---

### `/login` — Login

**Component:** `src/auth/Login.tsx`  
**Roles:** Public (no auth)  
**Title:** `Sign In — EV Charge`

**UI elements:**
- Email input
- Password input
- "Sign In" button (disabled while loading)
- Link → `/register`
- Dev-mode hint (pre-filled credentials in `NODE_ENV=development`)
- Error message (inline, below the form)

**State:** `auth.loading`, `auth.error`  
**API:** `POST /api/auth/login`  
**On success:** stores `accessToken`, `user` in `localStorage` → navigate to `?redirect` or `/`  
**On failure:** shows error from `auth.error`

---

### `/register` — Sign Up

**Component:** `src/auth/Register.tsx`  
**Roles:** Public (no auth)  
**Title:** `Sign Up — EV Charge`

**UI elements:**
- Name, email, password, phone (optional) inputs
- "Create Account" button
- Link → `/login`
- Validation errors per field

**State:** `auth.loading`, `auth.error`  
**API:** `POST /api/auth/register`  
**On success:** navigate to `/login`

---

### `/error/forbidden` — Access Denied

**Component:** `src/pages/error/ErrorForbidden.tsx`  
**Roles:** Public  
**Title:** `Access Denied — EV Charge`

**UI elements:**
- 403 code + icon
- Short explanation
- "Back to Home" button → `/`

**Triggered by:** `ProtectedRoute` (wrong role) or Axios 403

---

### `/error/system` — Server Error

**Component:** `src/pages/error/ErrorSystem.tsx`  
**Roles:** Public  
**Title:** `Server Error — EV Charge`

**UI elements:**
- 500 code + icon
- Short explanation
- "Go Back" button (browser history) + "Home" button → `/`

**Triggered by:** Axios interceptor on `status >= 500`

---

### `/*` — Not Found

**Component:** `src/pages/error/NotFound.tsx`  
**Roles:** Public  
**Title:** `Not Found — EV Charge`

**UI elements:**
- 404 code + icon
- "Back to Home" button → `/`

---

## Authenticated Pages (any role)

---

### `/` — Dashboard

**Component:** `src/pages/Dashboard.tsx`  
**Roles:** Any authenticated  
**Title:** `Dashboard — EV Charge`

**UI elements:**
- Greeting with username
- Navigation cards grid (Stations, Charging, History; extra cards for TECH_SUPPORT / ADMIN)
- **Health Check** section:
  - "⚡ Health Check" button → `GET /api/health`
  - "🔍 Full Health Check" button → `GET /api/health?full=true` (invokes Lambda)
  - Response displayed as status badge + JSON `<pre>` block
  - Last-checked timestamp

**State:** `health.response`, `health.loading`, `health.error`, `health.lastChecked`  
**API:** `GET /api/health`, `GET /api/health?full=true`

---

### `/stations` — Station List

**Component:** `src/pages/user/StationList.tsx`  
**Roles:** Any authenticated  
**Title:** `Stations — EV Charge`

**UI elements:**
- Search input (by name / address) — query param `?search=`
- Status filter tabs: All / Active / Maintenance / Offline — query param `?status=`
- Station cards grid:
  - Name, address
  - Status badge (color-coded)
  - Available ports count
  - Power (kW) + tariff (₽/kWh)
  - "View" link → `/stations/:stationId`
- Empty state message

**State:** `stations.list`, `stations.loading`, `stations.error`  
**API:** `GET /api/stations?status=`  
**Filter persistence:** search + status restored from URL on back-navigation

---

### `/stations/:stationId` — Station Detail

**Component:** `src/pages/user/StationDetail.tsx`  
**Roles:** Any authenticated  
**Title:** `{Station Name} — EV Charge`

**UI elements:**
- Station header: name, address, status badge, tariff
- Port list:
  - Port ID, connector type, power (kW), status (Available / Busy / Error)
  - "Start Charging" button (only for Available ports)
- Start Charging modal / inline form:
  - Battery capacity (kWh) input
  - Target charge % slider
  - Confirm button
- Back link → `/stations`

**State:** `stations.currentStation`, `sessions.activeSession`, `sessions.loading`, `sessions.error`  
**API:**  
- `GET /api/stations/:id`  
- `POST /api/sessions/start` → on success navigate to `/sessions/current`

---

### `/sessions/current` — Current Charging Session

**Component:** `src/pages/user/ChargingSession.tsx`  
**Roles:** Any authenticated  
**Title:** `Charging in Progress — EV Charge`

**UI elements:**
- Progress ring / bar (% charged)
- Energy consumed (kWh)
- Current cost (₽)
- Elapsed time
- Estimated time remaining
- "Stop Charging" button (confirm dialog: "Stop session?")
- Polling: auto-refresh every 10 s via `usePolling` hook
- Empty state if no active session: link → `/stations`

**State:** `sessions.activeSession`, `sessions.loading`, `sessions.error`  
**API:**  
- `GET /api/sessions/active` (on mount + polling)  
- `POST /api/sessions/:id/stop`

---

### `/sessions/history` — Session History

**Component:** `src/pages/user/SessionHistory.tsx`  
**Roles:** Any authenticated  
**Title:** `Session History — EV Charge`

**UI elements:**
- Date range filter — query params `?from=` `?to=`
- Status filter — query param `?status=`
- Session list (most recent first):
  - Station name, port, date/time
  - Energy (kWh), cost (₽), duration
  - Status badge (Completed / Stopped / Error)
- Total summary row (total kWh, total ₽)
- Empty state message

**State:** `sessions.history`, `sessions.loading`  
**API:** `GET /api/sessions/history`

---

### `/account/profile` — Profile

**Component:** `src/pages/account/Profile.tsx`  
**Roles:** Any authenticated  
**Title:** `Profile — EV Charge`

**UI elements:**
- Avatar initials + email + role badge
- User details: email, User ID, role
- "Support Request" link / form (optional)
- "Sign Out" button (confirm dialog: "Sign out?")

**State:** `auth.user`  
**API:** none (data from local auth context)

---

### `/account/settings` — Settings

**Component:** `src/pages/account/Settings.tsx`  
**Roles:** Any authenticated  
**Title:** `Settings — EV Charge`

**UI elements:**
- Toggle: Email notifications
- Toggle: Session reminders
- Toggle: Cost alerts
- (Future) Preferred tariff view
- Auto-save on toggle (optimistic update)

**State:** local state (or future `settings` Redux slice)  
**API:** (future) `PATCH /api/account/settings`

---

## TECH_SUPPORT Pages

> All `/support/*` routes are accessible by both `TECH_SUPPORT` and `ADMIN` roles.

---

### `/support/dashboard` — Operations Dashboard

**Component:** `src/pages/support/SupportDashboard.tsx`  
**Roles:** TECH_SUPPORT, ADMIN  
**Title:** `Operations Dashboard — EV Charge`

**UI elements:**
- KPI cards: Active Sessions, Total Stations, Unresolved Errors
- Quick-link cards → `/support/logs`, `/support/stations`, `/support/sessions`
- (Future) Recent errors list (last 5)
- (Future) System load chart

**State:** `techSupport.stats`, `techSupport.loading`  
**API:** `GET /api/tech-support/stats`

---

### `/support/logs` — Error Logs

**Component:** `src/pages/techSupport/ErrorLog.tsx`  
**Roles:** TECH_SUPPORT, ADMIN  
**Title:** `Error Logs — EV Charge`

**Query params:** `?level=ERROR|WARN` · `?service=` · `?status=open|resolved` · `?from=` · `?to=`

**UI elements:**
- Filter bar: level, service, status, date range
- Error log table / cards:
  - Timestamp, level badge, service, message
  - Status badge (Open / Resolved)
  - "Resolve" button → `PATCH /api/tech-support/errors/:id/status`
- Pagination or infinite scroll

**State:** `techSupport.errors`, `techSupport.loading`, `techSupport.error`  
**API:**  
- `GET /api/tech-support/errors?level=&service=&status=&from=&to=`  
- `PATCH /api/tech-support/errors/:id/status`

---

### `/support/stations` — Station Management

**Component:** `src/pages/techSupport/StationManagement.tsx`  
**Roles:** TECH_SUPPORT, ADMIN  
**Title:** `Station Management — EV Charge`

**UI elements:**
- Station list with current mode/status
- Per-station mode selector: Active / Maintenance / Offline
- "Apply" button per row → `PATCH /api/tech-support/stations/:id/mode`
- Status change confirmation dialog: "Set station to Maintenance?"

**State:** `stations.list`, `stations.loading`  
**API:**  
- `GET /api/stations`  
- `PATCH /api/tech-support/stations/:id/mode`

---

### `/support/sessions` — Active Sessions Management

**Component:** `src/pages/support/SupportSessions.tsx`  
**Roles:** TECH_SUPPORT, ADMIN  
**Title:** `Active Sessions — EV Charge`

**UI elements:**
- Active session list (all users):
  - Session ID, station, port, user email
  - Energy consumed (kWh), cost (₽)
  - Status badge
  - "Force Stop" button — confirm dialog: "Force stop this session?"
- Auto-refresh every 30 s
- Empty state: "No active sessions"

**State:** `sessions.allSessions`, `sessions.loading`, `sessions.error`  
**API:**  
- `GET /api/sessions/all?status=ACTIVE`  
- `POST /api/sessions/:id/stop` (force stop)

---

## ADMIN Pages

---

### `/admin/dashboard` — Admin Dashboard

**Component:** `src/pages/admin/AdminDashboard.tsx`  
**Roles:** ADMIN only  
**Title:** `Admin Dashboard — EV Charge`

**UI elements:**
- Navigation cards: User Management, Stations Management, Tariffs, Operations Dashboard
- (Future) System-wide KPIs: total users, total sessions today, revenue today

**State:** none (static navigation)

---

### `/admin/users` — User Management

**Component:** `src/pages/admin/UserManagement.tsx`  
**Roles:** ADMIN only  
**Title:** `User Management — EV Charge`

**Query params:** `?role=USER|TECH_SUPPORT|ADMIN` · `?blocked=true|false`

**UI elements:**
- Filter bar: role, blocked status, search by email
- User table:
  - Email, role badge, blocked status, created date
  - Role selector dropdown → `PATCH /api/admin/users/:id/role`
  - Block/Unblock toggle → `PATCH /api/admin/users/:id/block`
  - Delete button — confirm dialog: "Delete user {email}? This cannot be undone."

**State:** `admin.users`, `admin.loading`, `admin.error`  
**API:**  
- `GET /api/admin/users`  
- `PATCH /api/admin/users/:id/role`  
- `PATCH /api/admin/users/:id/block`  
- `DELETE /api/admin/users/:id`

---

### `/admin/stations` — Stations Management

**Component:** `src/pages/admin/StationAdmin.tsx`  
**Roles:** ADMIN only  
**Title:** `Stations Management — EV Charge`

**UI elements:**
- Station list with status and commission state
- "Create Station" button → inline form / modal:
  - Name, address, lat/lon, port count, power (kW), tariff (₽/kWh)
  - Submit → `POST /api/admin/stations`
- "Commission" button (NEW → ACTIVE) — confirm dialog: "Put station into operation?"
  - → `PATCH /api/admin/stations/:id/commission`
- "Update Tariff" inline edit → `PATCH /api/admin/stations/:id/tariff`

**State:** `stations.list`, `stations.loading`  
**API:**  
- `GET /api/stations`  
- `POST /api/admin/stations`  
- `PATCH /api/admin/stations/:id/commission`  
- `PATCH /api/admin/stations/:id/tariff`

---

### `/admin/tariffs` — Tariffs Management

**Component:** `src/pages/admin/TariffManagement.tsx`  
**Roles:** ADMIN only  
**Title:** `Tariffs Management — EV Charge`

**UI elements:**
- Tariff list per station (name, current rate ₽/kWh, last updated)
- Inline edit: tariff value input + "Save" button per row
- (Future) Time-of-day tariff schedules
- (Future) Special tariff for VIP users

**State:** `stations.list`, `admin.loading`  
**API:**  
- `GET /api/stations`  
- `PATCH /api/admin/stations/:id/tariff`

---

## Query Parameters

| Route | Param | Values | Notes |
|---|---|---|---|
| `/stations` | `search` | string | Filter by name/address |
| `/stations` | `status` | `ACTIVE\|MAINTENANCE\|OFFLINE` | Filter by station status |
| `/sessions/history` | `from` | ISO date | Start of date range |
| `/sessions/history` | `to` | ISO date | End of date range |
| `/sessions/history` | `status` | `COMPLETED\|STOPPED\|ERROR` | — |
| `/support/logs` | `level` | `ERROR\|WARN\|INFO` | Log level filter |
| `/support/logs` | `service` | string | Microservice name |
| `/support/logs` | `status` | `open\|resolved` | — |
| `/support/logs` | `from` | ISO date | — |
| `/support/logs` | `to` | ISO date | — |
| `/admin/users` | `role` | `USER\|TECH_SUPPORT\|ADMIN` | — |
| `/admin/users` | `blocked` | `true\|false` | — |
| `/login` | `redirect` | URL-encoded path | Return destination after login |

---

## Page Titles

Browser `<title>` pattern: `{Page Name} — EV Charge`

| Route | Title |
|---|---|
| `/login` | `Sign In — EV Charge` |
| `/register` | `Sign Up — EV Charge` |
| `/` | `Dashboard — EV Charge` |
| `/stations` | `Stations — EV Charge` |
| `/stations/:id` | `{Station Name} — EV Charge` |
| `/sessions/current` | `Charging in Progress — EV Charge` |
| `/sessions/history` | `Session History — EV Charge` |
| `/account/profile` | `Profile — EV Charge` |
| `/account/settings` | `Settings — EV Charge` |
| `/support/dashboard` | `Operations Dashboard — EV Charge` |
| `/support/logs` | `Error Logs — EV Charge` |
| `/support/stations` | `Station Management — EV Charge` |
| `/support/sessions` | `Active Sessions — EV Charge` |
| `/admin/dashboard` | `Admin Dashboard — EV Charge` |
| `/admin/users` | `User Management — EV Charge` |
| `/admin/stations` | `Stations Management — EV Charge` |
| `/admin/tariffs` | `Tariffs Management — EV Charge` |
| `/error/forbidden` | `Access Denied — EV Charge` |
| `/error/system` | `Server Error — EV Charge` |
| `/*` | `Not Found — EV Charge` |

---

## State Persistence

| Route | What is preserved | How |
|---|---|---|
| `/stations` | Search text + status filter | URL query params |
| `/sessions/history` | Date range + status filter | URL query params |
| `/support/logs` | All filters | URL query params |
| `/admin/users` | Role + blocked filters | URL query params |
| `/stations/:id` | Scroll position | Browser default |

When a user navigates from `/stations/:id` back to `/stations`, filters are restored from the URL, so no search state is lost.

---

## Destructive Actions

All irreversible operations require a confirmation dialog (`window.confirm` or custom modal) before calling the API.

| Action | Page | Confirmation text |
|---|---|---|
| Stop charging | `/sessions/current` | "Stop the current session?" |
| Force stop session | `/support/sessions` | "Force stop this session?" |
| Set station to Maintenance | `/support/stations` | "Set station to Maintenance? Active sessions may be interrupted." |
| Delete user | `/admin/users` | "Delete user {email}? This cannot be undone." |
| Block user | `/admin/users` | "Block user {email}?" |
| Commission station | `/admin/stations` | "Put this station into operation?" |
