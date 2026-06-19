import { getData, saveData } from './storage'
import { syncToCloud, loadFromCloud, subscribeToCloud } from './sync'

const ARCHIVE_KEY = 'hamkorlar_archive'
const ARCHIVE_DAYS = 30

// localStorage + Firestore ga birga saqlash
const save = (key, uid, data) => {
  saveData(key, uid, data)
  syncToCloud(uid, key, data)
}

// Firestore dan yuklash va localStorage ni yangilash
export const loadHamkorlarFromCloud = async (uid) => {
  const [sections, partners, archive] = await Promise.all([
    loadFromCloud(uid, 'hamkorlar_sections'),
    loadFromCloud(uid, 'hamkorlar'),
    loadFromCloud(uid, ARCHIVE_KEY),
  ])
  if (sections) saveData('hamkorlar_sections', uid, sections)
  if (partners) saveData('hamkorlar', uid, partners)
  if (archive) saveData(ARCHIVE_KEY, uid, archive)
  return { sections, partners, archive }
}

// Real-vaqt tinglash
export const subscribeHamkorlar = (uid, onSections, onPartners) => {
  const unsubSec = subscribeToCloud(uid, 'hamkorlar_sections', (data) => {
    saveData('hamkorlar_sections', uid, data)
    onSections?.(data)
  })
  const unsubPar = subscribeToCloud(uid, 'hamkorlar', (data) => {
    saveData('hamkorlar', uid, data)
    onPartners?.(data)
  })
  return () => { unsubSec(); unsubPar() }
}

export const calcDebt = (entries = []) =>
  entries.reduce((sum, e) => {
    if (e.entryType === 'tolov') return sum - e.amount
    if (e.entryType === 'xomashyo') return sum + e.totalPrice
    if (e.entryType === 'xizmat') return sum + e.amount
    return sum
  }, 0)

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
