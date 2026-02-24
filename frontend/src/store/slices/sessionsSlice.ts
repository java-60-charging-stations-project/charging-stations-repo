import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { sessionsAPI } from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { Session, StartChargingParams } from '@/types'

interface SessionsState {
  activeSession: Session | null
  history: Session[]
  allSessions: Session[]
  loading: boolean
  error: string | null
}

const initialState: SessionsState = {
  activeSession: null,
  history: [],
  allSessions: [],
  loading: false,
  error: null,
}

export const fetchActiveSession = createAsyncThunk(
  'sessions/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await sessionsAPI.getActive()
      return (data.session as Session) ?? null
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка загрузки сессии'))
    }
  }
)

export const fetchSessionHistory = createAsyncThunk(
  'sessions/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await sessionsAPI.getHistory()
      return data.sessions as Session[]
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка загрузки истории'))
    }
  }
)

export const startCharging = createAsyncThunk(
  'sessions/start',
  async (params: StartChargingParams, { rejectWithValue }) => {
    try {
      const { data } = await sessionsAPI.start(params)
      return data.session as Session
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Не удалось запустить зарядку'))
    }
  }
)

export const fetchAllSessions = createAsyncThunk(
  'sessions/fetchAll',
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      const { data } = await sessionsAPI.getAll(status)
      return data.sessions as Session[]
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка загрузки сессий'))
    }
  }
)

export const forceStopSession = createAsyncThunk(
  'sessions/forceStop',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const { data } = await sessionsAPI.stop(sessionId)
      return data.session as Session
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка принудительной остановки'))
    }
  }
)

export const stopCharging = createAsyncThunk(
  'sessions/stop',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const { data } = await sessionsAPI.stop(sessionId)
      return data.session as Session
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Не удалось остановить зарядку'))
    }
  }
)

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    clearSessionError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSession.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchActiveSession.fulfilled, (state, action) => {
        state.loading = false
        state.activeSession = action.payload
      })
      .addCase(fetchActiveSession.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchSessionHistory.fulfilled, (state, action) => {
        state.history = action.payload
      })
      .addCase(startCharging.fulfilled, (state, action) => {
        state.activeSession = action.payload
        state.error = null
      })
      .addCase(startCharging.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(stopCharging.fulfilled, (state) => {
        state.activeSession = null
      })
      .addCase(stopCharging.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(fetchAllSessions.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchAllSessions.fulfilled, (state, action) => {
        state.loading = false
        state.allSessions = action.payload
      })
      .addCase(fetchAllSessions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(forceStopSession.fulfilled, (state, action) => {
        state.allSessions = state.allSessions.filter(
          (s) => s.sessionId !== action.payload.sessionId
        )
      })
      .addCase(forceStopSession.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { clearSessionError } = sessionsSlice.actions
export default sessionsSlice.reducer
