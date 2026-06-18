import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData } from './storage'
import { getUserTeam, getUserTeamId, getTeam, subscribeToTeam, joinTeam } from './family'
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
  const [teamId, setTeamId] = useState(() => { const u = getCurrentUser(); return u ? getUserTeamId(u.id) : null })
  const [syncing, setSyncing] = useState(false)
  // Oflayn holat
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncPhase, setSyncPhase] = useState(null) // 'syncing' | 'done' | null
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
      setProducts(data); saveData('products', uid, data)
    })
    const unsubMovements = subscribeToCloud(uid, 'movements', (data) => {
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

  // Auto-rejoin last team on login
  useEffect(() => {
    if (!uid || teamId) return
    const lastCode = localStorage.getItem(`wh_last_team_${uid}`)
    if (!lastCode) return
    joinTeam(lastCode, uid, user.username, user.fullName).then(res => {
      localStorage.removeItem(`wh_last_team_${uid}`)
      if (res?.success) setTeamId(lastCode)
    })
  }, [uid])

  const refreshTeam = useCallback(() => {
    if (uid) setTeamId(getUserTeamId(uid) || null)
  }, [uid])

  const saveProducts = useCallback((data) => {
    setProducts(data)
    if (uid) {
      saveData('products', uid, data)
      incrementPending()
      syncToCloud(uid, 'products', data)
    }
  }, [uid, incrementPending])

  const saveMovements = useCallback((data, currentProducts) => {
    setMovements(data)
    if (uid) {
      saveData('movements', uid, data)
      incrementPending()
      syncToCloud(uid, 'movements', data)
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

  const perm = (isTeam) => {
    if (!isTeam) return { canAdd: true, canEdit: true, canDelete: true }
    if (!userRole) return { canAdd: false, canEdit: false, canDelete: false }
    if (userRole === 'admin') return { canAdd: true, canEdit: true, canDelete: true }
    if (userRole === 'manager') return { canAdd: true, canEdit: true, canDelete: false }
    return { canAdd: false, canEdit: false, canDelete: false }
  }
  const canEdit = (ownerId) => {
    if (!userRole) return false
    if (userRole === 'admin') return true
    if (userRole === 'manager' && ownerId === uid) return true
    return false
  }
  const canAdd = () => userRole === 'admin' || userRole === 'manager'

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
      userRole, perm, canEdit, canAdd,
      getInventory, getTeamInventory,
      syncing,
      online, pendingCount, syncPhase
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
