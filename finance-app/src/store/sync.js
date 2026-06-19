import { db } from './firebase'
import {
  doc, setDoc, getDocFromServer,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'

// Firestore ga ma'lumot saqlash
export const syncToCloud = async (userId, key, data) => {
  if (!userId) return
  console.log(`[SYNC ➡️ WRITE] key="${key}" | uid=${userId} | items=${Array.isArray(data) ? data.length : typeof data}`)
  try {
    await setDoc(doc(db, 'users', userId, 'data', key), {
      value: JSON.stringify(data),
      updatedAt: serverTimestamp()
    })
    console.log(`[SYNC ✅ WRITE OK] key="${key}"`)
  } catch (e) {
    console.error(`[SYNC ❌ WRITE FAIL] key="${key}" | code=${e?.code} | msg=${e?.message}`)
  }
}

// Firestore dan ma'lumot olish (serverdan majburiy)
export const loadFromCloud = async (userId, key) => {
  if (!userId) return null
  console.log(`[SYNC ⬇️ LOAD] key="${key}" | uid=${userId}`)
  try {
    const snap = await getDocFromServer(doc(db, 'users', userId, 'data', key))
    if (snap.exists()) {
      const data = JSON.parse(snap.data().value)
      console.log(`[SYNC ✅ LOAD OK] key="${key}" | items=${Array.isArray(data) ? data.length : typeof data}`)
      return data
    } else {
      console.warn(`[SYNC ⚠️ LOAD EMPTY] key="${key}" — Firebase da hujjat yo'q`)
      return null
    }
  } catch (e) {
    console.error(`[SYNC ❌ LOAD FAIL] key="${key}" | code=${e?.code} | msg=${e?.message}`)
    return null
  }
}

// Real-vaqt tinglash (onSnapshot)
export const subscribeToCloud = (userId, key, callback) => {
  if (!userId) return () => {}
  console.log(`[SYNC 👂 SUBSCRIBE] key="${key}" | uid=${userId}`)
  return onSnapshot(
    doc(db, 'users', userId, 'data', key),
    (snap) => {
      if (snap.exists()) {
        try {
          const data = JSON.parse(snap.data().value)
          console.log(`[SYNC 🔔 SNAPSHOT] key="${key}" | fromCache=${snap.metadata.fromCache} | items=${Array.isArray(data) ? data.length : typeof data}`)
          callback(data)
        } catch (e) {
          console.error(`[SYNC ❌ PARSE] key="${key}" | ${e?.message}`)
        }
      } else {
        console.warn(`[SYNC ⚠️ SNAPSHOT EMPTY] key="${key}" — hujjat topilmadi`)
      }
    },
    (e) => {
      console.error(`[SYNC ❌ SNAPSHOT ERROR] key="${key}" | code=${e?.code} | msg=${e?.message}`)
    }
  )
}
