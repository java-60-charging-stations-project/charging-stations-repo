import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'


const BoltIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const Divider = () => (
  <div className="w-px h-5 mx-1 rounded-full" style={{ background: 'rgba(60,60,67,0.15)' }} />
)

const MobileDivider = () => (
  <div className="h-px my-2 rounded-full" style={{ background: 'rgba(60,60,67,0.1)' }} />
)

export default function Navbar() {
  const { user, logout, isAdmin, isTechSupport, isAuthenticated } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string): boolean =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  const linkClass = (path: string): string =>
    isActive(path) ? 'nav-link-active' : 'nav-link'

  const closeMobile = () => setMobileMenuOpen(false)

  const roleColors = isAdmin ? 'badge-purple' : isTechSupport ? 'badge-blue' : 'badge-green'

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #30D158, #0A84FF)' }}>
              <BoltIcon />
            </div>
            <span className="font-bold text-lg text-ios-label hidden sm:inline tracking-tight">
              EV Charge
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center space-x-1 bg-ios-fill rounded-2xl px-2 py-1.5">
            <Link to="/stations" className={linkClass('/stations')}>Stations</Link>

            {isAuthenticated && (
              <>
                <Link to="/sessions/current" className={linkClass('/sessions/current')}>Charging</Link>
                <Link to="/sessions/history" className={linkClass('/sessions/history')}>History</Link>
              </>
            )}

            {(isTechSupport || isAdmin) && (
              <>
                <Divider />
                <Link to="/support/dashboard" className={linkClass('/support/dashboard')}>Dashboard</Link>
                <Link to="/support/logs" className={linkClass('/support/logs')}>Logs</Link>
                <Link to="/support/stations" className={linkClass('/support/stations')}>Stations</Link>
                <Link to="/support/sessions" className={linkClass('/support/sessions')}>Sessions</Link>
              </>
            )}

            {isAdmin && (
              <>
                <Divider />
                <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>Admin</Link>
                <Link to="/admin/users" className={linkClass('/admin/users')}>Users</Link>
                <Link to="/admin/tariffs" className={linkClass('/admin/tariffs')}>Tariffs</Link>
              </>
            )}
          </div>

          {/* Right: profile / guest actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center space-x-2.5">
                  <Link
                    to="/account/profile"
                    className="text-sm font-medium truncate max-w-[140px] hover:underline"
                    style={{ color: 'rgba(60,60,67,0.7)' }}
                  >
                    {user?.email}
                  </Link>
                  <span className={roleColors}>{user?.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ color: '#FF453A', background: 'rgba(255,69,58,0.08)' }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'rgba(255,69,58,0.14)')}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'rgba(255,69,58,0.08)')}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ color: 'rgba(60,60,67,0.7)', background: 'rgba(120,120,128,0.08)' }}
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-1.5 rounded-xl text-sm font-medium text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #30D158, #0A84FF)' }}
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
              style={{ background: 'rgba(120,120,128,0.1)' }}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass border-t border-white/50 animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            <Link to="/stations" className={`block ${linkClass('/stations')}`} onClick={closeMobile}>Stations</Link>

            {isAuthenticated && (
              <>
                <Link to="/sessions/current" className={`block ${linkClass('/sessions/current')}`} onClick={closeMobile}>Charging</Link>
                <Link to="/sessions/history" className={`block ${linkClass('/sessions/history')}`} onClick={closeMobile}>History</Link>
                <Link to="/account/profile" className={`block ${linkClass('/account/profile')}`} onClick={closeMobile}>Profile</Link>
                <Link to="/account/settings" className={`block ${linkClass('/account/settings')}`} onClick={closeMobile}>Settings</Link>
              </>
            )}

            {(isTechSupport || isAdmin) && (
              <>
                <MobileDivider />
                <Link to="/support/dashboard" className={`block ${linkClass('/support/dashboard')}`} onClick={closeMobile}>Dashboard</Link>
                <Link to="/support/logs" className={`block ${linkClass('/support/logs')}`} onClick={closeMobile}>Error Logs</Link>
                <Link to="/support/stations" className={`block ${linkClass('/support/stations')}`} onClick={closeMobile}>Stations</Link>
                <Link to="/support/sessions" className={`block ${linkClass('/support/sessions')}`} onClick={closeMobile}>Active Sessions</Link>
              </>
            )}

            {isAdmin && (
              <>
                <MobileDivider />
                <Link to="/admin/dashboard" className={`block ${linkClass('/admin/dashboard')}`} onClick={closeMobile}>Admin Dashboard</Link>
                <Link to="/admin/users" className={`block ${linkClass('/admin/users')}`} onClick={closeMobile}>Users</Link>
                <Link to="/admin/stations" className={`block ${linkClass('/admin/stations')}`} onClick={closeMobile}>Stations</Link>
                <Link to="/admin/tariffs" className={`block ${linkClass('/admin/tariffs')}`} onClick={closeMobile}>Tariffs</Link>
              </>
            )}
          </div>

          <div className="border-t border-white/40 px-4 py-4 flex items-center justify-between">
            {isAuthenticated ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-ios-label truncate">{user?.email}</p>
                  <span className={`${roleColors} mt-1`}>{user?.role}</span>
                </div>
                <button
                  onClick={() => { logout(); closeMobile() }}
                  className="text-sm font-semibold px-3 py-1.5 rounded-xl"
                  style={{ color: '#FF453A', background: 'rgba(255,69,58,0.1)' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Link
                  to="/register"
                  onClick={closeMobile}
                  className="flex-1 text-center py-2 rounded-xl text-sm font-medium"
                  style={{ color: 'rgba(60,60,67,0.7)', background: 'rgba(120,120,128,0.08)' }}
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="flex-1 text-center py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #30D158, #0A84FF)' }}
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
