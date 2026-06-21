import { getData, saveData } from './storage'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'
import { getUserWorkspaceId } from './workspace'

const ARCHIVE_KEY = 'hamkorlar_archive'
const ARCHIVE_DAYS = 30

const getStoreInfo = (uid) => {
  const wid = getUserWorkspaceId(uid)
  return wid ? { storeId: wid, col: 'workspaces' } : { storeId: uid, col: 'users' }
}

// localStorage + Firestore ga birga saqlash
const save = (key, uid, data) => {
  saveData(key, uid, data)
  const { storeId, col } = getStoreInfo(uid)
  syncToCloud(storeId, key, data, col)
}

// Firestore dan yuklash va localStorage ni yangilash
export const loadHamkorlarFromCloud = async (uid) => {
  const { storeId, col } = getStoreInfo(uid)
  const [sections, partners, archive] = await Promise.all([
    loadFromCloud(storeId, 'hamkorlar_sections', col),
    loadFromCloud(storeId, 'hamkorlar', col),
    loadFromCloud(storeId, ARCHIVE_KEY, col),
  ])
  if (sections) saveData('hamkorlar_sections', uid, sections)
  if (partners) saveData('hamkorlar', uid, partners)
  if (archive) saveData(ARCHIVE_KEY, uid, archive)
  return { sections, partners, archive }
}

// Real-vaqt tinglash
export const subscribeHamkorlar = (uid, onSections, onPartners) => {
  const { storeId, col } = getStoreInfo(uid)
  const unsubSec = subscribeToCloud(storeId, 'hamkorlar_sections', (data) => {
    saveData('hamkorlar_sections', uid, data)
    onSections?.(data)
  }, col)
  const unsubPar = subscribeToCloud(storeId, 'hamkorlar', (data) => {
    saveData('hamkorlar', uid, data)
    onPartners?.(data)
  }, col)
  return () => { unsubSec(); unsubPar() }
}

export const calcDebt = (entries = []) =>
  entries.reduce((sum, e) => {
    if (e.entryType === 'tolov') return sum - e.amount
    if (e.entryType === 'xomashyo') return sum + e.totalPrice
    if (e.entryType === 'xizmat') return sum + e.amount
    return sum
  }, 0)

// Valyuta bo'yicha qarz hisoblash: { UZS: 50000, USD: -100, ... }
export const calcDebtByCurrency = (entries = []) => {
  const byCur = {}
  entries.forEach(e => {
    const cur = e.currency || 'UZS'
    if (!byCur[cur]) byCur[cur] = 0
    if (e.entryType === 'tolov') {
      const pCur = e.paidCurrency || cur
      if (!byCur[pCur]) byCur[pCur] = 0
      byCur[pCur] -= e.paidAmount || e.amount
      // if converted debt currency differs
      if (e.currency && e.currency !== pCur) {
        if (!byCur[e.currency]) byCur[e.currency] = 0
        byCur[e.currency] += e.amount
      }
    } else if (e.entryType === 'xomashyo') {
      byCur[cur] += e.totalPrice || 0
    } else if (e.entryType === 'xizmat') {
      byCur[cur] += e.amount || 0
    }
  })
  // Faqat noldan farqli valyutalarni qaytarish
  return Object.entries(byCur)
    .filter(([, v]) => Math.abs(v) > 0.001)
    .map(([cur, val]) => ({ cur, val }))
}

// Sections
export const getSections = (uid) => getData('hamkorlar_sections', uid)
export const saveSections = (uid, sections) => save('hamkorlar_sections', uid, sections)

// Partners
export const getPartners = (uid) => getData('hamkorlar', uid)
export const savePartners = (uid, partners) => save('hamkorlar', uid, partners)

// Archive
export const getArchive = (uid) => {
  const all = getData(ARCHIVE_KEY, uid)
  const cutoff = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000
  const fresh = all.filter(a => new Date(a.deletedAt).getTime() > cutoff)
  if (fresh.length !== all.length) save(ARCHIVE_KEY, uid, fresh)
  return fresh
}

export const archiveEntry = (uid, hamkorId, hamkorName, sectionId, entry) => {
  const archive = getArchive(uid)
  save(ARCHIVE_KEY, uid, [
    { ...entry, hamkorId, hamkorName, sectionId, deletedAt: new Date().toISOString() },
    ...archive,
  ])
}

export const restoreEntry = (uid, archiveEntryId) => {
  const archive = getArchive(uid)
  const entry = archive.find(a => a.id === archiveEntryId)
  if (!entry) return
  save(ARCHIVE_KEY, uid, archive.filter(a => a.id !== archiveEntryId))
  const { hamkorId, hamkorName, sectionId, deletedAt, ...original } = entry
  const all = getPartners(uid)
  savePartners(uid, all.map(h =>
    h.id === hamkorId ? { ...h, entries: [...(h.entries || []), original] } : h
  ))
}

export const deleteFromArchive = (uid, archiveEntryId) => {
  const archive = getArchive(uid)
  save(ARCHIVE_KEY, uid, archive.filter(a => a.id !== archiveEntryId))
}
