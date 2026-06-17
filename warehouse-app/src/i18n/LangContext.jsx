import { createContext, useContext, useState } from 'react'
import { translations, defaultLang } from './translations'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('omborbek_lang') || defaultLang)

  const changeLang = (l) => {
    setLang(l)
    localStorage.setItem('omborbek_lang', l)
  }

  const t = (key) => translations[lang]?.[key] || translations[defaultLang]?.[key] || key

  return (
    <LangContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
