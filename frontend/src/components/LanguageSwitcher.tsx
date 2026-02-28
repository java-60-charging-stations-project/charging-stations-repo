import { useState, useEffect, useRef } from 'react'
import { useI18n, LANGUAGES } from '@/i18n/I18nContext'

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const isRtl = lang.dir === 'rtl'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
        style={{ background: 'rgba(120,120,128,0.08)' }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'rgba(120,120,128,0.14)')}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'rgba(120,120,128,0.08)')}
      >
        <span className="text-base leading-none">{lang.flag}</span>
        <span className="hidden sm:inline" style={{ color: 'rgba(60,60,67,0.7)' }}>{lang.code.toUpperCase()}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'rgba(60,60,67,0.4)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 py-1.5 rounded-2xl shadow-lg animate-fade-in z-50 min-w-[170px]"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(230,230,230,0.6)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.9) inset',
            [isRtl ? 'left' : 'right']: 0,
          }}
        >
          {LANGUAGES.map(l => {
            const active = l.code === lang.code
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l); setOpen(false) }}
                dir={l.dir}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                style={{
                  color: active ? '#0A84FF' : '#1C1C1E',
                  background: active ? 'rgba(10,132,255,0.08)' : 'transparent',
                  textAlign: l.dir === 'rtl' ? 'right' : 'left',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (!active) e.currentTarget.style.background = 'rgba(120,120,128,0.08)' }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = active ? 'rgba(10,132,255,0.08)' : 'transparent' }}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {active && (
                  <svg className="w-4 h-4 shrink-0" style={{ color: '#0A84FF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
