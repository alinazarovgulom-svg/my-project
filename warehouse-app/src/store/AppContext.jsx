import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData } from './storage'
import { getUserTeam, getUserTeamId, getTeam, subscribeToTeam } from './family'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'
import { checkLowStock } from '../utils/notifications'
import { db } from './firebase'
import { waitForPendingWrites } from 'firebase/firestore'

const AppContext = createContext(null)

export const DEFAULT_CATEGORIES = [
  'Oziq-ovqat', 'Elektronika', 'Kiyim-kechak', 'Maishiy texnika',
  'Qurilish materiallari', 'Kimyo', 'Mebellar', 'Sport', 'Boshqa'
]

export const UNITS = ['dona', 'kg', 'g', 'litr', 'ml', 'metr', 'sm', 'quti', 'paket', 'to\'plam']

const PENDING_KEY = (uid) => `wh_pending_${uid}`

export function AppProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser)
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [team, setTeam] = useState(null)
  const [teamId, setTeamId] = useState(() => getUserTeamId(getCurrentUser()?.id))
  const [syncing, setSyncing] = useState(false)
  // Oflayn holat
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncPhase, setSyncPhase] = useState(null) // 'syncing' | 'done' | null
  const skipCloudUpdate = useRef(false)
  const wasOffline = useRef(false)

  const uid = user?.id

  // Tarmoq holatini kuzatish
  useEffect(() => {
    const loadPending = () => {
      if (uid) {
        const n = parseInt(localStorage.getItem(PENDING_KEY(uid)) || '0')
        setPendingCount(n)
      }
    }

    const handleOnline = async () => {
      setOnline(true)
      if (!wasOffline.current) return
      wasOffline.current = false

      // Faqat kutayotgan o'zgarishlar bo'lsa sinxronlash boshlash
      const pending = parseInt(localStorage.getItem(PENDING_KEY(uid)) || '0')
      if (pending === 0) return

      setSyncPhase('syncing')
      try {
        await waitForPendingWrites(db)
        // Firebase o'z-o'zidan yuborgach localStorage ni ham yangilash
        localStorage.setItem(PENDING_KEY(uid), '0')
        setPendingCount(0)
        setSyncPhase('done')
      } catch {
        setSyncPhase('done')
      }
      setTimeout(() => setSyncPhase(null), 3000)
    }

    const handleOffline = () => {
      setOnline(false)
      wasOffline.current = true
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    loadPending()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [uid])

  // Oflayn paytda yozilgan o'zgarishlar sonini oshirish
  const incrementPending = useCallback(() => {
    if (!uid || navigator.onLine) return
    const n = parseInt(localStorage.getItem(PENDING_KEY(uid)) || '0') + 1
    localStorage.setItem(PENDING_KEY(uid), String(n))
    setPendingCount(n)
  }, [uid])

  useEffect(() => {
    if (!uid) return

    setProducts(getData('products', uid))
    setMovements(getData('movements', uid))
    setTeam(getUserTeam(uid))

    const loadCloud = async () => {
      setSyncing(true)
      const [cloudProducts, cloudMovements] = await Promise.all([
        loadFromCloud(uid, 'products'),
        loadFromCloud(uid, 'movements'),
      ])
      if (cloudProducts) { setProducts(cloudProducts); saveData('products', uid, cloudProducts) }
      if (cloudMovements) { setMovements(cloudMovements); saveData('movements', uid, cloudMovements) }
      setSyncing(false)
    }
    loadCloud()

    const unsubProducts = subscribeToCloud(uid, 'products', (data) => {
      if (skipCloudUpdate.current) return
      setProducts(data); saveData('products', uid, data)
    })
    const unsubMovements = subscribeToCloud(uid, 'movements', (data) => {
      if (skipCloudUpdate.current) return
      setMovements(data); saveData('movements', uid, data)
    })

    return () => { unsubProducts(); unsubMovements() }
  }, [uid])

  useEffect(() => {
    if (!teamId) { setTeam(null); return }
    const local = getTeam(teamId)
    if (local) setTeam(local)
    const unsub = subscribeToTeam(teamId, (data) => setTeam(data))
    return () => unsub()
  }, [teamId])

  const refreshTeam = useCallback(() => {
    if (uid) setTeamId(getUserTeamId(uid) || null)
  }, [uid])

  const saveProducts = useCallback((data) => {
    setProducts(data)
    if (uid) {
      saveData('products', uid, data)
      incrementPending()
      skipCloudUpdate.current = true
      syncToCloud(uid, 'products', data).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [uid, incrementPending])

  const saveMovements = useCallback((data, currentProducts) => {
    setMovements(data)
    if (uid) {
      saveData('movements', uid, data)
      incrementPending()
      skipCloudUpdate.current = true
      syncToCloud(uid, 'movements', data).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
    const prods = currentProducts || []
    if (prods.length > 0) {
      const map = {}
      data.forEach(mv => {
        if (!map[mv.productId]) map[mv.productId] = { productId: mv.productId, quantity: 0, unit: mv.unit }
        if (mv.type === 'kirim') map[mv.productId].quantity += mv.quantity
        else map[mv.productId].quantity -= mv.quantity
      })
      checkLowStock(prods, Object.values(map))
    }
  }, [uid, incrementPending])

  const getInventory = useCallback((allMovements = movements) => {
    const map = {}
    allMovements.forEach(mv => {
      if (!map[mv.productId]) {
        map[mv.productId] = {
          productId: mv.productId,
          productName: mv.productName,
          unit: mv.unit,
          quantity: 0,
          totalCost: 0,
          totalRevenue: 0
        }
      }
      if (mv.type === 'kirim') {
        map[mv.productId].quantity += mv.quantity
        map[mv.productId].totalCost += mv.total
      } else {
        map[mv.productId].quantity -= mv.quantity
        map[mv.productId].totalRevenue += mv.total
      }
    })
    return Object.values(map)
  }, [movements])

  const userRole = team
    ? (team.members?.find(m => m.userId === uid)?.role || null)
    : null

  const teamMembers = team?.members || []
  const teamMovements = team?.movements || []

  const canEdit = (ownerId) => {
    if (!userRole) return false
    if (userRole === 'admin') return true
    if (userRole === 'member' && ownerId === uid) return true
    return false
  }
  const canAdd = () => userRole === 'admin' || userRole === 'member'

  const getTeamInventory = useCallback(() => {
    if (!team) return []
    return getInventory(teamMovements)
  }, [team, teamMovements, getInventory])

  return (
    <AppContext.Provider value={{
      user, setUser,
      products, saveProducts,
      movements, saveMovements,
      team, setTeam, refreshTeam,
      teamId, teamMembers, teamMovements,
      userRole, canEdit, canAdd,
      getInventory, getTeamInventory,
      syncing,
      online, pendingCount, syncPhase
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
