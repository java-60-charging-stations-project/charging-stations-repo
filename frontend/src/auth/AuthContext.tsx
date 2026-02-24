import { createContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authAPI } from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import type { User } from '@/types'

export interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string, phoneNumber?: string) => Promise<unknown>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isTechSupport: boolean
  isUser: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO(auth): replace localStorage with in-memory state + silent refresh
  // once BFF is ready. user object will be restored via GET /api/auth/me
  // on app bootstrap using the httpOnly session cookie.
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? (JSON.parse(saved) as User) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TODO(auth): remove this effect entirely after BFF migration.
  // Session state will be managed server-side via httpOnly cookie.
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
    }
  }, [user])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await authAPI.login({ email, password })
      // TODO(auth): remove after BFF migration — token will live in httpOnly cookie set by server
      localStorage.setItem('accessToken', data.accessToken ?? data.idToken ?? '')
      const userData: User = {
        userId: data.userId,
        email: data.email ?? email,
        role: data.role as User['role'],
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }
      setUser(userData)
      return userData
    } catch (err) {
      const msg = getErrorMessage(err, 'Login failed')
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(
    async (email: string, password: string, name: string, phoneNumber?: string) => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await authAPI.register({ email, password, name, phoneNumber })
        return data
      } catch (err) {
        const msg = getErrorMessage(err, 'Registration failed')
        setError(msg)
        throw new Error(msg)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const logout = useCallback(() => {
    setUser(null)
    // TODO(auth): replace with POST /api/auth/logout which clears the httpOnly cookie server-side
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isTechSupport: user?.role === 'TECH_SUPPORT',
        isUser: user?.role === 'USER',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
