import { generateId, getData, saveData } from './storage'

const KEY = 'hamkorlar'

export const getHamkorlar = (userId) => getData(KEY, userId)

export const saveHamkorlar = (userId, partners) => saveData(KEY, userId, partners)

export const addHamkor = (userId, partnerData) => {
  const partners = getHamkorlar(userId)
  const partner = {
    id: generateId(),
    ...partnerData,
    entries: [],
    createdAt: new Date().toISOString(),
    userId,
  }
  saveHamkorlar(userId, [...partners, partner])
  return partner
}

export const addHamkorEntry = (userId, partnerId, entry) => {
  const partners = getHamkorlar(userId)
  const updated = partners.map(p => {
    if (p.id !== partnerId) return p
    return { ...p, entries: [...(p.entries || []), { id: generateId(), ...entry }] }
  })
  saveHamkorlar(userId, updated)
}

export const deleteHamkor = (userId, partnerId) => {
  const partners = getHamkorlar(userId)
  saveHamkorlar(userId, partners.filter(p => p.id !== partnerId))
}

export const getPartnerDebt = (partner) => {
  const entries = partner.entries || []
  const debt = entries
    .filter(e => e.type === 'xomashyo' || e.type === 'xizmat')
    .reduce((sum, e) => sum + (parseFloat(e.totalPrice || e.amount) || 0), 0)
  const paid = entries
    .filter(e => e.type === 'tolov')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  return debt - paid
}
