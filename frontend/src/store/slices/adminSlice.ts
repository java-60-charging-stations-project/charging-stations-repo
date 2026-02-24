import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminAPI } from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { User } from '@/types'

interface AdminState {
  users: User[]
  loading: boolean
  error: string | null
}

const initialState: AdminState = {
  users: [],
  loading: false,
  error: null,
}

export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await adminAPI.listUsers()
      return data.users as User[]
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка загрузки пользователей'))
    }
  }
)

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export default adminSlice.reducer
