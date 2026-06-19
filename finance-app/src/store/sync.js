import { db } from './firebase'
import {
  doc, setDoc, getDocFromServer,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'

// col = 'users' (shaxsiy) yoki 'families' (guruh uchun)
const getRef = (col, id, key) => doc(db, col, id, 'data', key)

export const syncToCloud = async (userId, key, data, col = 'users') => {
  if (!userId) return
  try {
    await setDoc(getRef(col, userId, key), {
      value: JSON.stringify(data),
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.warn('[sync] write failed:', key, e?.code || e?.message)
  }
}

export const loadFromCloud = async (userId, key, col = 'users') => {
  if (!userId) return null
  try {
    const snap = await getDocFromServer(getRef(col, userId, key))
    if (snap.exists()) return JSON.parse(snap.data().value)
    return null
  } catch (e) {
    console.warn('[sync] load failed:', key, e?.code || e?.message)
    return null
  }
}

export const subscribeToCloud = (userId, key, callback, col = 'users') => {
  if (!userId) return () => {}
  return onSnapshot(
    getRef(col, userId, key),
    (snap) => {
      if (snap.exists()) {
        try { callback(JSON.parse(snap.data().value)) } catch (e) {}
      }
    },
    (e) => console.warn('[sync] snapshot error:', key, e?.code)
  )
}
