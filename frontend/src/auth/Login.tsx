import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#FAFAF7' }}>

      {/* Subtle warm glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(48,209,88,0.05) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <div className="glass rounded-4xl p-8 sm:p-10">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 text-white shadow-glow-green"
              style={{ background: 'linear-gradient(135deg, #30D158 0%, #0A84FF 100%)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ios-label tracking-tight">EV Charging Station</h1>
            <p className="text-sm mt-1.5" style={{ color: 'rgba(60,60,67,0.55)' }}>Войдите в свой аккаунт</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-2xl text-sm font-medium animate-fade-in"
              style={{ background: 'rgba(255,69,58,0.1)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(60,60,67,0.7)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="input-ios"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(60,60,67,0.7)' }}>
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="input-ios"
                placeholder="Введите пароль"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-ios-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Входим...
                </span>
              ) : 'Войти'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'rgba(60,60,67,0.55)' }}>
            Нет аккаунта?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#0A84FF' }}>
              Зарегистрироваться
            </Link>
          </p>

          {/* Dev hint */}
          <div className="mt-6 px-4 py-3 rounded-2xl text-xs" style={{ background: 'rgba(120,120,128,0.08)', color: 'rgba(60,60,67,0.5)' }}>
            <p className="font-semibold mb-1">Dev режим — быстрый вход:</p>
            <p>user@test.com / admin@test.com / tech@test.com</p>
            <p>Любой пароль</p>
          </div>
        </div>
      </div>
    </div>
  )
}
