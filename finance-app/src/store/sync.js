import { db } from './firebase'
import {
  doc, setDoc, getDocFromServer,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'

export const syncToCloud = async (userId, key, data) => {
  if (!userId) return
  try {
    await setDoc(doc(db, 'users', userId, 'data', key), {
      value: JSON.stringify(data),
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.warn('[sync] write failed:', key, e?.code || e?.message)
  }
}

// getDocFromServer — keshni chetlab, serverdan majburiy o'qiydi
export const loadFromCloud = async (userId, key) => {
  if (!userId) return null
  try {
    const snap = await getDocFromServer(doc(db, 'users', userId, 'data', key))
    if (snap.exists()) return JSON.parse(snap.data().value)
    return null
  } catch (e) {
    console.warn('[sync] load failed:', key, e?.code || e?.message)
    return null
  }
}

export const subscribeToCloud = (userId, key, callback) => {
  if (!userId) return () => {}
  return onSnapshot(
    doc(db, 'users', userId, 'data', key),
    (snap) => {
      if (snap.exists()) {
        try { callback(JSON.parse(snap.data().value)) } catch (e) {}
      }
    },
    (e) => console.warn('[sync] snapshot error:', key, e?.code)
  )
}
