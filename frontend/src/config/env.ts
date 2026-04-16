import { getNumberParameter, getStringParameter } from "./configUtils";

export const config = {
    apiPrefix: import.meta.env.VITE_API_URL_PREFIX,
    apiBaseUrl: getStringParameter("VITE_API_BASE_URL"),
    apiTimeout: getNumberParameter("VITE_API_TIMEOUT_MS", 10_000),
    logLevel: getStringParameter("VITE_LOG_LEVEL", "info"),
    cognitoRegion: getStringParameter("VITE_COGNITO_REGION", "il-central-1"),
    cognitoClientId: getStringParameter("VITE_COGNITO_CLIENT_ID"),
    currency: {
        code: getStringParameter("VITE_CURRENCY_CODE", "ILS"),
        name: getStringParameter("VITE_CURRENCY_NAME", "Israeli New Shekel"),
    },
    adminGroupName: getStringParameter("VITE_ADMIN_GROUP_NAME", "ADMIN"),
    supportGroupName: getStringParameter("VITE_SUPPORT_GROUP_NAME", "SUPPORT"),
    defaultPageSize: getNumberParameter("VITE_DEFAULT_PAGE_SIZE", 10),
    maxPortsPerStation: getNumberParameter("VITE_MAX_PORTS_PER_STATION", 22),
    pollingIntervalMs: getNumberParameter("VITE_POLLING_INTERVAL_MS", 30_000),
    userSessionsPollingInterval: getNumberParameter("VITE_USER_SESSION_POLLING_INTERVAL_MS", 5_000),
    unpaidSessionGracePeriodMs: getNumberParameter("VITE_UNPAID_SESSION_GRACE_PERIOD_MS", 15_000),
};