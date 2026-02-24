import { useAuth } from '@/hooks/useAuth'

export default function Profile() {
  const { user, logout } = useAuth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ios-label tracking-tight">Profile</h1>
        <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
          Your account details
        </p>
      </div>

      <div className="glass rounded-3xl p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(60,60,67,0.1)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #0A84FF, #5AC8FA)' }}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-ios-label text-lg">{user?.email}</p>
            <span className="badge-blue mt-1 inline-block">{user?.role}</span>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(60,60,67,0.45)' }}>Email</p>
            <p className="text-sm font-medium text-ios-label">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(60,60,67,0.45)' }}>User ID</p>
            <p className="text-sm font-mono text-ios-label">{user?.userId ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(60,60,67,0.45)' }}>Role</p>
            <p className="text-sm font-medium text-ios-label">{user?.role ?? '—'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 rounded-2xl text-sm font-semibold transition-all duration-200"
          style={{ color: '#FF453A', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
