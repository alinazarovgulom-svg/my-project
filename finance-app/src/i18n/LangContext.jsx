import { createContext, useContext, useState } from 'react'
import { translations, defaultLang } from './translations'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('pulsek_lang') || defaultLang)

  const setLang = (l) => {
    localStorage.setItem('pulsek_lang', l)
    setLangState(l)
  }

  const t = (key) => translations[lang]?.[key] || translations.uz[key] || key

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
