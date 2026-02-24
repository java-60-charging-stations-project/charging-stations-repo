import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import client from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { HealthResponse } from '@/types'

interface HealthState {
  response: HealthResponse | null
  loading: boolean
  error: string | null
  lastChecked: string | null
}

const initialState: HealthState = {
  response: null,
  loading: false,
  error: null,
  lastChecked: null,
}

export const checkHealth = createAsyncThunk(
  'health/check',
  async (options: { full?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const params = options?.full ? { full: 'true' } : {}
      const { data } = await client.get('/health', { params })
      return data as HealthResponse
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Сервис недоступен'))
    }
  }
)

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    clearHealth(state) {
      state.response = null
      state.error = null
      state.lastChecked = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkHealth.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(checkHealth.fulfilled, (state, action) => {
        state.loading = false
        state.response = action.payload
        state.lastChecked = new Date().toISOString()
      })
      .addCase(checkHealth.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.lastChecked = new Date().toISOString()
      })
  },
})

export const { clearHealth } = healthSlice.actions
export default healthSlice.reducer
