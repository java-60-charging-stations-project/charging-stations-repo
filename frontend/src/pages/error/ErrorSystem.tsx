import { useNavigate } from 'react-router-dom'

export default function ErrorSystem() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)' }}>
      <div className="glass rounded-3xl p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #FF9F0A, #FF6B35)', boxShadow: '0 8px 32px rgba(255,159,10,0.35)' }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">500</h1>
        <h2 className="text-xl font-semibold text-white mb-3">Server Error</h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(235,235,245,0.55)' }}>
          Something went wrong on our end. The team has been notified. Please try again in a moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="btn-ios-primary">
            Go Back
          </button>
          <button onClick={() => navigate('/')} className="btn-ios-blue">
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
