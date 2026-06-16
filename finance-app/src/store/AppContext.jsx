import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData, getSettings, saveSettings } from './storage'
import { getUserFamily, getUserFamilyId, getFamily, getFamilyAsync, subscribeToFamily } from './family'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'

const AppContext = createContext(null)

export const INCOME_CATEGORIES = []
export const EXPENSE_CATEGORIES = []

export function AppProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser)
  const [transactions, setTransactions] = useState([])
  const [trash, setTrash] = useState([])
  const [debts, setDebts] = useState([])
  const [settings, setSettingsState] = useState({ rates: { USD: 12700, EUR: 13800, RUB: 140 } })
  const [family, setFamily] = useState(null)
  const [familyId, setFamilyId] = useState(() => getUserFamilyId(user?.id))
  const [syncing, setSyncing] = useState(false)
  const skipCloudUpdate = useRef(false)

  const uid = user?.id

  // Boshlang'ich yuklash: avval localStorage, keyin cloud
  useEffect(() => {
    if (!uid) return

    // Lokal ma'lumotlarni darhol yuklash
    setTransactions(getData('transactions', uid))
    setDebts(getData('debts', uid))
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const savedTrash = (getData('trash', uid) || []).filter(t => new Date(t.deletedAt).getTime() > thirtyDaysAgo)
    setTrash(savedTrash)
    saveData('trash', uid, savedTrash)
    const s = getSettings(uid)
    setSettingsState(s.rates ? s : { rates: { USD: 12700, EUR: 13800, RUB: 140 } })
    setFamily(getUserFamily(uid))

    // Cloud dan yangi ma'lumot bo'lsa yuklash
    const loadCloud = async () => {
      setSyncing(true)
      const [cloudTx, cloudDebts, cloudSettings] = await Promise.all([
        loadFromCloud(uid, 'transactions'),
        loadFromCloud(uid, 'debts'),
        loadFromCloud(uid, 'settings'),
      ])
      if (cloudTx) { setTransactions(cloudTx); saveData('transactions', uid, cloudTx) }
      if (cloudDebts) { setDebts(cloudDebts); saveData('debts', uid, cloudDebts) }
      if (cloudSettings?.rates) { setSettingsState(cloudSettings); saveSettings(uid, cloudSettings) }
      setSyncing(false)
    }
    loadCloud()

    // Real-vaqt tinglash — boshqa qurilmadan o'zgarish bo'lsa darhol yangilanadi
    const unsubTx = subscribeToCloud(uid, 'transactions', (data) => {
      if (skipCloudUpdate.current) return
      setTransactions(data)
      saveData('transactions', uid, data)
    })
    const unsubDebts = subscribeToCloud(uid, 'debts', (data) => {
      if (skipCloudUpdate.current) return
      setDebts(data)
      saveData('debts', uid, data)
    })
    const unsubSettings = subscribeToCloud(uid, 'settings', (data) => {
      if (skipCloudUpdate.current) return
      if (data?.rates) { setSettingsState(data); saveSettings(uid, data) }
    })

    return () => { unsubTx(); unsubDebts(); unsubSettings() }
  }, [uid])

  // Oila real-vaqt sinxronizatsiyasi — har qanday a'zo o'zgartirganda darhol yangilanadi
  useEffect(() => {
    if (!familyId) { setFamily(null); return }
    // Avval localStorage dan darhol ko'rsatish
    const local = getFamily(familyId)
    if (local) setFamily(local)
    // Keyin Firestore dan real-vaqt tinglash
    const unsub = subscribeToFamily(familyId, (data) => {
      setFamily(data)
    })
    return () => unsub()
  }, [familyId])

  const refreshFamily = useCallback(() => {
    if (uid) {
      const fid = getUserFamilyId(uid)
      setFamilyId(fid || null)
    }
  }, [uid])

  const saveTransactions = useCallback((data) => {
    setTransactions(data)
    if (uid) {
      saveData('transactions', uid, data)
      skipCloudUpdate.current = true
      syncToCloud(uid, 'transactions', data).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [uid])

  const saveTrash = useCallback((data) => {
    setTrash(data)
    if (uid) saveData('trash', uid, data)
  }, [uid])

  const softDeleteTransactions = useCallback((ids) => {
    const idSet = new Set(ids)
    const toTrash = transactions.filter(t => idSet.has(t.id)).map(t => ({ ...t, deletedAt: new Date().toISOString() }))
    saveTrash([...trash, ...toTrash])
    saveTransactions(transactions.filter(t => !idSet.has(t.id)))
  }, [transactions, trash, saveTransactions, saveTrash])

  const restoreTransaction = useCallback((id) => {
    const tx = trash.find(t => t.id === id)
    if (!tx) return
    const { deletedAt, ...restored } = tx
    saveTransactions([...transactions, restored])
    saveTrash(trash.filter(t => t.id !== id))
  }, [trash, transactions, saveTransactions, saveTrash])

  const permanentDelete = useCallback((id) => {
    saveTrash(trash.filter(t => t.id !== id))
  }, [trash, saveTrash])

  const saveDebts = useCallback((data) => {
    setDebts(data)
    if (uid) {
      saveData('debts', uid, data)
      skipCloudUpdate.current = true
      syncToCloud(uid, 'debts', data).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [uid])

  const updateSettings = useCallback((s) => {
    setSettingsState(s)
    if (uid) {
      saveSettings(uid, s)
      syncToCloud(uid, 'settings', s)
    }
  }, [uid])

  const balance = transactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount
  }, 0)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const userRole = family
    ? (family.members.find(m => m.userId === uid)?.role || null)
    : null

  const familyMembers = family?.members || []
  const familyTransactions = family?.transactions || []
  const familyDebts = family?.debts || []

  const canEdit = (ownerId) => {
    if (!userRole) return false
    if (userRole === 'admin') return true
    if (userRole === 'member' && ownerId === uid) return true
    return false
  }

  const canAdd = () => userRole === 'admin' || userRole === 'member'

  const allActiveTx = family ? familyTransactions : transactions
  const getCurrencyBalance = (currency = 'UZS') =>
    allActiveTx
      .filter(t => (t.currency || 'UZS') === currency)
      .reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)

  return (
    <AppContext.Provider value={{
      user, setUser,
      transactions, saveTransactions,
      trash, softDeleteTransactions, restoreTransaction, permanentDelete,
      debts, saveDebts,
      settings, updateSettings,
      balance, totalIncome, totalExpense,
      family, setFamily, refreshFamily,
      userRole, familyMembers,
      familyTransactions, familyDebts,
      canEdit, canAdd,
      getCurrencyBalance,
      syncing
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
