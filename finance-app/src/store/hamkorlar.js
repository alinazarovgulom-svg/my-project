import { getData, saveData } from './storage'

const ARCHIVE_KEY = 'hamkorlar_archive'
const ARCHIVE_DAYS = 30

export const calcDebt = (entries = []) =>
  entries.reduce((sum, e) => {
    if (e.entryType === 'tolov') return sum - e.amount
    if (e.entryType === 'xomashyo') return sum + e.totalPrice
    if (e.entryType === 'xizmat') return sum + e.amount
    return sum
  }, 0)

// Archive helpers
export const getArchive = (uid) => {
  const all = getData(ARCHIVE_KEY, uid)
  const cutoff = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000
  // Auto-clean entries older than 30 days
  const fresh = all.filter(a => new Date(a.deletedAt).getTime() > cutoff)
  if (fresh.length !== all.length) saveData(ARCHIVE_KEY, uid, fresh)
  return fresh
}

export const archiveEntry = (uid, hamkorId, hamkorName, sectionId, entry) => {
  const archive = getArchive(uid)
  saveData(ARCHIVE_KEY, uid, [
    { ...entry, hamkorId, hamkorName, sectionId, deletedAt: new Date().toISOString() },
    ...archive,
  ])
}

export const restoreEntry = (uid, archiveEntryId) => {
  const archive = getArchive(uid)
  const entry = archive.find(a => a.id === archiveEntryId)
  if (!entry) return
  // Remove from archive
  saveData(ARCHIVE_KEY, uid, archive.filter(a => a.id !== archiveEntryId))
  // Add back to hamkor
  const { hamkorId, hamkorName, sectionId, deletedAt, ...original } = entry
  const all = getData('hamkorlar', uid)
  const updated = all.map(h =>
    h.id === hamkorId ? { ...h, entries: [...(h.entries || []), original] } : h
  )
  saveData('hamkorlar', uid, updated)
}

export const deleteFromArchive = (uid, archiveEntryId) => {
  const archive = getArchive(uid)
  saveData(ARCHIVE_KEY, uid, archive.filter(a => a.id !== archiveEntryId))
}
