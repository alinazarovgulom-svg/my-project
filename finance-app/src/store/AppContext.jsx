import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData, getSettings, saveSettings } from './storage'
import { getUserFamily, getUserFamilyId, getFamily, getFamilyAsync, subscribeToFamily, updateMemberLastSeen } from './family'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'
import { migrateLocalUsers } from './auth'

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
  const [categories, setCategoriesState] = useState([])
  const [pin, setPinState] = useState(null)
  const [family, setFamily] = useState(null)
  const [familyId, setFamilyId] = useState(() => getUserFamilyId(user?.id))
  const [syncing, setSyncing] = useState(false)
  const skipCloudUpdate = useRef(false)

  const uid = user?.id

  // Boshlang'ich yuklash: avval localStorage, keyin cloud
  useEffect(() => {
    if (!uid) return

    // Akkauntni Firestore ga sinxronlash (agar faqat telefonda qolgan bo'lsa)
    migrateLocalUsers()

    // Lokal ma'lumotlarni darhol yuklash
    setTransactions(getData('transactions', uid))
    setDebts(getData('debts', uid))
    const s = getSettings(uid)
    setSettingsState(s.rates ? s : { rates: { USD: 12700, EUR: 13800, RUB: 140 } })
    setFamily(getUserFamily(uid))

    // Lokal kategoriyalar va PIN
    try {
      const localCats = localStorage.getItem(`finance_${uid}_categories`)
      if (localCats) setCategoriesState(JSON.parse(localCats))
      const localPin = localStorage.getItem(`finance_pin_${uid}`)
      if (localPin) setPinState(localPin)
    } catch {}

    // Cloud dan yangi ma'lumot bo'lsa yuklash
    const loadCloud = async () => {
      setSyncing(true)
      const [cloudTx, cloudDebts, cloudSettings, cloudCats, cloudPin] = await Promise.all([
        loadFromCloud(uid, 'transactions'),
        loadFromCloud(uid, 'debts'),
        loadFromCloud(uid, 'settings'),
        loadFromCloud(uid, 'categories'),
        loadFromCloud(uid, 'pin'),
      ])
      if (cloudTx) { setTransactions(cloudTx); saveData('transactions', uid, cloudTx) }
      if (cloudDebts) { setDebts(cloudDebts); saveData('debts', uid, cloudDebts) }
      if (cloudSettings?.rates) { setSettingsState(cloudSettings); saveSettings(uid, cloudSettings) }
      if (cloudCats) {
        setCategoriesState(cloudCats)
        localStorage.setItem(`finance_${uid}_categories`, JSON.stringify(cloudCats))
      }
      if (cloudPin) {
        setPinState(cloudPin)
        localStorage.setItem(`finance_pin_${uid}`, cloudPin)
      }
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
    const unsubCats = subscribeToCloud(uid, 'categories', (data) => {
      setCategoriesState(data)
      localStorage.setItem(`finance_${uid}_categories`, JSON.stringify(data))
    })
    const unsubPin = subscribeToCloud(uid, 'pin', (data) => {
      if (data) { setPinState(data); localStorage.setItem(`finance_pin_${uid}`, data) }
    })

    return () => { unsubTx(); unsubDebts(); unsubSettings(); unsubCats(); unsubPin() }
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
    // lastSeen yangilash (faqat bir marta, har sessiyada)
    if (uid) updateMemberLastSeen(familyId, uid)
    return () => unsub()
  }, [familyId])

  const refreshFamily = useCallback(() => {
    if (uid) {
      const fid = getUserFamilyId(uid) || null
      // Faqat familyId o'zgarganda re-subscribe qilish
      setFamilyId(prev => (prev === fid ? prev : fid))
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

  const saveCategories = useCallback((cats) => {
    setCategoriesState(cats)
    if (uid) {
      localStorage.setItem(`finance_${uid}_categories`, JSON.stringify(cats))
      syncToCloud(uid, 'categories', cats)
    }
  }, [uid])

  const savePin = useCallback((newPin) => {
    setPinState(newPin)
    if (uid) {
      if (newPin) {
        localStorage.setItem(`finance_pin_${uid}`, newPin)
        syncToCloud(uid, 'pin', newPin)
      } else {
        localStorage.removeItem(`finance_pin_${uid}`)
        syncToCloud(uid, 'pin', null)
      }
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

  return (
    <AppContext.Provider value={{
      user, setUser,
      transactions, saveTransactions,
      debts, saveDebts,
      settings, updateSettings,
      categories, saveCategories,
      pin, savePin,
      balance, totalIncome, totalExpense,
      family, setFamily, refreshFamily,
      userRole, familyMembers,
      familyTransactions, familyDebts,
      canEdit, canAdd,
      syncing
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
