import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { fetchStats } from '@/store/slices/techSupportSlice'
import type { AppDispatch, RootState } from '@/store'
import type { TechSupportStats } from '@/types'

export default function SupportDashboard() {
  const dispatch = useDispatch<AppDispatch>()
  const { stats, loading, error } = useSelector((state: RootState) => state.techSupport)

  useEffect(() => {
    dispatch(fetchStats())
  }, [dispatch])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ios-label tracking-tight">Operations Dashboard</h1>
        <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
          Active requests, errors, and system overview
        </p>
      </div>

      {loading && (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'rgba(10,132,255,0.2)', borderTopColor: '#0A84FF' }} />
          <p className="text-sm" style={{ color: 'rgba(60,60,67,0.55)' }}>Loading stats...</p>
        </div>
      )}

      {error && (
        <div className="glass rounded-3xl p-6" style={{ border: '1px solid rgba(255,69,58,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: '#FF453A' }}>Failed to load stats</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>{error as string}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Active Sessions', value: (stats as TechSupportStats).activeSessions ?? '—', color: '#30D158' },
            { label: 'Total Stations', value: (stats as TechSupportStats).totalStations ?? '—', color: '#0A84FF' },
            { label: 'Unresolved Errors', value: (stats as TechSupportStats).unresolvedErrors ?? '—', color: '#FF453A' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass rounded-3xl p-6">
              <p className="text-sm font-medium mb-2" style={{ color: 'rgba(60,60,67,0.55)' }}>{label}</p>
              <p className="text-4xl font-bold" style={{ color }}>{String(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/support/logs', label: 'Error Logs', desc: 'Review and resolve error reports', color: '#FF453A' },
          { to: '/support/stations', label: 'Stations', desc: 'Manage station modes and status', color: '#FF9F0A' },
          { to: '/support/sessions', label: 'Active Sessions', desc: 'Monitor and force-stop sessions', color: '#0A84FF' },
        ].map(({ to, label, desc, color }) => (
          <Link key={to} to={to} className="glass rounded-3xl p-6 card-hover block group">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 text-white text-lg font-bold"
              style={{ background: color, boxShadow: `0 4px 16px ${color}44` }}>
              →
            </div>
            <p className="font-semibold text-ios-label">{label}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(60,60,67,0.5)' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
