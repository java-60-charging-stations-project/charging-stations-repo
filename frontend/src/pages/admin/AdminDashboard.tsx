import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const sections = [
  {
    to: '/admin/users',
    label: 'User Management',
    desc: 'Change roles, block or delete users',
    gradient: 'linear-gradient(135deg, #FF453A, #FF6B6B)',
    glow: 'rgba(255,69,58,0.25)',
  },
  {
    to: '/admin/stations',
    label: 'Stations Management',
    desc: 'Create, edit, and commission stations',
    gradient: 'linear-gradient(135deg, #30D158, #34C759)',
    glow: 'rgba(48,209,88,0.25)',
  },
  {
    to: '/admin/tariffs',
    label: 'Tariffs Management',
    desc: 'Configure pricing and billing rules',
    gradient: 'linear-gradient(135deg, #BF5AF2, #9B59B6)',
    glow: 'rgba(191,90,242,0.25)',
  },
  {
    to: '/support/dashboard',
    label: 'Operations Dashboard',
    desc: 'Monitor system health and active errors',
    gradient: 'linear-gradient(135deg, #FF9F0A, #FF6B35)',
    glow: 'rgba(255,159,10,0.25)',
  },
]

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ios-label tracking-tight">Admin Dashboard</h1>
        <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
          Welcome, {user?.email?.split('@')[0]}. Full system control.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ to, label, desc, gradient, glow }) => (
          <Link
            key={to}
            to={to}
            className="glass rounded-3xl p-6 card-hover block group"
            style={{ '--glow': glow } as React.CSSProperties}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 transition-transform duration-300 group-hover:scale-110"
              style={{ background: gradient, boxShadow: `0 6px 20px ${glow}` }}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-ios-label text-base">{label}</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
