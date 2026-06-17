import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, getData, saveData, getObjData, saveObjData } from './storage'
import { getUserTeam, getUserTeamId, getTeam, subscribeToTeam } from './family'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'
import { checkLowStock } from '../utils/notifications'

const AppContext = createContext(null)

export const DEFAULT_CATEGORIES = [
  'Oziq-ovqat', 'Elektronika', 'Kiyim-kechak', 'Maishiy texnika',
  'Qurilish materiallari', 'Kimyo', 'Mebellar', 'Sport', 'Boshqa'
]

export const UNITS = ['dona', 'kg', 'g', 'litr', 'ml', 'metr', 'sm', 'quti', 'paket', 'to\'plam']

export function AppProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser)
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [team, setTeam] = useState(null)
  const [teamId, setTeamId] = useState(() => getUserTeamId(getCurrentUser()?.id))
  const [syncing, setSyncing] = useState(false)
  const skipCloudUpdate = useRef(false)

  const uid = user?.id

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
    if (uid) {
      const tid = getUserTeamId(uid)
      setTeamId(tid || null)
    }
  }, [uid])

  const saveProducts = useCallback((data) => {
    setProducts(data)
    if (uid) {
      saveData('products', uid, data)
      skipCloudUpdate.current = true
      syncToCloud(uid, 'products', data).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
  }, [uid])

  const saveMovements = useCallback((data, currentProducts) => {
    setMovements(data)
    if (uid) {
      saveData('movements', uid, data)
      skipCloudUpdate.current = true
      syncToCloud(uid, 'movements', data).finally(() => {
        setTimeout(() => { skipCloudUpdate.current = false }, 500)
      })
    }
    // Chiqim saqlanganidan keyin kam qoldiqni tekshirish
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
  }, [uid])

  // Joriy qoldiqni hisoblash (mahsulot bo'yicha)
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

  // Jamoa rejimida jamoa harakatlari + shaxsiy mahsulotlardan qoldiq
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
      syncing
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
