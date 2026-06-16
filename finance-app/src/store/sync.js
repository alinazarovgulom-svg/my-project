import { db } from './firebase'
import {
  doc, setDoc, getDoc, collection, getDocs,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'

// Firestore ga ma'lumot saqlash
export const syncToCloud = async (userId, key, data) => {
  if (!userId) return
  try {
    await setDoc(doc(db, 'users', userId, 'data', key), {
      value: JSON.stringify(data),
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.warn('[sync] cloud write failed:', key, e?.code || e?.message)
  }
}

// Firestore dan ma'lumot olish
export const loadFromCloud = async (userId, key) => {
  if (!userId) return null
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'data', key))
    if (snap.exists()) {
      return JSON.parse(snap.data().value)
    }
  } catch (e) {}
  return null
}

// Real-vaqt tinglash (boshqa qurilmadan o'zgarish bo'lsa darhol yangilanadi)
export const subscribeToCloud = (userId, key, callback) => {
  if (!userId) return () => {}
  return onSnapshot(
    doc(db, 'users', userId, 'data', key),
    (snap) => {
      if (snap.exists()) {
        try {
          callback(JSON.parse(snap.data().value))
        } catch (e) {}
      }
    },
    () => {} // xato bo'lsa e'tiborsiz
  )
}
