import { db } from './firebase'
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
  onSnapshot
} from 'firebase/firestore'
import { findUserByUsername } from './auth'

function generateWorkspaceCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `KASSA-${code}`
}

export function getUserWorkspaceId(userId) {
  if (!userId) return null
  return localStorage.getItem(`finance_${userId}_workspaceId`) || null
}

export const DEFAULT_PERMISSIONS = {
  admin:  { transactions: 'edit', debts: 'edit', hamkorlar: 'edit', reports: 'view', exchange: 'edit' },
  kassir: { transactions: 'edit', debts: 'edit', hamkorlar: 'edit', reports: 'none', exchange: 'edit' },
  rahbar: { transactions: 'view', debts: 'view', hamkorlar: 'none', reports: 'view', exchange: 'none' },
}

export const createWorkspace = async (userId, username, fullName, workspaceName) => {
  const id = generateWorkspaceCode()
  const workspace = {
    id,
    name: workspaceName,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    members: [{
      userId, username, fullName,
      role: 'admin',
      permissions: DEFAULT_PERMISSIONS.admin,
      joinedAt: new Date().toISOString()
    }]
  }
  await setDoc(doc(db, 'workspaces', id), workspace)
  localStorage.setItem(`finance_${userId}_workspaceId`, id)
  return { workspace }
}

export const joinWorkspace = async (userId, username, fullName, workspaceId) => {
  const ref = doc(db, 'workspaces', workspaceId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return { error: 'Korxona topilmadi. Kodni tekshiring.' }
  const workspace = snap.data()
  const existing = workspace.members.find(m => m.userId === userId)
  if (existing) {
    localStorage.setItem(`finance_${userId}_workspaceId`, workspaceId)
    return { workspace }
  }
  const newMember = {
    userId, username, fullName,
    role: 'kassir',
    permissions: DEFAULT_PERMISSIONS.kassir,
    joinedAt: new Date().toISOString()
  }
  await updateDoc(ref, { members: arrayUnion(newMember) })
  localStorage.setItem(`finance_${userId}_workspaceId`, workspaceId)
  return { workspace: { ...workspace, members: [...workspace.members, newMember] } }
}

export const leaveWorkspace = async (userId, workspaceId) => {
  const ref = doc(db, 'workspaces', workspaceId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    localStorage.removeItem(`finance_${userId}_workspaceId`)
    return { success: true }
  }
  const member = snap.data().members.find(m => m.userId === userId)
  if (member) await updateDoc(ref, { members: arrayRemove(member) })
  localStorage.removeItem(`finance_${userId}_workspaceId`)
  return { success: true }
}

export const addMemberByUsername = async (workspaceId, targetUsername, role = 'kassir') => {
  const targetUser = await findUserByUsername(targetUsername)
  if (!targetUser) return { error: `"${targetUsername}" foydalanuvchisi topilmadi` }
  const ref = doc(db, 'workspaces', workspaceId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return { error: 'Korxona topilmadi' }
  const workspace = snap.data()
  if (workspace.members.find(m => m.userId === targetUser.id)) return { error: "Bu foydalanuvchi allaqachon a'zo" }
  const newMember = {
    userId: targetUser.id,
    username: targetUser.username,
    fullName: targetUser.name,
    role,
    permissions: DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.kassir,
    joinedAt: new Date().toISOString()
  }
  await updateDoc(ref, { members: arrayUnion(newMember) })
  return { success: true, member: newMember }
}

export const updateMemberRole = async (workspaceId, targetUserId, newRole, currentMembers) => {
  const ref = doc(db, 'workspaces', workspaceId)
  const oldMember = currentMembers.find(m => m.userId === targetUserId)
  if (!oldMember) return { error: "A'zo topilmadi" }
  await updateDoc(ref, { members: arrayRemove(oldMember) })
  const updated = { ...oldMember, role: newRole, permissions: DEFAULT_PERMISSIONS[newRole] || oldMember.permissions }
  await updateDoc(ref, { members: arrayUnion(updated) })
  return { success: true }
}

export const removeMember = async (workspaceId, targetUserId, currentMembers) => {
  const ref = doc(db, 'workspaces', workspaceId)
  const member = currentMembers.find(m => m.userId === targetUserId)
  if (!member) return { error: "A'zo topilmadi" }
  await updateDoc(ref, { members: arrayRemove(member) })
  return { success: true }
}

export const subscribeToWorkspace = (workspaceId, callback) => {
  if (!workspaceId) return () => {}
  return onSnapshot(doc(db, 'workspaces', workspaceId), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}
