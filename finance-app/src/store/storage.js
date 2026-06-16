// Simple hash for password (not cryptographic, just obfuscation)
export const hashPassword = (pass) => btoa(encodeURIComponent(pass + 'fin@2024'))

export const getUsers = () => JSON.parse(localStorage.getItem('fin_users') || '[]')
export const saveUsers = (users) => localStorage.setItem('fin_users', JSON.stringify(users))

export const getCurrentUser = () => {
  const u = localStorage.getItem('fin_current_user')
  return u ? JSON.parse(u) : null
}
export const setCurrentUser = (user) => {
  if (user) localStorage.setItem('fin_current_user', JSON.stringify(user))
  else localStorage.removeItem('fin_current_user')
}

const key = (name, uid) => `fin_${name}_${uid}`

export const getData = (name, uid) =>
  JSON.parse(localStorage.getItem(key(name, uid)) || '[]')

export const saveData = (name, uid, data) =>
  localStorage.setItem(key(name, uid), JSON.stringify(data))

export const getSettings = (uid) =>
  JSON.parse(localStorage.getItem(key('settings', uid)) || '{}')

export const saveSettings = (uid, settings) =>
  localStorage.setItem(key('settings', uid), JSON.stringify(settings))

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
