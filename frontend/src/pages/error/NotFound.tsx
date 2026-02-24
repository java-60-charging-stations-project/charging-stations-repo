import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)' }}>
      <div className="glass rounded-3xl p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #636366, #8E8E93)', boxShadow: '0 8px 32px rgba(99,99,102,0.35)' }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-white mb-3">Page Not Found</h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(235,235,245,0.55)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-ios-primary inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
