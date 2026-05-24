import { getStringParameter, requireBooleanParameter, requireNumberParameter, requireStringParameter } from "./configUtils";

export const config = {
    apiPrefix: getStringParameter("VITE_API_URL_PREFIX"),
    appEnv: requireStringParameter("VITE_APP_ENV", "development"),
    apiBaseUrl: requireStringParameter("VITE_API_BASE_URL"),
    apiTimeout: requireNumberParameter("VITE_API_TIMEOUT_MS", 10_000),
    logLevel: requireStringParameter("VITE_LOG_LEVEL", "info"),
    cognitoRegion: requireStringParameter("VITE_COGNITO_REGION", "il-central-1"),
    cognitoClientId: requireStringParameter("VITE_COGNITO_CLIENT_ID"),
    currency: {
        code: requireStringParameter("VITE_CURRENCY_CODE", "ILS"),
        name: requireStringParameter("VITE_CURRENCY_NAME", "Israeli New Shekel"),
    },
    adminGroupName: requireStringParameter("VITE_ADMIN_GROUP_NAME", "ADMIN"),
    supportGroupName: requireStringParameter("VITE_SUPPORT_GROUP_NAME", "SUPPORT"),
    defaultPageSize: requireNumberParameter("VITE_DEFAULT_PAGE_SIZE", 10),
    maxPortsPerStation: requireNumberParameter("VITE_MAX_PORTS_PER_STATION", 22),
    pollingIntervalMs: requireNumberParameter("VITE_POLLING_INTERVAL_MS", 30_000),
    userSessionsPollingInterval: requireNumberParameter("VITE_USER_SESSION_POLLING_INTERVAL_MS", 5_000),
    unpaidSessionGracePeriodMs: requireNumberParameter("VITE_UNPAID_SESSION_GRACE_PERIOD_MS", 15_000),
    toasterAutoCloseMs: requireNumberParameter("VITE_TOASTER_AUTO_CLOSE_MS", 5_000),
    useGMaps: requireBooleanParameter("VITE_USE_G_MAPS", true),
    mapsGKey: requireStringParameter("VITE_MAPS_G_KEY"),
    mapsStartLat: requireNumberParameter("VITE_MAPS_START_LAT", 32.842345),
    mapsStartLng: requireNumberParameter("VITE_MAPS_START_LNG", 35.077271),
    docsUrl: getStringParameter("VITE_DOCS_URL"),
    // MOCK PARAMETERS
    mockApiTimeout: requireNumberParameter("VITE_MOCK_API_TIMEOUT", 1000),
    lambdaCallMode: requireStringParameter("VITE_LAMBDA_CALL_MODE", "async"),

};