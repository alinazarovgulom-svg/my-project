import { db } from './firebase'
import { doc, updateDoc, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore'
import { getData, saveData, generateId } from './storage'

const LOCAL_KEY = (uid) => `wh_auditlog_${uid}`
const MAX_LOCAL = 500 // localStorage da saqlash chegarasi

// --- Shaxsiy log ---

export const getLocalLog = (uid) =>
  JSON.parse(localStorage.getItem(LOCAL_KEY(uid)) || '[]')

const saveLocalLog = (uid, entries) =>
  localStorage.setItem(LOCAL_KEY(uid), JSON.stringify(entries.slice(-MAX_LOCAL)))

export const addLogEntry = async (uid, entry, teamId = null) => {
  const record = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...entry
  }

  // Shaxsiy log — lokal
  const local = getLocalLog(uid)
  saveLocalLog(uid, [...local, record])

  // Jamoaviy log — Firestore ga
  if (teamId) {
    try {
      await updateDoc(doc(db, 'wh_teams', teamId), {
        auditLog: arrayUnion(record)
      })
    } catch (e) {
      console.warn('[audit] team log failed:', e?.message)
    }
  }

  return record
}

export const subscribeToTeamLog = (teamId, callback) => {
  if (!teamId) return () => {}
  return onSnapshot(
    doc(db, 'wh_teams', teamId),
    (snap) => {
      if (snap.exists()) callback(snap.data().auditLog || [])
    },
    () => {}
  )
}

// Amal nomini matn ko'rinishida qaytarish
export const actionLabel = (action) => ({
  kirim_qoshildi:       'Kirim qo\'shildi',
  chiqim_qoshildi:      'Chiqim qo\'shildi',
  kirim_ochirildi:      'Kirim o\'chirildi',
  chiqim_ochirildi:     'Chiqim o\'chirildi',
  mahsulot_qoshildi:    'Mahsulot qo\'shildi',
  mahsulot_tahrirlandi: 'Mahsulot tahrirlandi',
  mahsulot_ochirildi:   'Mahsulot o\'chirildi',
  excel_import:         'Excel import',
}[action] || action)

export const actionColor = (action) => {
  if (action.includes('kirim')) return 'primary'
  if (action.includes('chiqim') && !action.includes('ochir')) return 'red'
  if (action.includes('ochirildi')) return 'slate'
  if (action.includes('mahsulot')) return 'blue'
  if (action === 'excel_import') return 'violet'
  return 'slate'
}
