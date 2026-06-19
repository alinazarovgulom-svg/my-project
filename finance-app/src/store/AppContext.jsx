import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData, getSettings, saveSettings, generateId } from './storage'
import { getUserFamily, getUserFamilyId, getFamily, subscribeToFamily, updateMemberLastSeen } from './family'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'

const AppContext = createContext(null)

export const INCOME_CATEGORIES = [
  'Maosh', 'Biznes', 'Freelance', 'Investitsiya', 'Sovg\'a', 'Boshqa kirim'
]
export const EXPENSE_CATEGORIES = [
  'Oziq-ovqat', 'Transport', 'Uy-joy', 'Kiyim', 'Sog\'liq', 'Ta\'lim',
  'Ko\'ngilochar', 'Kommunal', 'Telefon/Internet', 'Boshqa chiqim'
]

const mergeById = (a = [], b = []) => {
  const map = {}
  ;[...a, ...b].forEach(x => { if (x?.id) map[x.id] = x })
  return Object.values(map)
}

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
  const [hamkorSections, setHamkorSections] = useState([])
  const [hamkorPartners, setHamkorPartners] = useState([])

  const skipCloudUpdate = useRef(false)
  const uid = user?.id

  useEffect(() => {
    if (!uid) return

    // 1. LocalStorage dan darhol ko'rsatish
    setTransactions(getData('transactions', uid))
    setDebts(getData('debts', uid))
    const s = getSettings(uid)
    setSettingsState(s.rates ? s : { rates: { USD: 12700, EUR: 13800, RUB: 140 } })
    setFamily(getUserFamily(uid))
    try {
      const lc = localStorage.getItem(`finance_${uid}_categories`)
      if (lc) setCategoriesState(JSON.parse(lc))
      const lp = localStorage.getItem(`finance_pin_${uid}`)
      if (lp) setPinState(lp)
    } catch {}
    setHamkorSections(getData('hamkorlar_sections', uid))
    setHamkorPartners(getData('hamkorlar', uid))

    // 2. Firebase serverdan o'qib, local bilan merge qilish
    const loadCloud = async () => {
      setSyncing(true)
      const [cloudTx, cloudDebts, cloudSettings, cloudCats, cloudPin,
             cloudSections, cloudPartners] = await Promise.all([
        loadFromCloud(uid, 'transactions'),
        loadFromCloud(uid, 'debts'),
        loadFromCloud(uid, 'settings'),
        loadFromCloud(uid, 'categories'),
        loadFromCloud(uid, 'pin'),
        loadFromCloud(uid, 'hamkorlar_sections'),
        loadFromCloud(uid, 'hamkorlar'),
      ])

      const localTx = getData('transactions', uid)
      const localDebts = getData('debts', uid)
      const localSec = getData('hamkorlar_sections', uid)
      const localPar = getData('hamkorlar', uid)

      // Transactions — ko'pini saqlash
      if (cloudTx?.length >= localTx.length) {
        setTransactions(cloudTx); saveData('transactions', uid, cloudTx)
      } else if (localTx.length > 0) {
        await syncToCloud(uid, 'transactions', localTx)
      }

      // Debts
      if (cloudDebts?.length >= localDebts.length) {
        setDebts(cloudDebts); saveData('debts', uid, cloudDebts)
      } else if (localDebts.length > 0) {
        await syncToCloud(uid, 'debts', localDebts)
      }

      // Settings
      if (cloudSettings?.rates) {
        setSettingsState(cloudSettings); saveSettings(uid, cloudSettings)
      } else if (s.rates) {
        await syncToCloud(uid, 'settings', s)
      }

      // Categories
      if (cloudCats?.length > 0) {
        setCategoriesState(cloudCats)
        localStorage.setItem(`finance_${uid}_categories`, JSON.stringify(cloudCats))
      } else {
        const lc2 = (() => { try { return JSON.parse(localStorage.getItem(`finance_${uid}_categories`) || 'null') } catch { return null } })()
        if (lc2?.length > 0) await syncToCloud(uid, 'categories', lc2)
      }

      // PIN
      if (cloudPin) {
        setPinState(cloudPin); localStorage.setItem(`finance_pin_${uid}`, cloudPin)
      } else {
        const lp2 = localStorage.getItem(`finance_pin_${uid}`)
        if (lp2) await syncToCloud(uid, 'pin', lp2)
      }

      // Hamkorlar sections — local + cloud merge
      const mergedSec = mergeById(localSec, cloudSections || [])
      if (mergedSec.length > 0) {
        setHamkorSections(mergedSec)
        saveData('hamkorlar_sections', uid, mergedSec)
        if (!cloudSections || mergedSec.length > (cloudSections?.length || 0))
          await syncToCloud(uid, 'hamkorlar_sections', mergedSec)
      } else if (cloudSections?.length > 0) {
        setHamkorSections(cloudSections)
        saveData('hamkorlar_sections', uid, cloudSections)
      }

      // Hamkorlar partners — local + cloud merge (entries ham)
      const mergedPar = mergeById(localPar, cloudPartners || []).map(p => {
        const lp3 = localPar.find(x => x.id === p.id)
        const cp = (cloudPartners || []).find(x => x.id === p.id)
        if (lp3 && cp) return { ...p, entries: mergeById(lp3.entries || [], cp.entries || []) }
        return p
      })
      if (mergedPar.length > 0) {
        setHamkorPartners(mergedPar)
        saveData('hamkorlar', uid, mergedPar)
        if (!cloudPartners || mergedPar.length > (cloudPartners?.length || 0))
          await syncToCloud(uid, 'hamkorlar', mergedPar)
      } else if (cloudPartners?.length > 0) {
        setHamkorPartners(cloudPartners)
        saveData('hamkorlar', uid, cloudPartners)
      }

      setSyncing(false)
    }
    loadCloud()

    // 3. Real-vaqt tinglash
    const unsubTx = subscribeToCloud(uid, 'transactions', (data) => {
      if (skipCloudUpdate.current) return
      setTransactions(data); saveData('transactions', uid, data)
    })
    const unsubDebts = subscribeToCloud(uid, 'debts', (data) => {
      if (skipCloudUpdate.current) return
      setDebts(data); saveData('debts', uid, data)
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
    const unsubSec = subscribeToCloud(uid, 'hamkorlar_sections', (data) => {
      setHamkorSections(data); saveData('hamkorlar_sections', uid, data)
    })
    const unsubPar = subscribeToCloud(uid, 'hamkorlar', (data) => {
      setHamkorPartners(data); saveData('hamkorlar', uid, data)
    })

    return () => {
      unsubTx(); unsubDebts(); unsubSettings()
      unsubCats(); unsubPin(); unsubSec(); unsubPar()
    }
  }, [uid])

  useEffect(() => {
    if (!familyId) { setFamily(null); return }
    const local = getFamily(familyId)
    if (local) setFamily(local)
    const unsub = subscribeToFamily(familyId, (data) => setFamily(data))
    if (uid) updateMemberLastSeen(familyId, uid)
    return () => unsub()
  }, [familyId])

  const refreshFamily = useCallback(() => {
    if (uid) {
      const fid = getUserFamilyId(uid) || null
      setFamilyId(prev => prev === fid ? prev : fid)
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
    if (uid) { saveSettings(uid, s); syncToCloud(uid, 'settings', s) }
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
      if (newPin) { localStorage.setItem(`finance_pin_${uid}`, newPin); syncToCloud(uid, 'pin', newPin) }
      else { localStorage.removeItem(`finance_pin_${uid}`); syncToCloud(uid, 'pin', null) }
    }
  }, [uid])

  const saveHamkorSections = useCallback((data) => {
    setHamkorSections(data)
    if (uid) { saveData('hamkorlar_sections', uid, data); syncToCloud(uid, 'hamkorlar_sections', data) }
  }, [uid])

  const saveHamkorPartners = useCallback((data) => {
    setHamkorPartners(data)
    if (uid) { saveData('hamkorlar', uid, data); syncToCloud(uid, 'hamkorlar', data) }
  }, [uid])

  const balance = transactions.reduce((sum, t) =>
    t.type === 'income' ? sum + t.amount : sum - t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const userRole = family ? (family.members.find(m => m.userId === uid)?.role || null) : null
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
      userRole, familyMembers, familyTransactions, familyDebts,
      canEdit, canAdd, syncing,
      hamkorSections, saveHamkorSections,
      hamkorPartners, saveHamkorPartners,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
