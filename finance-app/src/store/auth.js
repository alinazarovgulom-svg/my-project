import { db } from './firebase'
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { hashPassword, getCurrentUser, setCurrentUser, generateId } from './storage'

const USERS_COL = 'users'

// Firestore dan username bo'yicha foydalanuvchi topish
export const findUserByUsername = async (username) => {
  const q = query(collection(db, USERS_COL), where('username', '==', username))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// Login: Firestore dan tekshirish, keyin localStorage ga session saqlash
export const loginUser = async (username, password) => {
  const user = await findUserByUsername(username)
  if (!user) return { error: `"${username}" foydalanuvchisi topilmadi` }
  if (user.password !== hashPassword(password)) return { error: "Parol noto'g'ri" }
  const { password: _, ...safeUser } = user
  setCurrentUser(safeUser)
  return { user: safeUser }
}

// Ro'yxatdan o'tish: Firestore ga yozish, muvaffaqiyatsiz bo'lsa zaxira
export const registerUser = async (name, username, password) => {
  const existing = await findUserByUsername(username)
  if (existing) return { error: 'Bu login band, boshqa tanlang' }
  const id = generateId()
  const newUser = { id, name, username, password: hashPassword(password), createdAt: new Date().toISOString() }
  try {
    await setDoc(doc(db, USERS_COL, id), newUser)
  } catch (e) {
    console.warn('[auth] Firestore write failed, saving locally:', e?.code)
    // Zaxira: fin_users ga saqlash (migrateLocalUsers keyinroq yuklaydi)
    try {
      const arr = JSON.parse(localStorage.getItem('fin_users') || '[]')
      if (!arr.find(u => u.id === id)) arr.push(newUser)
      localStorage.setItem('fin_users', JSON.stringify(arr))
    } catch {}
  }
  const { password: _, ...safeUser } = newUser
  setCurrentUser(safeUser)
  return { user: safeUser }
}

// Login (username) ni o'zgartirish
export const changeUsername = async (userId, newUsername, currentPassword) => {
  const userRef = doc(db, USERS_COL, userId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return { error: 'Foydalanuvchi topilmadi' }
  const data = snap.data()
  if (data.password !== hashPassword(currentPassword)) return { error: "Joriy parol noto'g'ri" }
  const taken = await findUserByUsername(newUsername)
  if (taken && taken.id !== userId) return { error: 'Bu login band, boshqa tanlang' }
  await updateDoc(userRef, { username: newUsername })
  const current = getCurrentUser()
  const updated = { ...current, username: newUsername }
  setCurrentUser(updated)
  return { user: updated }
}

// Parolni o'zgartirish
export const changePassword = async (userId, currentPassword, newPassword) => {
  const userRef = doc(db, USERS_COL, userId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return { error: 'Foydalanuvchi topilmadi' }
  const data = snap.data()
  if (data.password !== hashPassword(currentPassword)) return { error: "Joriy parol noto'g'ri" }
  await updateDoc(userRef, { password: hashPassword(newPassword) })
  return { success: true }
}

// Akkauntni butunlay o'chirish
export const deleteAccount = async (userId, password) => {
  try {
    const snap = await getDoc(doc(db, USERS_COL, userId))
    if (!snap.exists()) return { error: 'Foydalanuvchi topilmadi' }
    const data = snap.data()
    if (data.password !== hashPassword(password)) return { error: "Parol noto'g'ri" }

    // Firestore dan ma'lumotlarni o'chirish
    const batch = writeBatch(db)
    const dataKeys = ['transactions', 'debts', 'settings', 'categories', 'pin', 'hamkorlar', 'hamkorlar_sections']
    for (const key of dataKeys) {
      batch.delete(doc(db, USERS_COL, userId, 'data', key))
    }
    batch.delete(doc(db, USERS_COL, userId))
    await batch.commit()

    // localStorage tozalash
    setCurrentUser(null)
    const keysToRemove = Object.keys(localStorage).filter(k =>
      k.includes(userId) || k === 'fin_current_user'
    )
    keysToRemove.forEach(k => localStorage.removeItem(k))

    return { success: true }
  } catch (e) {
    return { error: e?.message || 'Xatolik yuz berdi' }
  }
}

// Parolni username orqali tiklash (email/phone yo'q, shuning uchun username yetarli)
export const resetPasswordByUsername = async (username, newPassword) => {
  const user = await findUserByUsername(username)
  if (!user) return { error: `"${username}" foydalanuvchisi topilmadi` }
  await updateDoc(doc(db, USERS_COL, user.id), { password: hashPassword(newPassword) })
  return { success: true }
}

// localStorage dagi akkauntlarni Firestore ga ko'chirish
export const migrateLocalUsers = async () => {
  // 1. fin_users massividagi eski akkauntlarni migrate qilish
  const raw = localStorage.getItem('fin_users')
  if (raw) {
    try {
      const users = JSON.parse(raw)
      let allSynced = true
      for (const u of users) {
        try {
          const existing = await findUserByUsername(u.username)
          if (!existing) {
            await setDoc(doc(db, USERS_COL, u.id), {
              id: u.id, name: u.name, username: u.username,
              password: u.password, createdAt: u.createdAt || new Date().toISOString()
            })
          }
        } catch { allSynced = false }
      }
      if (allSynced) localStorage.removeItem('fin_users')
    } catch (e) {
      console.warn('[auth] migration error:', e?.code)
    }
  }

  // 2. Joriy session foydalanuvchisini Firestore da tekshirish
  const current = getCurrentUser()
  if (!current?.id) return
  try {
    const snap = await getDoc(doc(db, USERS_COL, current.id))
    if (!snap.exists()) {
      // Telefon xotirasida bor lekin Firestore da yo'q — yuklab qo'yish
      const localPass = (() => {
        try { return JSON.parse(localStorage.getItem('fin_users') || '[]').find(u => u.id === current.id)?.password } catch { return null }
      })()
      await setDoc(doc(db, USERS_COL, current.id), {
        id: current.id,
        name: current.name,
        username: current.username,
        password: localPass || hashPassword('0000'),
        createdAt: new Date().toISOString()
      })
      console.log('[auth] session user synced to Firestore:', current.username)
    }
  } catch (e) {
    console.warn('[auth] session sync failed:', e?.code)
  }
}
