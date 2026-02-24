import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAllSessions, forceStopSession } from '@/store/slices/sessionsSlice'
import type { AppDispatch, RootState } from '@/store'
import type { Session } from '@/types'

export default function SupportSessions() {
  const dispatch = useDispatch<AppDispatch>()
  const { allSessions, loading, error } = useSelector((state: RootState) => state.sessions)

  useEffect(() => {
    dispatch(fetchAllSessions('ACTIVE'))
  }, [dispatch])

  const handleForceStop = (sessionId: string) => {
    if (window.confirm('Force stop this session?')) {
      dispatch(forceStopSession(sessionId))
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ios-label tracking-tight">Active Sessions</h1>
        <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
          Monitor and manage all active charging sessions
        </p>
      </div>

      {loading && (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'rgba(10,132,255,0.2)', borderTopColor: '#0A84FF' }} />
          <p className="text-sm" style={{ color: 'rgba(60,60,67,0.55)' }}>Loading sessions...</p>
        </div>
      )}

      {error && (
        <div className="glass rounded-3xl p-6" style={{ border: '1px solid rgba(255,69,58,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: '#FF453A' }}>{error as string}</p>
        </div>
      )}

      {!loading && !error && allSessions.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-ios-label font-semibold">No active sessions</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(60,60,67,0.5)' }}>All stations are idle</p>
        </div>
      )}

      <div className="space-y-3">
        {allSessions.map((session: Session) => (
          <div key={session.sessionId} className="glass rounded-3xl p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-ios-label truncate">{session.sessionId}</p>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(60,60,67,0.55)' }}>
                Station: {session.stationId} · Port: {session.portId}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(60,60,67,0.45)' }}>
                {session.energyConsumedKwh?.toFixed(2) ?? '0.00'} kWh · {session.totalCost?.toFixed(2) ?? '0.00'} ₽
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs px-3 py-1 rounded-xl font-medium"
                style={{ background: 'rgba(48,209,88,0.12)', color: '#30D158' }}>
                {session.status}
              </span>
              <button
                onClick={() => handleForceStop(session.sessionId)}
                className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
                style={{ background: 'rgba(255,69,58,0.1)', color: '#FF453A' }}
              >
                Force Stop
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
