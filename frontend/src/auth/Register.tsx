import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface RegisterForm {
  email: string
  password: string
  name: string
  phoneNumber: string
}

interface FieldConfig {
  label: string
  name: keyof RegisterForm
  type: string
  placeholder: string
  required?: boolean
  minLength?: number
}

export default function Register() {
  const [form, setForm] = useState<RegisterForm>({ email: '', password: '', name: '', phoneNumber: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    try {
      await register(form.email, form.password, form.name, form.phoneNumber)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }

  const fields: FieldConfig[] = [
    { label: 'Полное имя', name: 'name', type: 'text', placeholder: 'Иван Иванов', required: true },
    { label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com', required: true },
    { label: 'Пароль', name: 'password', type: 'password', placeholder: 'Минимум 8 символов', required: true, minLength: 8 },
    { label: 'Телефон (необязательно)', name: 'phoneNumber', type: 'text', placeholder: '+7 (999) 000-00-00' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#FAFAF7' }}>

      {/* Subtle warm glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(10,132,255,0.04) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
        <div className="glass rounded-4xl p-8 sm:p-10">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 text-white shadow-glow-blue"
              style={{ background: 'linear-gradient(135deg, #0A84FF 0%, #BF5AF2 100%)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ios-label tracking-tight">Создать аккаунт</h1>
            <p className="text-sm mt-1.5" style={{ color: 'rgba(60,60,67,0.55)' }}>Присоединяйтесь к EV сети</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-2xl text-sm font-medium animate-fade-in"
              style={{ background: 'rgba(255,69,58,0.1)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.2)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 px-4 py-3 rounded-2xl text-sm font-medium animate-fade-in"
              style={{ background: 'rgba(48,209,88,0.1)', color: '#28B14C', border: '1px solid rgba(48,209,88,0.2)' }}>
              Регистрация прошла успешно! Перенаправляем...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ label, name, ...inputProps }) => (
              <div key={name}>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(60,60,67,0.7)' }}>
                  {label}
                </label>
                <input
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  className="input-ios"
                  {...inputProps}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-ios-blue w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Создаём...
                </span>
              ) : 'Создать аккаунт'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'rgba(60,60,67,0.55)' }}>
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#30D158' }}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
