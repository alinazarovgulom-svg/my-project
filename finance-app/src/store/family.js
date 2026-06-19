import { db } from './firebase'
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { loadFromCloud, syncToCloud } from './sync'
import { getData, getSettings } from './storage'

const FAMILY_PREFIX = 'finance_family_'
const USER_FAMILY_KEY = (userId) => `finance_${userId}_familyId`

const generateFamilyCode = () => {
  const num = Math.floor(100000 + Math.random() * 900000)
  return `FAM-${num}`
}

// Firestore dan oila o'qish
const getFamilyFromCloud = async (familyId) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    return snap.exists() ? snap.data() : null
  } catch { return null }
}

// Firestore ga oila saqlash
const saveFamilyToCloud = async (family) => {
  try {
    await setDoc(doc(db, 'families', family.id), family)
  } catch (e) {
    console.warn('[family] cloud write failed:', e?.code || e?.message)
  }
}

// Lokal cache dan o'qish
const getFamilyLocal = (familyId) => {
  try {
    const data = localStorage.getItem(`${FAMILY_PREFIX}${familyId}`)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

// Lokal cache ga saqlash
const saveFamilyLocal = (family) => {
  localStorage.setItem(`${FAMILY_PREFIX}${family.id}`, JSON.stringify(family))
}

export const getFamily = (familyId) => {
  return getFamilyLocal(familyId)
}

export const getFamilyAsync = async (familyId) => {
  const cloud = await getFamilyFromCloud(familyId)
  if (cloud) { saveFamilyLocal(cloud); return cloud }
  return getFamilyLocal(familyId)
}

export const getUserFamily = (userId) => {
  const familyId = localStorage.getItem(USER_FAMILY_KEY(userId))
  if (!familyId) return null
  return getFamilyLocal(familyId)
}

export const getUserFamilyId = (userId) => {
  return localStorage.getItem(USER_FAMILY_KEY(userId))
}

export const createFamily = async (userId, username, fullName, familyName) => {
  const familyId = generateFamilyCode()
  const family = {
    id: familyId,
    name: familyName,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    members: [
      { userId, username, fullName, role: 'admin', joinedAt: new Date().toISOString() }
    ],
  }
  saveFamilyLocal(family)
  localStorage.setItem(USER_FAMILY_KEY(userId), familyId)
  await saveFamilyToCloud(family)

  // Admin mavjud ma'lumotlarini guruh namespace ga ko'chirish
  // Firebase + localStorage ikkalasini tekshirib, ko'proq bo'lganini oladi
  const arrayKeys = ['transactions', 'debts', 'hamkorlar_sections', 'hamkorlar']
  const [cloudTx, cloudDebts, cloudSec, cloudPar, cloudSettings, cloudCats] = await Promise.all([
    loadFromCloud(userId, 'transactions'),
    loadFromCloud(userId, 'debts'),
    loadFromCloud(userId, 'hamkorlar_sections'),
    loadFromCloud(userId, 'hamkorlar'),
    loadFromCloud(userId, 'settings'),
    loadFromCloud(userId, 'categories'),
  ])

  const pick = (cloud, local) => {
    if (Array.isArray(cloud) && Array.isArray(local))
      return cloud.length >= local.length ? cloud : local
    return cloud ?? local ?? null
  }

  const migrationData = {
    transactions: pick(cloudTx, getData('transactions', userId)),
    debts: pick(cloudDebts, getData('debts', userId)),
    hamkorlar_sections: pick(cloudSec, getData('hamkorlar_sections', userId)),
    hamkorlar: pick(cloudPar, getData('hamkorlar', userId)),
    settings: cloudSettings || getSettings(userId),
    categories: pick(cloudCats, (() => { try { return JSON.parse(localStorage.getItem(`finance_${userId}_categories`) || 'null') } catch { return null } })()),
  }

  await Promise.all(Object.entries(migrationData).map(([k, v]) => {
    if (!v || (Array.isArray(v) && v.length === 0)) return null
    if (k === 'categories') localStorage.setItem(`finance_${familyId}_categories`, JSON.stringify(v))
    return syncToCloud(familyId, k, v)
  }))

  return familyId
}

export const joinFamily = async (code, userId, username, fullName) => {
  // Avval clouddan qidirish
  let family = await getFamilyFromCloud(code)
  if (!family) family = getFamilyLocal(code)
  if (!family) return { error: 'Bunday guruh topilmadi' }

  const alreadyMember = family.members.find(m => m.userId === userId)
  if (alreadyMember) return { error: 'Siz allaqachon bu guruh a\'zosisiz' }

  // Faqat a'zo qo'shiladi — shaxsiy ma'lumotlari guruhga o'tmaydi
  family.members.push({ userId, username, fullName, role: 'member', joinedAt: new Date().toISOString() })
  saveFamilyLocal(family)
  localStorage.setItem(USER_FAMILY_KEY(userId), code)
  await saveFamilyToCloud(family)
  return { success: true, familyId: code }
}

export const leaveFamily = async (familyId, userId) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) { localStorage.removeItem(USER_FAMILY_KEY(userId)); return }
    const family = snap.data()
    const leavingMember = family.members.find(m => m.userId === userId)
    const remaining = family.members.filter(m => m.userId !== userId)
    if (remaining.length === 0) {
      localStorage.removeItem(`${FAMILY_PREFIX}${familyId}`)
      localStorage.removeItem(USER_FAMILY_KEY(userId))
      try { await deleteDoc(doc(db, 'families', familyId)) } catch {}
      return
    }
    let updatedMembers = remaining
    if (leavingMember?.role === 'admin' && !remaining.find(m => m.role === 'admin')) {
      updatedMembers = [{ ...remaining[0], role: 'admin' }, ...remaining.slice(1)]
    }
    await updateDoc(doc(db, 'families', familyId), { members: updatedMembers })
    localStorage.removeItem(USER_FAMILY_KEY(userId))
  } catch (e) {
    console.warn('[family] leaveFamily failed:', e?.code || e?.message)
  }
}

export const updateMemberRole = async (familyId, targetUserId, newRole, requestingUserId) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return { error: 'Guruh topilmadi' }
    const family = snap.data()
    const requester = family.members.find(m => m.userId === requestingUserId)
    if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }
    const updatedMembers = family.members.map(m =>
      m.userId === targetUserId ? { ...m, role: newRole } : m
    )
    await updateDoc(doc(db, 'families', familyId), { members: updatedMembers })
    return { success: true }
  } catch (e) {
    return { error: e?.message || 'Xatolik' }
  }
}

export const removeMember = async (familyId, targetUserId, requestingUserId) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return { error: 'Guruh topilmadi' }
    const family = snap.data()
    const requester = family.members.find(m => m.userId === requestingUserId)
    if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }
    const updatedMembers = family.members.filter(m => m.userId !== targetUserId)
    await updateDoc(doc(db, 'families', familyId), { members: updatedMembers })
    localStorage.removeItem(USER_FAMILY_KEY(targetUserId))
    return { success: true }
  } catch (e) {
    return { error: e?.message || 'Xatolik' }
  }
}

export const addFamilyTransaction = async (familyId, transaction) => {
  try {
    await updateDoc(doc(db, 'families', familyId), {
      transactions: arrayUnion(transaction)
    })
  } catch (e) {
    console.warn('[family] addFamilyTransaction failed:', e?.code || e?.message)
  }
}

export const deleteFamilyTransaction = async (familyId, transactionId) => {
  // arrayRemove requires exact object match — fetch first to find the object
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return
    const family = snap.data()
    const tx = (family.transactions || []).find(t => t.id === transactionId)
    if (!tx) return
    await updateDoc(doc(db, 'families', familyId), {
      transactions: arrayRemove(tx)
    })
  } catch (e) {
    console.warn('[family] deleteFamilyTransaction failed:', e?.code || e?.message)
  }
}

export const updateFamilyTransaction = async (familyId, updatedTx) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return
    const family = snap.data()
    const updatedTransactions = (family.transactions || []).map(t => t.id === updatedTx.id ? updatedTx : t)
    await updateDoc(doc(db, 'families', familyId), { transactions: updatedTransactions })
  } catch (e) {
    console.warn('[family] updateFamilyTransaction failed:', e?.code || e?.message)
  }
}

export const addFamilyDebt = async (familyId, debt) => {
  try {
    await updateDoc(doc(db, 'families', familyId), {
      debts: arrayUnion(debt)
    })
  } catch (e) {
    console.warn('[family] addFamilyDebt failed:', e?.code || e?.message)
  }
}

export const deleteFamilyDebt = async (familyId, debtId) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return
    const family = snap.data()
    const debt = (family.debts || []).find(d => d.id === debtId)
    if (!debt) return
    await updateDoc(doc(db, 'families', familyId), { debts: arrayRemove(debt) })
  } catch (e) {
    console.warn('[family] deleteFamilyDebt failed:', e?.code || e?.message)
  }
}

export const updateFamilyDebt = async (familyId, updatedDebt) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return
    const family = snap.data()
    const updatedDebts = (family.debts || []).map(d => d.id === updatedDebt.id ? updatedDebt : d)
    await updateDoc(doc(db, 'families', familyId), { debts: updatedDebts })
  } catch (e) {
    console.warn('[family] updateFamilyDebt failed:', e?.code || e?.message)
  }
}

export const updateMemberLastSeen = async (familyId, userId) => {
  try {
    const snap = await getDoc(doc(db, 'families', familyId))
    if (!snap.exists()) return
    const family = snap.data()
    const updatedMembers = family.members.map(m =>
      m.userId === userId ? { ...m, lastSeen: new Date().toISOString() } : m
    )
    await updateDoc(doc(db, 'families', familyId), { members: updatedMembers })
  } catch (e) {
    console.warn('[family] updateMemberLastSeen failed:', e?.code || e?.message)
  }
}

export const subscribeToFamily = (familyId, callback) => {
  if (!familyId) return () => {}
  return onSnapshot(
    doc(db, 'families', familyId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        saveFamilyLocal(data)
        callback(data)
      }
    },
    () => {}
  )
}
