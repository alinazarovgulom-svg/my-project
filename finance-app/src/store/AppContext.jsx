import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData, getSettings, saveSettings } from './storage'
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

  const storeId = familyId || uid
  const col = familyId ? 'families' : 'users'

  useEffect(() => {
    if (!storeId) return

    const sync = (key, data) => syncToCloud(storeId, key, data, col)
    const load = (key) => loadFromCloud(storeId, key, col)
    const subscribe = (key, cb) => subscribeToCloud(storeId, key, cb, col)

    // 1. LocalStorage dan darhol ko'rsatish
    setTransactions(getData('transactions', storeId))
    setDebts(getData('debts', storeId))
    const s = getSettings(storeId)
    setSettingsState(s.rates ? s : { rates: { USD: 12700, EUR: 13800, RUB: 140 } })
    if (uid) setFamily(getUserFamily(uid))
    try {
      const lc = localStorage.getItem(`finance_${storeId}_categories`)
      if (lc) setCategoriesState(JSON.parse(lc))
      const lp = localStorage.getItem(`finance_pin_${uid}`)
      if (lp) setPinState(lp)
    } catch {}
    setHamkorSections(getData('hamkorlar_sections', storeId))
    setHamkorPartners(getData('hamkorlar', storeId))

    // 2. Firebase serverdan o'qib, local bilan merge qilish
    const loadCloud = async () => {
      setSyncing(true)
      const [cloudTx, cloudDebts, cloudSettings, cloudCats,
             cloudSections, cloudPartners] = await Promise.all([
        load('transactions'),
        load('debts'),
        load('settings'),
        load('categories'),
        load('hamkorlar_sections'),
        load('hamkorlar'),
      ])

      const localTx = getData('transactions', storeId)
      const localDebts = getData('debts', storeId)
      const localSec = getData('hamkorlar_sections', storeId)
      const localPar = getData('hamkorlar', storeId)

      if (cloudTx?.length >= localTx.length) {
        setTransactions(cloudTx); saveData('transactions', storeId, cloudTx)
      } else if (localTx.length > 0) {
        await sync('transactions', localTx)
      }

      if (cloudDebts?.length >= localDebts.length) {
        setDebts(cloudDebts); saveData('debts', storeId, cloudDebts)
      } else if (localDebts.length > 0) {
        await sync('debts', localDebts)
      }

      if (cloudSettings?.rates) {
        setSettingsState(cloudSettings); saveSettings(storeId, cloudSettings)
      } else if (s.rates) {
        await sync('settings', s)
      }

      if (cloudCats?.length > 0) {
        setCategoriesState(cloudCats)
        localStorage.setItem(`finance_${storeId}_categories`, JSON.stringify(cloudCats))
      } else {
        const lc2 = (() => { try { return JSON.parse(localStorage.getItem(`finance_${storeId}_categories`) || 'null') } catch { return null } })()
        if (lc2?.length > 0) await sync('categories', lc2)
      }

      const mergedSec = mergeById(localSec, cloudSections || [])
      if (mergedSec.length > 0) {
        setHamkorSections(mergedSec)
        saveData('hamkorlar_sections', storeId, mergedSec)
        if (!cloudSections || mergedSec.length > (cloudSections?.length || 0))
          await sync('hamkorlar_sections', mergedSec)
      } else if (cloudSections?.length > 0) {
        setHamkorSections(cloudSections)
        saveData('hamkorlar_sections', storeId, cloudSections)
      }

      const mergedPar = mergeById(localPar, cloudPartners || []).map(p => {
        const lp3 = localPar.find(x => x.id === p.id)
        const cp = (cloudPartners || []).find(x => x.id === p.id)
        if (lp3 && cp) return { ...p, entries: mergeById(lp3.entries || [], cp.entries || []) }
        return p
      })
      if (mergedPar.length > 0) {
        setHamkorPartners(mergedPar)
        saveData('hamkorlar', storeId, mergedPar)
        if (!cloudPartners || mergedPar.length > (cloudPartners?.length || 0))
          await sync('hamkorlar', mergedPar)
      } else if (cloudPartners?.length > 0) {
        setHamkorPartners(cloudPartners)
        saveData('hamkorlar', storeId, cloudPartners)
      }

      setSyncing(false)
    }
    loadCloud()

    // 3. Real-vaqt tinglash — istalgan a'zo o'zgartirganda barchada yangilanadi
    const unsubTx = subscribe('transactions', (data) => {
      if (skipCloudUpdate.current) return
      setTransactions(data); saveData('transactions', storeId, data)
    })
    const unsubDebts = subscribe('debts', (data) => {
      if (skipCloudUpdate.current) return
      setDebts(data); saveData('debts', storeId, data)
    })
    const unsubSettings = subscribe('settings', (data) => {
      if (skipCloudUpdate.current) return
      if (data?.rates) { setSettingsState(data); saveSettings(storeId, data) }
    })
    const unsubCats = subscribe('categories', (data) => {
      setCategoriesState(data)
      localStorage.setItem(`finance_${storeId}_categories`, JSON.stringify(data))
    })
    const unsubSec = subscribe('hamkorlar_sections', (data) => {
      setHamkorSections(data); saveData('hamkorlar_sections', storeId, data)
    })
    const unsubPar = subscribe('hamkorlar', (data) => {
      setHamkorPartners(data); saveData('hamkorlar', storeId, data)
    })

    return () => {
      unsubTx(); unsubDebts(); unsubSettings()
      unsubCats(); unsubSec(); unsubPar()
    }
  }, [storeId])

  // PIN alohida — foydalanuvchiga xususiy
  useEffect(() => {
    if (!uid) return
    const lp = localStorage.getItem(`finance_pin_${uid}`)
    if (lp) setPinState(lp)
  }, [uid])

  // Oila a'zolari va roli — real-vaqt
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
    if (storeId) {
      saveData('transactions', storeId, data)
      skipCloudUpdate.current = true
      syncToCloud(storeId, 'transactions', data, col).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [storeId, col])

  const saveDebts = useCallback((data) => {
    setDebts(data)
    if (storeId) {
      saveData('debts', storeId, data)
      skipCloudUpdate.current = true
      syncToCloud(storeId, 'debts', data, col).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [storeId, col])

  const updateSettings = useCallback((s) => {
    setSettingsState(s)
    if (storeId) { saveSettings(storeId, s); syncToCloud(storeId, 'settings', s, col) }
  }, [storeId, col])

  const saveCategories = useCallback((cats) => {
    setCategoriesState(cats)
    if (storeId) {
      localStorage.setItem(`finance_${storeId}_categories`, JSON.stringify(cats))
      syncToCloud(storeId, 'categories', cats, col)
    }
  }, [storeId, col])

  const savePin = useCallback((newPin) => {
    setPinState(newPin)
    if (uid) {
      if (newPin) { localStorage.setItem(`finance_pin_${uid}`, newPin) }
      else { localStorage.removeItem(`finance_pin_${uid}`) }
    }
  }, [uid])

  const saveHamkorSections = useCallback((data) => {
    setHamkorSections(data)
    if (storeId) { saveData('hamkorlar_sections', storeId, data); syncToCloud(storeId, 'hamkorlar_sections', data, col) }
  }, [storeId, col])

  const saveHamkorPartners = useCallback((data) => {
    setHamkorPartners(data)
    if (storeId) { saveData('hamkorlar', storeId, data); syncToCloud(storeId, 'hamkorlar', data, col) }
  }, [storeId, col])

  const balance = transactions.reduce((sum, t) =>
    t.type === 'income' ? sum + t.amount : sum - t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const userRole = family ? (family.members.find(m => m.userId === uid)?.role || null) : null
  const familyMembers = family?.members || []

  const canEdit = (ownerId) => {
    if (!family) return true
    if (userRole === 'admin') return true
    if (userRole === 'member' && ownerId === uid) return true
    return false
  }
  const canAdd = () => !family || userRole === 'admin' || userRole === 'member'

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
      canEdit, canAdd, syncing,
      hamkorSections, saveHamkorSections,
      hamkorPartners, saveHamkorPartners,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
