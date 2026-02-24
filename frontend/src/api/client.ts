import axios from 'axios'
import { config } from '@/services/config/env'

const client = axios.create({
  baseURL: config.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

// TODO(auth): remove Authorization header injection after BFF migration.
// Browser will send the httpOnly session cookie automatically — no manual header needed.
// Also add withCredentials: true to the axios instance config above.
client.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token) reqConfig.headers.Authorization = `Bearer ${token}`
  return reqConfig
})

client.interceptors.response.use(
  (response) => response,
  (error: { response?: { status: number } }) => {
    const status = error.response?.status
    if (status === 401) {
      // TODO(auth): after BFF migration, 401 means the httpOnly cookie expired.
      // Server will handle cookie invalidation; frontend just redirects to login.
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      const redirect = encodeURIComponent(window.location.pathname)
      window.location.href = `/login?redirect=${redirect}`
    } else if (status === 403) {
      window.location.href = '/error/forbidden'
    } else if (status && status >= 500) {
      window.location.href = '/error/system'
    }
    return Promise.reject(error)
  }
)

export default client

export const authAPI = {
  register: (data: { email: string; password: string; name: string; phoneNumber?: string }) =>
    client.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    client.post<{ accessToken?: string; idToken?: string; refreshToken?: string; userId: string; email?: string; role: string }>(
      '/auth/login',
      data
    ),
  refresh: (refreshToken: string) => client.post('/auth/refresh', { refreshToken }),
}

export const stationsAPI = {
  list: (status?: string) => client.get('/stations', { params: status ? { status } : {} }),
  get: (id: string) => client.get(`/stations/${id}`),
  create: (data: Record<string, unknown>) => client.post('/stations', data),
  updateStatus: (id: string, status: string) => client.patch(`/stations/${id}/status`, { status }),
  updateTariff: (id: string, tariffPerKwh: number) => client.patch(`/stations/${id}/tariff`, { tariffPerKwh }),
}

export const sessionsAPI = {
  start: (data: Record<string, unknown>) => client.post('/sessions/start', data),
  stop: (id: string) => client.post(`/sessions/${id}/stop`),
  getActive: () => client.get('/sessions/active'),
  getHistory: () => client.get('/sessions/history'),
  getAll: (status?: string) => client.get('/sessions/all', { params: status ? { status } : {} }),
  get: (id: string) => client.get(`/sessions/${id}`),
}

export const adminAPI = {
  listUsers: () => client.get('/admin/users'),
  changeRole: (id: string, role: string) => client.patch(`/admin/users/${id}/role`, { role }),
  blockUser: (id: string, blocked: boolean) => client.patch(`/admin/users/${id}/block`, { blocked }),
  deleteUser: (id: string) => client.delete(`/admin/users/${id}`),
  createStation: (data: Record<string, unknown>) => client.post('/admin/stations', data),
  commissionStation: (id: string) => client.patch(`/admin/stations/${id}/commission`),
  updateTariff: (id: string, tariffPerKwh: number) => client.patch(`/admin/stations/${id}/tariff`, { tariffPerKwh }),
}

export const techSupportAPI = {
  getErrors: (params?: Record<string, unknown>) => client.get('/tech-support/errors', { params }),
  updateErrorStatus: (id: string, status: string, timestamp?: string) =>
    client.patch(`/tech-support/errors/${id}/status`, { status, timestamp }),
  setStationMode: (id: string, status: string) => client.patch(`/tech-support/stations/${id}/mode`, { status }),
  forceStopSession: (id: string) => client.post(`/tech-support/sessions/${id}/force-stop`),
  getStats: () => client.get('/tech-support/stats'),
}
