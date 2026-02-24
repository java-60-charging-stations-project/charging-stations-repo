import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { stationsAPI } from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { Station } from '@/types'

interface StationsState {
  list: Station[]
  currentStation: Station | null
  loading: boolean
  error: string | null
}

const initialState: StationsState = {
  list: [],
  currentStation: null,
  loading: false,
  error: null,
}

export const fetchStations = createAsyncThunk(
  'stations/fetchAll',
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      const { data } = await stationsAPI.list(status)
      return data.stations as Station[]
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Не удалось загрузить станции'))
    }
  }
)

export const fetchStationDetail = createAsyncThunk(
  'stations/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await stationsAPI.get(id)
      return data.station as Station
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Станция не найдена'))
    }
  }
)

const stationsSlice = createSlice({
  name: 'stations',
  initialState,
  reducers: {
    clearCurrentStation(state) {
      state.currentStation = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStations.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStations.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchStations.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchStationDetail.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStationDetail.fulfilled, (state, action) => {
        state.loading = false
        state.currentStation = action.payload
      })
      .addCase(fetchStationDetail.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearCurrentStation } = stationsSlice.actions
export default stationsSlice.reducer
