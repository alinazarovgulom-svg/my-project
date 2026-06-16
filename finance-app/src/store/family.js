// Family group helper functions

const FAMILY_PREFIX = 'finance_family_'
const USER_FAMILY_KEY = (userId) => `finance_${userId}_familyId`

const generateFamilyCode = () => {
  const num = Math.floor(100000 + Math.random() * 900000)
  return `FAM-${num}`
}

export const getFamily = (familyId) => {
  try {
    const data = localStorage.getItem(`${FAMILY_PREFIX}${familyId}`)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

const saveFamily = (family) => {
  localStorage.setItem(`${FAMILY_PREFIX}${family.id}`, JSON.stringify(family))
}

export const getUserFamily = (userId) => {
  const familyId = localStorage.getItem(USER_FAMILY_KEY(userId))
  if (!familyId) return null
  return getFamily(familyId)
}

export const getUserFamilyId = (userId) => {
  return localStorage.getItem(USER_FAMILY_KEY(userId))
}

export const createFamily = (userId, username, fullName, familyName) => {
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
  saveFamily(family)
  localStorage.setItem(USER_FAMILY_KEY(userId), familyId)
  return familyId
}

export const joinFamily = (code, userId, username, fullName) => {
  const family = getFamily(code)
  if (!family) return { error: 'Bunday guruh topilmadi' }

  const alreadyMember = family.members.find(m => m.userId === userId)
  if (alreadyMember) return { error: 'Siz allaqachon bu guruh a\'zosisiz' }

  family.members.push({ userId, username, fullName, role: 'member', joinedAt: new Date().toISOString() })
  saveFamily(family)
  localStorage.setItem(USER_FAMILY_KEY(userId), code)
  return { success: true, familyId: code }
}

export const leaveFamily = (familyId, userId) => {
  const family = getFamily(familyId)
  if (!family) return

  family.members = family.members.filter(m => m.userId !== userId)
  if (family.members.length === 0) {
    localStorage.removeItem(`${FAMILY_PREFIX}${familyId}`)
  } else {
    // If admin left, make first member admin
    if (!family.members.find(m => m.role === 'admin')) {
      family.members[0].role = 'admin'
    }
    saveFamily(family)
  }
  localStorage.removeItem(USER_FAMILY_KEY(userId))
}

export const updateMemberRole = (familyId, targetUserId, newRole, requestingUserId) => {
  const family = getFamily(familyId)
  if (!family) return { error: 'Guruh topilmadi' }

  const requester = family.members.find(m => m.userId === requestingUserId)
  if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }

  const idx = family.members.findIndex(m => m.userId === targetUserId)
  if (idx === -1) return { error: 'A\'zo topilmadi' }

  family.members[idx].role = newRole
  saveFamily(family)
  return { success: true }
}

export const removeMember = (familyId, targetUserId, requestingUserId) => {
  const family = getFamily(familyId)
  if (!family) return { error: 'Guruh topilmadi' }

  const requester = family.members.find(m => m.userId === requestingUserId)
  if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }

  family.members = family.members.filter(m => m.userId !== targetUserId)
  saveFamily(family)
  localStorage.removeItem(USER_FAMILY_KEY(targetUserId))
  return { success: true }
}

export const addFamilyTransaction = (familyId, transaction) => {
  const family = getFamily(familyId)
  if (!family) return

  family.transactions = [...(family.transactions || []), transaction]
  saveFamily(family)
}

export const deleteFamilyTransaction = (familyId, transactionId) => {
  const family = getFamily(familyId)
  if (!family) return

  family.transactions = (family.transactions || []).filter(t => t.id !== transactionId)
  saveFamily(family)
}

export const addFamilyDebt = (familyId, debt) => {
  const family = getFamily(familyId)
  if (!family) return

  family.debts = [...(family.debts || []), debt]
  saveFamily(family)
}
