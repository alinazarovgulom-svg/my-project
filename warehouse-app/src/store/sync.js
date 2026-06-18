import { db } from './firebase'
import { doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'

export const syncToCloud = async (userId, key, data) => {
  if (!userId) return
  try {
    await setDoc(doc(db, 'wh_users', userId, 'data', key), {
      value: JSON.stringify(data),
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.warn('[wh-sync] write failed:', key, e?.code || e?.message)
  }
}

export const loadFromCloud = async (userId, key) => {
  if (!userId) return null
  try {
    const snap = await getDoc(doc(db, 'wh_users', userId, 'data', key))
    if (snap.exists()) return JSON.parse(snap.data().value)
  } catch (e) {}
  return null
}

export const deleteFromCloud = async (userId, key) => {
  if (!userId) return
  try {
    await deleteDoc(doc(db, 'wh_users', userId, 'data', key))
  } catch (e) {
    console.warn('[wh-sync] delete failed:', key, e?.code || e?.message)
  }
}

export const subscribeToCloud = (userId, key, callback) => {
  if (!userId) return () => {}
  return onSnapshot(
    doc(db, 'wh_users', userId, 'data', key),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.exists() && !snap.metadata.hasPendingWrites) {
        try { callback(JSON.parse(snap.data().value)) } catch (e) {}
      }
    },
    () => {}
  )
}
