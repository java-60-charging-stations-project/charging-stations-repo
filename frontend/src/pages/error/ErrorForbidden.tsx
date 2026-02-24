import { Link } from 'react-router-dom'

export default function ErrorForbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)' }}>
      <div className="glass rounded-3xl p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #FF453A, #FF6B6B)', boxShadow: '0 8px 32px rgba(255,69,58,0.35)' }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">403</h1>
        <h2 className="text-xl font-semibold text-white mb-3">Access Denied</h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(235,235,245,0.55)' }}>
          You don't have permission to access this page. Contact your administrator if you think this is a mistake.
        </p>
        <Link to="/" className="btn-ios-primary inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
