import { getData, saveData, generateId } from './storage'

const KEY = 'hamkorlar'

export const getHamkorlar = (uid, type) =>
  getData(KEY, uid).filter(h => h.type === type)

export const saveHamkorlar = (uid, list) =>
  saveData(KEY, uid, list)

export const addHamkor = (uid, type, name, phone = '') => {
  const all = getData(KEY, uid)
  const hamkor = { id: generateId(), type, name, phone, createdAt: new Date().toISOString(), entries: [] }
  saveData(KEY, uid, [...all, hamkor])
  return hamkor
}

export const deleteHamkor = (uid, id) => {
  const all = getData(KEY, uid)
  saveData(KEY, uid, all.filter(h => h.id !== id))
}

export const addEntry = (uid, hamkorId, entry) => {
  const all = getData(KEY, uid)
  const updated = all.map(h => {
    if (h.id !== hamkorId) return h
    return { ...h, entries: [...(h.entries || []), { ...entry, id: generateId(), createdAt: new Date().toISOString() }] }
  })
  saveData(KEY, uid, updated)
}

export const getHamkor = (uid, id) =>
  getData(KEY, uid).find(h => h.id === id)

export const calcDebt = (entries = []) => {
  return entries.reduce((sum, e) => {
    if (e.entryType === 'tolov') return sum - e.amount
    if (e.entryType === 'xomashyo') return sum + e.totalPrice
    if (e.entryType === 'xizmat') return sum + e.amount
    return sum
  }, 0)
}
