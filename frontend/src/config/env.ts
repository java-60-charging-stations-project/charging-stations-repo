
export const config = {
    logLevel: import.meta.env.VITE_LOG_LEVEL,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    apiPrefix: import.meta.env.VITE_API_URL_PREFIX,
    apiTimeout: import.meta.env.VITE_API_TIMEOUT,
    cognitoRegion: import.meta.env.VITE_COGNITO_REGION,
    cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
}