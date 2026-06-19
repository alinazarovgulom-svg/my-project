import { db } from './firebase'
import {
  doc, setDoc, getDoc,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'

// Firestore ga ma'lumot saqlash
// col: 'users' (default) yoki 'workspaces'
export const syncToCloud = async (storeId, key, data, col = 'users') => {
  if (!storeId) return
  try {
    await setDoc(doc(db, col, storeId, 'data', key), {
      value: JSON.stringify(data),
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.warn('[sync] cloud write failed:', key, e?.code || e?.message)
  }
}

// Firestore dan ma'lumot olish
export const loadFromCloud = async (storeId, key, col = 'users') => {
  if (!storeId) return null
  try {
    const snap = await getDoc(doc(db, col, storeId, 'data', key))
    if (snap.exists()) {
      return JSON.parse(snap.data().value)
    }
  } catch (e) {}
  return null
}

// Real-vaqt tinglash (boshqa qurilmadan o'zgarish bo'lsa darhol yangilanadi)
export const subscribeToCloud = (storeId, key, callback, col = 'users') => {
  if (!storeId) return () => {}
  return onSnapshot(
    doc(db, col, storeId, 'data', key),
    (snap) => {
      if (snap.exists()) {
        try {
          callback(JSON.parse(snap.data().value))
        } catch (e) {}
      }
    },
    () => {}
  )
}
