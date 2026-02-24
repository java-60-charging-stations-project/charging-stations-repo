import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { techSupportAPI } from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { ErrorLog, TechSupportStats, ErrorFilters } from '@/types'

interface TechSupportState {
  errors: ErrorLog[]
  stats: TechSupportStats | null
  loading: boolean
  error: string | null
}

const initialState: TechSupportState = {
  errors: [],
  stats: null,
  loading: false,
  error: null,
}

export const fetchErrors = createAsyncThunk(
  'techSupport/fetchErrors',
  async (params: ErrorFilters | undefined, { rejectWithValue }) => {
    try {
      const { data } = await techSupportAPI.getErrors(params)
      return data.errors as ErrorLog[]
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка загрузки логов'))
    }
  }
)

export const fetchStats = createAsyncThunk(
  'techSupport/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await techSupportAPI.getStats()
      return data.stats as TechSupportStats
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка загрузки статистики'))
    }
  }
)

const techSupportSlice = createSlice({
  name: 'techSupport',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchErrors.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchErrors.fulfilled, (state, action) => {
        state.loading = false
        state.errors = action.payload
      })
      .addCase(fetchErrors.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload
      })
  },
})

export default techSupportSlice.reducer
