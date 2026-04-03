
export const config = {
    logLevel: import.meta.env.VITE_LOG_LEVEL,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    apiPrefix: import.meta.env.VITE_API_URL_PREFIX,
    apiTimeout: import.meta.env.VITE_API_TIMEOUT,
    cognitoRegion: import.meta.env.VITE_COGNITO_REGION,
    cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    currency: {
        code: (import.meta.env.VITE_CURRENCY_CODE as string) ?? "ILS",
        name: (import.meta.env.VITE_CURRENCY_NAME as string) ?? "Israeli New Shekel",
    },
    adminGroupName: (import.meta.env.VITE_ADMIN_GROUP_NAME as string) ?? "ADMIN",
    supportGroupName: (import.meta.env.VITE_SUPPORT_GROUP_NAME as string) ?? "SUPPORT",
    defaultPageSize: Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE ?? "10") || 10,
    maxPortsPerStation: Number(import.meta.env.VITE_MAX_PORTS_PER_STATION ?? "22") || 22,
    pollingIntervalMs: import.meta.env.VITE_POLLING_INTERVAL_MS,
}