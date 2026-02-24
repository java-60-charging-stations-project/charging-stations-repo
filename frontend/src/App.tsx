import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/auth/ProtectedRoute'
import Login from '@/auth/Login'
import Register from '@/auth/Register'

import NotFound from '@/pages/error/NotFound'
import ErrorForbidden from '@/pages/error/ErrorForbidden'
import ErrorSystem from '@/pages/error/ErrorSystem'

import Dashboard from '@/pages/Dashboard'
import StationList from '@/pages/user/StationList'
import StationDetail from '@/pages/user/StationDetail'
import ChargingSession from '@/pages/user/ChargingSession'
import SessionHistory from '@/pages/user/SessionHistory'

import Profile from '@/pages/account/Profile'
import Settings from '@/pages/account/Settings'

import SupportDashboard from '@/pages/support/SupportDashboard'
import SupportSessions from '@/pages/support/SupportSessions'
import ErrorLog from '@/pages/techSupport/ErrorLog'
import StationManagement from '@/pages/techSupport/StationManagement'

import AdminDashboard from '@/pages/admin/AdminDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import StationAdmin from '@/pages/admin/StationAdmin'
import TariffManagement from '@/pages/admin/TariffManagement'

const SUPPORT = ['TECH_SUPPORT', 'ADMIN']
const ADMIN = ['ADMIN']

function Wrap({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
      <Route path="/error/forbidden" element={<ErrorForbidden />} />
      <Route path="/error/system" element={<ErrorSystem />} />

      {/* Root → Dashboard */}
      <Route path="/" element={<ProtectedRoute><Wrap><Dashboard /></Wrap></ProtectedRoute>} />

      {/* Stations */}
      <Route path="/stations" element={<ProtectedRoute><Wrap><StationList /></Wrap></ProtectedRoute>} />
      <Route path="/stations/:id" element={<ProtectedRoute><Wrap><StationDetail /></Wrap></ProtectedRoute>} />

      {/* Sessions */}
      <Route path="/sessions/current" element={<ProtectedRoute><Wrap><ChargingSession /></Wrap></ProtectedRoute>} />
      <Route path="/sessions/history" element={<ProtectedRoute><Wrap><SessionHistory /></Wrap></ProtectedRoute>} />

      {/* Account */}
      <Route path="/account/profile" element={<ProtectedRoute><Wrap><Profile /></Wrap></ProtectedRoute>} />
      <Route path="/account/settings" element={<ProtectedRoute><Wrap><Settings /></Wrap></ProtectedRoute>} />

      {/* Tech Support */}
      <Route path="/support/dashboard" element={<ProtectedRoute roles={SUPPORT}><Wrap><SupportDashboard /></Wrap></ProtectedRoute>} />
      <Route path="/support/logs" element={<ProtectedRoute roles={SUPPORT}><Wrap><ErrorLog /></Wrap></ProtectedRoute>} />
      <Route path="/support/stations" element={<ProtectedRoute roles={SUPPORT}><Wrap><StationManagement /></Wrap></ProtectedRoute>} />
      <Route path="/support/sessions" element={<ProtectedRoute roles={SUPPORT}><Wrap><SupportSessions /></Wrap></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={ADMIN}><Wrap><AdminDashboard /></Wrap></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={ADMIN}><Wrap><UserManagement /></Wrap></ProtectedRoute>} />
      <Route path="/admin/stations" element={<ProtectedRoute roles={ADMIN}><Wrap><StationAdmin /></Wrap></ProtectedRoute>} />
      <Route path="/admin/tariffs" element={<ProtectedRoute roles={ADMIN}><Wrap><TariffManagement /></Wrap></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
