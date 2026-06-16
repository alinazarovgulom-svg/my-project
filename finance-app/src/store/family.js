import { db } from './firebase'
import {
  doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore'

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
  } catch (e) {}
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
    transactions: [],
    debts: []
  }
  saveFamilyLocal(family)
  localStorage.setItem(USER_FAMILY_KEY(userId), familyId)
  await saveFamilyToCloud(family)
  return familyId
}

export const joinFamily = async (code, userId, username, fullName) => {
  // Avval clouddan qidirish
  let family = await getFamilyFromCloud(code)
  if (!family) family = getFamilyLocal(code)
  if (!family) return { error: 'Bunday guruh topilmadi' }

  const alreadyMember = family.members.find(m => m.userId === userId)
  if (alreadyMember) return { error: 'Siz allaqachon bu guruh a\'zosisiz' }

  family.members.push({ userId, username, fullName, role: 'member', joinedAt: new Date().toISOString() })
  saveFamilyLocal(family)
  localStorage.setItem(USER_FAMILY_KEY(userId), code)
  await saveFamilyToCloud(family)
  return { success: true, familyId: code }
}

export const leaveFamily = async (familyId, userId) => {
  let family = await getFamilyFromCloud(familyId) || getFamilyLocal(familyId)
  if (!family) return

  family.members = family.members.filter(m => m.userId !== userId)
  if (family.members.length === 0) {
    localStorage.removeItem(`${FAMILY_PREFIX}${familyId}`)
    try { await deleteDoc(doc(db, 'families', familyId)) } catch {}
  } else {
    if (!family.members.find(m => m.role === 'admin')) {
      family.members[0].role = 'admin'
    }
    saveFamilyLocal(family)
    await saveFamilyToCloud(family)
  }
  localStorage.removeItem(USER_FAMILY_KEY(userId))
}

export const updateMemberRole = async (familyId, targetUserId, newRole, requestingUserId) => {
  let family = await getFamilyFromCloud(familyId) || getFamilyLocal(familyId)
  if (!family) return { error: 'Guruh topilmadi' }

  const requester = family.members.find(m => m.userId === requestingUserId)
  if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }

  const idx = family.members.findIndex(m => m.userId === targetUserId)
  if (idx === -1) return { error: 'A\'zo topilmadi' }

  family.members[idx].role = newRole
  saveFamilyLocal(family)
  await saveFamilyToCloud(family)
  return { success: true }
}

export const removeMember = async (familyId, targetUserId, requestingUserId) => {
  let family = await getFamilyFromCloud(familyId) || getFamilyLocal(familyId)
  if (!family) return { error: 'Guruh topilmadi' }

  const requester = family.members.find(m => m.userId === requestingUserId)
  if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }

  family.members = family.members.filter(m => m.userId !== targetUserId)
  saveFamilyLocal(family)
  localStorage.removeItem(USER_FAMILY_KEY(targetUserId))
  await saveFamilyToCloud(family)
  return { success: true }
}

export const addFamilyTransaction = async (familyId, transaction) => {
  let family = await getFamilyFromCloud(familyId) || getFamilyLocal(familyId)
  if (!family) return

  family.transactions = [...(family.transactions || []), transaction]
  saveFamilyLocal(family)
  await saveFamilyToCloud(family)
}

export const deleteFamilyTransaction = async (familyId, transactionId) => {
  let family = await getFamilyFromCloud(familyId) || getFamilyLocal(familyId)
  if (!family) return

  family.transactions = (family.transactions || []).filter(t => t.id !== transactionId)
  saveFamilyLocal(family)
  await saveFamilyToCloud(family)
}

export const addFamilyDebt = async (familyId, debt) => {
  let family = await getFamilyFromCloud(familyId) || getFamilyLocal(familyId)
  if (!family) return

  family.debts = [...(family.debts || []), debt]
  saveFamilyLocal(family)
  await saveFamilyToCloud(family)
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
