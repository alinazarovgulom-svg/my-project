import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCurrentUser, getData, saveData, getSettings, saveSettings } from './storage'

const AppContext = createContext(null)

export const INCOME_CATEGORIES = [
  'Maosh', 'Biznes', 'Freelance', 'Investitsiya', 'Sovg\'a', 'Boshqa kirim'
]
export const EXPENSE_CATEGORIES = [
  'Oziq-ovqat', 'Transport', 'Uy-joy', 'Kiyim', 'Sog\'liq', 'Ta\'lim',
  'Ko\'ngilochar', 'Kommunal', 'Telefon/Internet', 'Boshqa chiqim'
]

export function AppProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser)
  const [transactions, setTransactions] = useState([])
  const [debts, setDebts] = useState([])
  const [settings, setSettingsState] = useState({ rates: { USD: 12700, EUR: 13800, RUB: 140 } })

  const uid = user?.id

  useEffect(() => {
    if (uid) {
      setTransactions(getData('transactions', uid))
      setDebts(getData('debts', uid))
      const s = getSettings(uid)
      setSettingsState(s.rates ? s : { rates: { USD: 12700, EUR: 13800, RUB: 140 } })
    }
  }, [uid])

  const saveTransactions = useCallback((data) => {
    setTransactions(data)
    if (uid) saveData('transactions', uid, data)
  }, [uid])

  const saveDebts = useCallback((data) => {
    setDebts(data)
    if (uid) saveData('debts', uid, data)
  }, [uid])

  const updateSettings = useCallback((s) => {
    setSettingsState(s)
    if (uid) saveSettings(uid, s)
  }, [uid])

  const balance = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount
  }, 0)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <AppContext.Provider value={{
      user, setUser,
      transactions, saveTransactions,
      debts, saveDebts,
      settings, updateSettings,
      balance, totalIncome, totalExpense
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
