import { db } from './firebase'
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore'
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

// Ro'yxatdan o'tish: Firestore ga yozish
export const registerUser = async (name, username, password) => {
  const existing = await findUserByUsername(username)
  if (existing) return { error: 'Bu login band, boshqa tanlang' }
  const id = generateId()
  const newUser = { id, name, username, password: hashPassword(password), createdAt: new Date().toISOString() }
  await setDoc(doc(db, USERS_COL, id), newUser)
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

// localStorage dagi eski akkauntni Firestore ga ko'chirish (bir martalik migration)
export const migrateLocalUsers = async () => {
  const raw = localStorage.getItem('fin_users')
  if (!raw) return
  try {
    const users = JSON.parse(raw)
    for (const u of users) {
      const existing = await findUserByUsername(u.username)
      if (!existing) {
        await setDoc(doc(db, USERS_COL, u.id), {
          id: u.id, name: u.name, username: u.username,
          password: u.password, createdAt: u.createdAt || new Date().toISOString()
        })
      }
    }
    localStorage.removeItem('fin_users')
  } catch (e) {
    console.error('Migration error:', e)
  }
}
