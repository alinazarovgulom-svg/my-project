import { createContext, useContext, useState } from 'react'
import { translations } from './translations'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('pulbek_lang') || 'uz')

  const setLang = (l) => {
    localStorage.setItem('pulbek_lang', l)
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
