# Frontend Documentation

## Backend-Frontend API Documentation

The potential backend-frontend interaction (API endpoints, request/response schemas, and data models) is described in the [specification.yaml](../specification.yaml) file at the project root. This OpenAPI 3.0 specification defines the EV Charging Public API contract.

### Previewing the API Specification

To preview the `specification.yaml` file in OpenAPI (Swagger) format within VS Code, you can use the **Swagger Viewer** extension:

1. Install the [Swagger Viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) extension from the VS Code Marketplace.
2. Open `specification.yaml` in the editor.
3. Open the preview using any of these methods:
   - **Command Palette**: Run `Preview Swagger` (Ctrl+Shift+P or Cmd+Shift+P, then type "Preview Swagger")
   - **Keyboard shortcut**: `Shift + Alt + P`
   - **Context menu**: Right-click the file in the Explorer and select "Preview Swagger"

The extension supports both YAML and JSON formats and provides a formatted, interactive view of the API documentation.

---

## Run Frontend Locally

### Prerequisites

- Install [Node.js](https://nodejs.org/) (LTS recommended, includes `npm`).
- Make sure the backend service is running and reachable from your machine.

### Install Dependencies

From the `frontend` directory:

```bash
npm install
```

### Configure Environment

Create a local env file in `frontend` (for example: `.env.local`) and define:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL_PREFIX=/api/v1
VITE_API_TIMEOUT=3000
VITE_LOG_LEVEL=debug
VITE_COGNITO_REGION=<your-cognito-region>
VITE_COGNITO_USER_POOL=<your-cognito-user-pool-id>
VITE_COGNITO_CLIENT_ID=<your-cognito-app-client-id>
```

See `.env.example` at the root of `frontend` for a reference template.

Notes:

- These values are consumed through `src/config/env.ts` (`config` object).
- `VITE_API_BASE_URL` should point to your backend host.
- `VITE_API_URL_PREFIX` should match backend API routing.
- `VITE_API_TIMEOUT` is in milliseconds.
- Cognito variables are required for authentication to work.

### Start Development Server

From the `frontend` directory:

```bash
npm run dev
```

Vite prints the local URL in terminal (commonly `http://localhost:5173`).

### Build and Preview Production Bundle

```bash
npm run build
npm run preview
```

Use `npm run lint` to run ESLint checks.

---

## Project Structure

```
frontend/
├── index.html
├── tailwind.config.js       # Tailwind CSS v4 content paths (see src/index.css for theme)
├── .env.example             # Reference template for environment variables
├── .env.production          # Production environment values (committed, no secrets)
└── src/
    ├── index.css            # Global styles, Tailwind base layers, custom design tokens
    ├── main.tsx             # App entry point – mounts React, Redux Provider, RouterProvider
    ├── config/
    │   └── env.ts           # Single config object wrapping all VITE_* env variables
    ├── components/          # Reusable UI components shared across pages
    ├── hooks/               # Custom React hooks (useAuth, useFetchData)
    ├── pages/               # Page-level components, organized by role/section
    │   ├── Layout.tsx       # Shared authenticated layout (nav, outlet)
    │   ├── StationEditPage.tsx
    │   ├── guest/
    │   ├── user/
    │   ├── support/
    │   └── admin/
    ├── router/              # React Router setup, route guards, role navigation helpers
    ├── services/
    │   ├── api/             # Axios-based API client and domain-specific API modules
    │   ├── auth/            # AWS Cognito authentication service and JWT utilities
    │   ├── logging/         # App-wide logger
    │   └── tokenStorage.ts  # Access/refresh token persistence (localStorage)
    ├── store/               # Redux Toolkit store, slices, and typed hooks
    └── types/               # Shared TypeScript types, constants, and error classes
```

---

## Environment Variables and Config

Environment variables are accessed through a single config module: `src/config/env.ts`.

- Contributors should read values from `config` instead of using `import.meta.env` directly in feature code.
- This gives one centralized place for environment-backed settings.

Current variables in `config`:

- `VITE_LOG_LEVEL` -> `config.logLevel`
  - Logging threshold for the app logger (`debug`, `info`, `warn`, `error`).
  - Used by `src/services/logging/logger.ts`.

- `VITE_API_BASE_URL` -> `config.apiBaseUrl`
  - Base backend URL (for example: `http://localhost:8000`).
  - Used to build API requests in `src/services/api/api.ts`.

- `VITE_API_URL_PREFIX` -> `config.apiPrefix`
  - Common API path prefix appended to base URL (for example: `/api/v1`).
  - Combined with base URL in the API client.

- `VITE_API_TIMEOUT` -> `config.apiTimeout`
  - Request timeout for API calls in milliseconds.
  - If not provided, API client falls back to `3000`.

- `VITE_COGNITO_REGION` -> `config.cognitoRegion`
  - AWS region where the Cognito User Pool is deployed.

- `VITE_COGNITO_USER_POOL` -> `config.cognitoUserPool`
  - Cognito User Pool ID used by the auth service.

- `VITE_COGNITO_CLIENT_ID` -> `config.cognitoClientId`
  - Cognito App Client ID used for sign-in and token operations.

---

## Frameworks and Libraries

### React + TypeScript + Vite

The app is a standard [React 19](https://react.dev/) SPA bootstrapped with [Vite](https://vite.dev/) and [TypeScript](https://www.typescriptlang.org/). Vite config is in `vite.config.ts`. The `@` path alias points to `src/`.

### Tailwind CSS v4

Styling uses [Tailwind CSS v4](https://tailwindcss.com/) with the Vite plugin (`@tailwindcss/vite`).

- **Content paths** are configured in `tailwind.config.js`.
- **Global base styles** and **custom design tokens** live in `src/index.css`:
  - `@layer base` – resets and default styles for HTML elements (`button`, `input`, `select`, `label`, `table`, `a`).
  - `@layer components` – shared component classes (for example `.guest-page`).
  - `@theme` – custom CSS variables that extend the Tailwind palette:
    - `primary` (violet), `secondary` (blue), `tertiary` / `success` (green), `error` (red), `warning` (amber).
    - Use them as regular Tailwind utilities: `bg-primary-600`, `text-error-500`, etc.

### React Hook Form

Complex forms use [React Hook Form](https://react-hook-form.com/) (`react-hook-form` v7).

- `useForm<T>()` provides `register`, `handleSubmit`, `formState`, and `reset`.
- Validation rules are passed inline to `register(fieldName, { required, pattern, min, ... })`.
- `formState.errors` carries per-field error messages rendered next to inputs.
- Example: `src/pages/StationEditPage.tsx` (station create/view form).
- Simpler forms that do not need advanced validation use controlled `useState` inputs instead (for example `src/components/SignInForm.tsx`).

### Redux Toolkit

Global client state is managed with [Redux Toolkit](https://redux-toolkit.js.org/) + [React Redux](https://react-redux.js.org/).

- Store is configured in `src/store/store.ts` and provided at root level in `src/main.tsx`.
- Typed hooks (`useAppDispatch`, `useAppSelector`) live in `src/store/hooks.ts`.
- Currently the only slice is `src/store/authSlice.ts`, which holds the authenticated user, auth status, and async thunks for `login` and `restoreSession`.

### AWS Cognito (Authentication)

Authentication is backed by [AWS Cognito](https://aws.amazon.com/cognito/) via the `@aws-sdk/client-cognito-identity-provider` package.

- Sign-in, sign-up, confirmation, and token refresh logic lives in `src/services/auth/authService.ts`.
- JWT decoding (extracting user role and attributes) is in `src/services/auth/jwtService.ts`.
- Access and refresh tokens are persisted in `localStorage` through `src/services/tokenStorage.ts`.

---

## Logging Service

Logging is implemented in `src/services/logging/logger.ts` and exported from `src/services/logging/index.ts` as `getLogger`.

How contributors should use it:

- Import logger factory from the service barrel:
  - `import { getLogger } from '@/services/logging'`
- Use default app logger:
  - `const logger = getLogger()`
- Or create/reuse a named logger per feature:
  - `const logger = getLogger('ApiClient')`

Implementation highlights:

- Uses level filtering with priorities: `debug < info < warn < error`.
- Reads active level from `config.logLevel`, validates it, and falls back to `info`.
- Formats output as `[loggerName] [LEVEL] message`.
- Maintains a map of logger instances so named loggers are reused.
- Routes to browser console handlers (`console.log`, `console.warn`, `console.error`).

---

## API Client Service

API communication is implemented in `src/services/api/api.ts` and exported from `src/services/api/index.ts` as `apiClient`.

### Underlying technology

- Built on [Axios](https://axios-http.com/).
- Creates a shared Axios instance (`axios.create`) with:
  - `baseURL = ${config.apiBaseUrl}${config.apiPrefix}`
  - JSON `Content-Type`
  - timeout from `config.apiTimeout` (fallback: `3000`)

### Interceptors

**Request interceptor:**

- Waits for any in-flight token refresh to complete before sending the request.
- Reads the current access token from `tokenStorage` and attaches it as `Authorization: Bearer <token>`.

**Response interceptor:**

- Centralizes error handling and maps backend/transport errors to app-level errors:
  - `401` (first attempt) -> tries to silently refresh the access token using the stored refresh token, then retries the original request. Concurrent requests share a single refresh promise to avoid duplicate refreshes.
  - `401` (retry or no refresh token) -> dispatches `logout()` and throws `UnauthorizedError`.
  - `403` -> throws `ForbiddenError`.
  - Other HTTP errors -> throws `HttpError(message, code, status)`.
  - Network/configuration failures -> throws `HttpError(..., NETWORK_ERROR | CONFIG_ERROR)`.
- Logs structured debug details through the logging service.

### Available methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get<T>(endpoint, config?)` | GET request |
| `post` | `post<T>(endpoint, body?, config?)` | POST request |
| `put` | `put<T>(endpoint, body?, config?)` | PUT request |
| `patch` | `patch<T>(endpoint, body?, config?)` | PATCH request |
| `delete` | `delete<T>(endpoint, config?)` | DELETE request |

Always provide a response type `T` for type-safe data handling.

### Domain API modules

Feature-specific API calls are grouped in separate modules under `src/services/api/`:

- `adminApi.ts` – admin operations (users, stations).

---

## Frontend Routing Model

Routing is implemented with [React Router v7](https://reactrouter.com/) in Data Mode.

- Route definitions live in `src/router/router.tsx` via `createBrowserRouter(...)`.
- The router is mounted in `src/main.tsx` with `<RouterProvider router={router} />`.
- Data Mode docs: [React Router - Data Routing](https://reactrouter.com/start/data/routing).

### Route Guards

- `src/router/AuthRoute.tsx`
  - Wraps all authenticated sections.
  - Uses `useAuth()` to check authentication status; shows a loading state while restoring the session.
  - Redirects unauthenticated users to `/login`.
  - On success renders `<Outlet />`.

- `src/router/RoleRoute.tsx`
  - Nested inside `AuthRoute`, wraps role-scoped sections (`/user/*`, `/support/*`, `/admin/*`).
  - Accepts a `role` prop and compares it against the user's role from `useAuth()`.
  - Redirects to `APP_PATH` (`/app`) when the role does not match.

- `src/router/AppRedirect.tsx`
  - Mounted at `/app`.
  - Redirects the authenticated user to their role-specific home page (via `getHomePath(userRole)` from `src/router/roleNavigation.ts`).
  - Redirects to `/login` when no role is present.

### Role Navigation Helpers (`src/router/roleNavigation.ts`)

Named path constants and a `getHomePath(role)` helper:

| Constant | Value |
|----------|-------|
| `LOGIN_PATH` | `/login` |
| `REGISTER_PATH` | `/register` |
| `APP_PATH` | `/app` |
| `ROLE_HOME.USER` | `/user` |
| `ROLE_HOME.ADMIN` | `/admin` |
| `ROLE_HOME.SUPPORT` | `/support` |

### Pages

#### Guest (unauthenticated)

| Path | Component |
|------|-----------|
| `/` | `src/pages/guest/GuestDashboardPage.tsx` |
| `/login` | `src/pages/guest/LoginPage.tsx` |
| `/register` | `src/pages/guest/RegisterPage.tsx` |
| `/confirm` | `src/pages/guest/ConfirmPage.tsx` |

#### User (role: `USER`)

| Path | Component |
|------|-----------|
| `/user` | `src/pages/user/UserDashboardPage.tsx` |
| `/user/session` | `src/pages/user/UserCurrentSessionPage.tsx` |
| `/user/profile` | `src/pages/user/UserProfilePage.tsx` |

#### Support (role: `SUPPORT`)

| Path | Component |
|------|-----------|
| `/support` | `src/pages/support/SupportDashboardPage.tsx` |
| `/support/logs` | `src/pages/support/SupportLogsPage.tsx` |
| `/support/stations` | `src/pages/support/SupportStationsPage.tsx` |
| `/support/sessions` | `src/pages/support/SupportSessionsPage.tsx` |

#### Admin (role: `ADMIN`)

| Path | Component |
|------|-----------|
| `/admin` | `src/pages/admin/AdminDashboardPage.tsx` |
| `/admin/users` | `src/pages/admin/AdminUsersPage.tsx` |
| `/admin/users/:userId` | `src/pages/admin/AdminUserEditPage.tsx` |
| `/admin/stations` | `src/pages/admin/AdminStationsPage.tsx` |
| `/admin/stations/create` | `src/pages/StationEditPage.tsx` (create mode) |
| `/admin/stations/create/:stationId` | `src/pages/StationEditPage.tsx` (view mode) |

All authenticated routes are wrapped in `src/pages/Layout.tsx` which provides the shared navigation and page scaffold.

### Frontend Health Checks

Health checks are exposed on the guest landing page in `src/pages/guest/GuestDashboardPage.tsx` via the `HealthChecker` component.

- **Shallow check** (`endpoint='/health'`)
  - Validates reachability of the Node.js backend service only.
  - In UI this is shown as "Check backend service".

- **Deep check** (`endpoint='/health/api'`)
  - Validates a broader path through the backend and AWS infrastructure (backend + Lambda integration).
  - In UI this is shown as "Check backend + lambda".

---

## Deployment

The frontend is a static SPA served over HTTP from an AWS S3 bucket.

### Step 1 – Set the backend URL

After the backend is deployed, copy `.env.production` (or create one) and set `VITE_API_BASE_URL` to the backend's HTTP address:

```bash
VITE_API_BASE_URL=http://<backend-load-balancer-or-host>
VITE_API_URL_PREFIX=/api/v1
VITE_API_TIMEOUT=5000
VITE_LOG_LEVEL=warn
VITE_COGNITO_REGION=<region>
VITE_COGNITO_CLIENT_ID=<client-id>
```

> The backend currently runs over HTTP (not HTTPS). Make sure the URL uses `http://`.

### Step 2 – Build the production bundle

From the `frontend` directory:

```bash
npm run build
```

Vite outputs the static assets to the `dist/` folder. The build command runs TypeScript type-checking (`tsc -b`) before bundling.

### Step 3 – Deploy to S3

Sync the `dist/` folder to your S3 bucket:

```bash
aws s3 sync dist/ s3://<unique-bucket-name> --delete
```

- `--delete` removes files from the bucket that are no longer in `dist/`.
- The bucket must be configured for static website hosting with `index.html` as the default document.
- Because the app uses client-side routing (`createBrowserRouter`), the bucket's error document should also be set to `index.html` so that deep links and page refreshes resolve correctly.
