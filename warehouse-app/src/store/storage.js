export const hashPassword = (pass) => btoa(encodeURIComponent(pass + 'wh@2024'))

export const getUsers = () => JSON.parse(localStorage.getItem('wh_users') || '[]')
export const saveUsers = (users) => localStorage.setItem('wh_users', JSON.stringify(users))

export const getCurrentUser = () => {
  const u = localStorage.getItem('wh_current_user')
  return u ? JSON.parse(u) : null
}
export const setCurrentUser = (user) => {
  if (user) localStorage.setItem('wh_current_user', JSON.stringify(user))
  else localStorage.removeItem('wh_current_user')
}

const key = (name, uid) => `wh_${name}_${uid}`

export const getData = (name, uid) =>
  JSON.parse(localStorage.getItem(key(name, uid)) || '[]')

export const saveData = (name, uid, data) =>
  localStorage.setItem(key(name, uid), JSON.stringify(data))

export const getObjData = (name, uid) =>
  JSON.parse(localStorage.getItem(key(name, uid)) || '{}')

export const saveObjData = (name, uid, data) =>
  localStorage.setItem(key(name, uid), JSON.stringify(data))

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
