import { db } from './firebase'
import { doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore'

const TEAM_PREFIX = 'wh_team_'
const USER_TEAM_KEY = (uid) => `wh_${uid}_teamId`
const LAST_TEAM_KEY = (uid) => `wh_last_team_${uid}`

const generateTeamCode = () => `WH-${Math.floor(100000 + Math.random() * 900000)}`

const getTeamFromCloud = async (teamId) => {
  try {
    const snap = await getDoc(doc(db, 'wh_teams', teamId))
    return snap.exists() ? snap.data() : null
  } catch { return null }
}

const saveTeamToCloud = async (team) => {
  try {
    await setDoc(doc(db, 'wh_teams', team.id), team)
  } catch (e) {
    console.warn('[wh-team] cloud write failed:', e?.code || e?.message)
  }
}

const getTeamLocal = (teamId) => {
  try {
    const d = localStorage.getItem(`${TEAM_PREFIX}${teamId}`)
    return d ? JSON.parse(d) : null
  } catch { return null }
}

const saveTeamLocal = (team) => {
  localStorage.setItem(`${TEAM_PREFIX}${team.id}`, JSON.stringify(team))
}

export const getTeam = (teamId) => getTeamLocal(teamId)

export const getTeamAsync = async (teamId) => {
  const cloud = await getTeamFromCloud(teamId)
  if (cloud) { saveTeamLocal(cloud); return cloud }
  return getTeamLocal(teamId)
}

export const getUserTeam = (userId) => {
  const teamId = localStorage.getItem(USER_TEAM_KEY(userId))
  if (!teamId) return null
  return getTeamLocal(teamId)
}

export const getUserTeamId = (userId) => localStorage.getItem(USER_TEAM_KEY(userId))

export const createTeam = async (userId, username, fullName, teamName, existingMovements = [], existingProducts = []) => {
  const teamId = generateTeamCode()
  const team = {
    id: teamId,
    name: teamName,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    members: [{ userId, username, fullName, role: 'admin', joinedAt: new Date().toISOString() }],
    movements: existingMovements,
    products: existingProducts
  }
  saveTeamLocal(team)
  localStorage.setItem(USER_TEAM_KEY(userId), teamId)
  await saveTeamToCloud(team)
  return teamId
}

export const joinTeam = async (code, userId, username, fullName) => {
  let team = await getTeamFromCloud(code)
  if (!team) team = getTeamLocal(code)
  if (!team) return { error: 'Bunday jamoa topilmadi' }
  if (team.members.find(m => m.userId === userId)) return { error: 'Siz allaqachon bu jamoada siz' }
  const hasAdmin = team.members.some(m => m.role === 'admin')
  const role = hasAdmin ? 'manager' : 'admin'
  team.members.push({ userId, username, fullName, role, joinedAt: new Date().toISOString() })
  saveTeamLocal(team)
  localStorage.setItem(USER_TEAM_KEY(userId), code)
  await saveTeamToCloud(team)
  return { success: true, teamId: code }
}

export const leaveTeam = async (teamId, userId) => {
  try {
    const snap = await getDoc(doc(db, 'wh_teams', teamId))
    if (!snap.exists()) { localStorage.removeItem(USER_TEAM_KEY(userId)); return }
    const team = snap.data()
    const leaving = team.members.find(m => m.userId === userId)
    const remaining = team.members.filter(m => m.userId !== userId)
    if (remaining.length === 0) {
      await updateDoc(doc(db, 'wh_teams', teamId), { members: [] })
      localStorage.setItem(LAST_TEAM_KEY(userId), teamId)
      localStorage.removeItem(`${TEAM_PREFIX}${teamId}`)
      localStorage.removeItem(USER_TEAM_KEY(userId))
      return
    }
    let updated = remaining
    if (leaving?.role === 'admin' && !remaining.find(m => m.role === 'admin')) {
      updated = [{ ...remaining[0], role: 'admin' }, ...remaining.slice(1)]
    }
    await updateDoc(doc(db, 'wh_teams', teamId), { members: updated })
    localStorage.setItem(LAST_TEAM_KEY(userId), teamId)
    localStorage.removeItem(USER_TEAM_KEY(userId))
  } catch (e) {
    console.warn('[wh-team] leaveTeam failed:', e?.code || e?.message)
  }
}

export const updateMemberRole = async (teamId, targetUserId, newRole, requestingUserId) => {
  try {
    const snap = await getDoc(doc(db, 'wh_teams', teamId))
    if (!snap.exists()) return { error: 'Jamoa topilmadi' }
    const team = snap.data()
    const requester = team.members.find(m => m.userId === requestingUserId)
    if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }
    const updated = team.members.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m)
    await updateDoc(doc(db, 'wh_teams', teamId), { members: updated })
    return { success: true }
  } catch (e) {
    return { error: e?.message || 'Xatolik' }
  }
}

export const removeMember = async (teamId, targetUserId, requestingUserId) => {
  try {
    const snap = await getDoc(doc(db, 'wh_teams', teamId))
    if (!snap.exists()) return { error: 'Jamoa topilmadi' }
    const team = snap.data()
    const requester = team.members.find(m => m.userId === requestingUserId)
    if (!requester || requester.role !== 'admin') return { error: 'Ruxsat yo\'q' }
    const updated = team.members.filter(m => m.userId !== targetUserId)
    await updateDoc(doc(db, 'wh_teams', teamId), { members: updated })
    localStorage.removeItem(USER_TEAM_KEY(targetUserId))
    return { success: true }
  } catch (e) {
    return { error: e?.message || 'Xatolik' }
  }
}

export const addTeamMovement = async (teamId, movement) => {
  try {
    await updateDoc(doc(db, 'wh_teams', teamId), { movements: arrayUnion(movement) })
  } catch (e) {
    console.warn('[wh-team] addTeamMovement failed:', e?.code || e?.message)
  }
}

export const deleteTeamMovement = async (teamId, movementId) => {
  try {
    const snap = await getDoc(doc(db, 'wh_teams', teamId))
    if (!snap.exists()) return
    const team = snap.data()
    const mv = (team.movements || []).find(m => m.id === movementId)
    if (!mv) return
    await updateDoc(doc(db, 'wh_teams', teamId), { movements: arrayRemove(mv) })
  } catch (e) {
    console.warn('[wh-team] deleteTeamMovement failed:', e?.code || e?.message)
  }
}

export const subscribeToTeam = (teamId, callback) => {
  if (!teamId) return () => {}
  return onSnapshot(
    doc(db, 'wh_teams', teamId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        saveTeamLocal(data)
        callback(data)
      }
    },
    () => {}
  )
}
