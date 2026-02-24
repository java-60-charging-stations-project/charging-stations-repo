import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/error/forbidden" replace />
  }

  return children
}
