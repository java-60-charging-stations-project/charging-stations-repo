export const config = {
  logLevel: import.meta.env.VITE_LOG_LEVEL as string | undefined,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  apiPrefix: (import.meta.env.VITE_API_PREFIX as string | undefined) ?? '/api',
}
