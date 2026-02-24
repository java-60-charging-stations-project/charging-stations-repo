import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

const savedUser = localStorage.getItem('user')

const initialState: AuthState = {
  user: savedUser ? (JSON.parse(savedUser) as User) : null,
  loading: false,
  error: null,
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('accessToken', data.accessToken ?? data.idToken ?? '')
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка входа'))
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.register(userData as never)
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка регистрации'))
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.error = null
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = {
          userId: action.payload.userId,
          email: action.payload.email ?? '',
          role: action.payload.role as User['role'],
        }
        localStorage.setItem('user', JSON.stringify(state.user))
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
