import { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react'
import translations, { LangCode } from './translations'

export interface Language {
  code: LangCode
  label: string
  flag: string
  dir: 'ltr' | 'rtl'
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',    flag: '🇬🇧', dir: 'ltr' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺', dir: 'ltr' },
  { code: 'he', label: 'עברית',      flag: '🇮🇱', dir: 'rtl' },
]

const STORAGE_KEY = 'app-lang'

function resolve(): Language {
  const saved = localStorage.getItem(STORAGE_KEY)
  return LANGUAGES.find(l => l.code === saved) ?? LANGUAGES[0]
}

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
  dateLocale: string
  langCode: LangCode
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(resolve)

  const setLang = useCallback((l: Language) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l.code)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang.code
    document.documentElement.dir = lang.dir
  }, [lang])

  const t = useCallback((key: string): string => {
    const entry = translations[key]
    return entry?.[lang.code] ?? entry?.en ?? key
  }, [lang])

  const dateLocale = lang.code === 'uk' ? 'uk-UA' : lang.code === 'ru' ? 'ru-RU' : lang.code === 'he' ? 'he-IL' : 'en-US'

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dateLocale, langCode: lang.code }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
