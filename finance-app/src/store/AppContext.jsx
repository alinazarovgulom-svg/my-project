import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ToastContainer from '../components/Toast'
import { getCurrentUser, getData, saveData, getSettings, saveSettings } from './storage'
import { getUserFamily, getUserFamilyId, getFamily, subscribeToFamily, updateMemberLastSeen } from './family'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'
import { migrateLocalUsers } from './auth'
import { getUserWorkspaceId, subscribeToWorkspace } from './workspace'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

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
  const [workspaceId, setWorkspaceId] = useState(() => getUserWorkspaceId(user?.id))
  const [workspace, setWorkspace] = useState(null)
  const [onlineMembers, setOnlineMembers] = useState([])
  const skipCloudUpdate = useRef(false)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const uid = user?.id

  // Workspace real-time subscription
  useEffect(() => {
    if (!workspaceId) { setWorkspace(null); return }
    const unsub = subscribeToWorkspace(workspaceId, (data) => setWorkspace(data))
    return () => unsub()
  }, [workspaceId])

  // Boshlang'ich yuklash: avval localStorage, keyin cloud
  useEffect(() => {
    if (!uid) return

    // Akkauntni Firestore ga sinxronlash (agar faqat telefonda qolgan bo'lsa)
    migrateLocalUsers()

    const wid = getUserWorkspaceId(uid)
    const storeId = wid || uid
    const col = wid ? 'workspaces' : 'users'

    // Lokal ma'lumotlarni darhol yuklash (faqat shaxsiy rejimda)
    if (!wid) {
      setTransactions(getData('transactions', uid))
      setDebts(getData('debts', uid))
      const s = getSettings(uid)
      setSettingsState(s.rates ? s : { rates: { USD: 12700, EUR: 13800, RUB: 140 } })
      setFamily(getUserFamily(uid))
    }

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
        loadFromCloud(storeId, 'transactions', col),
        loadFromCloud(storeId, 'debts', col),
        loadFromCloud(uid, 'settings'),
        loadFromCloud(uid, 'categories'),
        loadFromCloud(uid, 'pin'),
      ])
      if (cloudTx) { setTransactions(cloudTx); if (!wid) saveData('transactions', uid, cloudTx) }
      if (cloudDebts) { setDebts(cloudDebts); if (!wid) saveData('debts', uid, cloudDebts) }
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

    // Real-vaqt tinglash
    const unsubTx = subscribeToCloud(storeId, 'transactions', (data) => {
      if (skipCloudUpdate.current) return
      setTransactions(data)
      if (!wid) saveData('transactions', uid, data)
    }, col)
    const unsubDebts = subscribeToCloud(storeId, 'debts', (data) => {
      if (skipCloudUpdate.current) return
      setDebts(data)
      if (!wid) saveData('debts', uid, data)
    }, col)
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

    // Online presence
    updatePresence('online')
    const presenceInterval = setInterval(() => updatePresence('online'), 120000)

    return () => {
      unsubTx(); unsubDebts(); unsubSettings(); unsubCats(); unsubPin()
      updatePresence('offline')
      clearInterval(presenceInterval)
    }
  }, [uid])

  // Oila real-vaqt sinxronizatsiyasi
  useEffect(() => {
    if (!familyId) { setFamily(null); return }
    const local = getFamily(familyId)
    if (local) setFamily(local)
    const unsub = subscribeToFamily(familyId, (data) => setFamily(data))
    if (uid) updateMemberLastSeen(familyId, uid)
    return () => unsub()
  }, [familyId])

  const updatePresence = useCallback(async (status = 'online') => {
    if (!uid) return
    try {
      await setDoc(doc(db, 'presence', uid), {
        userId: uid,
        username: user?.username,
        fullName: user?.name,
        status,
        lastSeen: serverTimestamp(),
      }, { merge: true })
    } catch(e) {}
  }, [uid, user])

  const refreshFamily = useCallback(() => {
    if (uid) {
      const fid = getUserFamilyId(uid) || null
      setFamilyId(prev => (prev === fid ? prev : fid))
    }
  }, [uid])

  const saveTransactions = useCallback((data) => {
    setTransactions(data)
    if (uid) {
      const wid = getUserWorkspaceId(uid)
      const storeId = wid || uid
      const col = wid ? 'workspaces' : 'users'
      if (!wid) saveData('transactions', uid, data)
      skipCloudUpdate.current = true
      syncToCloud(storeId, 'transactions', data, col).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [uid])

  const saveDebts = useCallback((data) => {
    setDebts(data)
    if (uid) {
      const wid = getUserWorkspaceId(uid)
      const storeId = wid || uid
      const col = wid ? 'workspaces' : 'users'
      if (!wid) saveData('debts', uid, data)
      skipCloudUpdate.current = true
      syncToCloud(storeId, 'debts', data, col).finally(() => {
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

  // Workspace permission helpers
  const myWorkspacePerms = workspace
    ? (workspace.members?.find(m => m.userId === uid)?.permissions || {})
    : null

  const myRole = workspace
    ? (workspace.members?.find(m => m.userId === uid)?.role || null)
    : null

  const canViewSection = (section) => {
    if (!workspace) return true
    if (!myWorkspacePerms) return false
    return myWorkspacePerms[section] === 'edit' || myWorkspacePerms[section] === 'view'
  }

  const canEditSection = (section) => {
    if (!workspace) return true
    if (!myWorkspacePerms) return false
    return myWorkspacePerms[section] === 'edit'
  }

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
      syncing,
      workspace, setWorkspace,
      workspaceId, setWorkspaceId,
      myRole, canViewSection, canEditSection,
      onlineMembers, updatePresence,
      showToast,
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
