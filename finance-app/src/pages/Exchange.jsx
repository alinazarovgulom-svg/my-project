import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeftRight, Pencil, Archive, RotateCcw, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { generateId, getData, saveData } from '../store/storage'
import { syncToCloud, loadFromCloud, subscribeToCloud } from '../store/sync'
import { fmtCur } from '../utils/format'

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }
const fmt = (n, c) => fmtCur(n, c)
const ARCHIVE_DAYS = 30

const getArchive = (uid) => {
  const all = getData('exchange_archive', uid)
  const cutoff = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000
  return all.filter(a => new Date(a.deletedAt).getTime() > cutoff)
}

const saveArchive = (uid, data) => {
  saveData('exchange_archive', uid, data)
  syncToCloud(uid, 'exchange_archive', data)
}

export default function Exchange() {
  const { settings, user, transactions, saveTransactions, family, familyTransactions, userRole } = useApp()
  const uid = user?.id
  const rates = settings?.rates || { USD: 12700, EUR: 13800, RUB: 140 }
  const isAdmin = !family || userRole === 'admin'

  const emptyForm = { from: 'USD', to: 'UZS', fromAmount: '', rate: '', note: '', date: new Date().toISOString().split('T')[0] }
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingPairId, setEditingPairId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showArchive, setShowArchive] = useState(false)
  const [archive, setArchive] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!uid) return
    // Avval localStorage dan yuklash
    setArchive(getArchive(uid))
    // Keyin Firebase dan yangilash
    loadFromCloud(uid, 'exchange_archive').then(cloud => {
      if (cloud) {
        saveData('exchange_archive', uid, cloud)
        setArchive(getArchive(uid))
      }
    })
    // Real-vaqt tinglash — boshqa qurilmadan o'zgarsa darhol yangilanadi
    const unsub = subscribeToCloud(uid, 'exchange_archive', (data) => {
      if (data) {
        saveData('exchange_archive', uid, data)
        const cutoff = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000
        setArchive(data.filter(a => new Date(a.deletedAt).getTime() > cutoff))
      }
    })
    return () => unsub()
  }, [uid])

  const refreshArchive = () => setArchive(getArchive(uid))

  const toAmount = (f = form) => {
    const n = parseFloat(f.fromAmount)
    const r = parseFloat(f.rate)
    if (!n || !r) return null
    if (f.from === 'UZS') return n / r
    if (f.to === 'UZS') return n * r
    const inUZS = n * (rates[f.from] || 1)
    return inUZS / (rates[f.to] || 1)
  }

  const computedTo = toAmount()

  const handleSave = async () => {
    const n = parseFloat(form.fromAmount)
    if (!n || n <= 0) return
    const toAmt = toAmount()
    if (!toAmt || toAmt <= 0) return

    if (editingPairId) {
      // Edit existing pair
      const updated = transactions.map(t => {
        if (t.pairId !== editingPairId) return t
        if (t.type === 'expense') return { ...t, amount: n, currency: form.from, date: form.date, note: form.note || t.note }
        if (t.type === 'income') return { ...t, amount: toAmt, currency: form.to, date: form.date, note: form.note || t.note }
        return t
      })
      saveTransactions(updated)
      setEditingPairId(null)
    } else {
      // Add new pair
      const pairId = generateId()
      const txOut = {
        id: generateId(), type: 'expense', amount: n, currency: form.from,
        category: 'Valyuta ayirboshlash',
        note: form.note || `${fmt(n, form.from)} ${form.from} → ${fmt(toAmt, form.to)} ${form.to}`,
        date: form.date, pairId, emoji: '💱'
      }
      const txIn = {
        id: generateId(), type: 'income', amount: toAmt, currency: form.to,
        category: 'Valyuta ayirboshlash',
        note: form.note || `${fmt(n, form.from)} ${form.from} → ${fmt(toAmt, form.to)} ${form.to}`,
        date: form.date, pairId, emoji: '💱'
      }
      if (family) {
        const { addFamilyTransaction } = await import('../store/family')
        await addFamilyTransaction(family.id, txOut)
        await addFamilyTransaction(family.id, txIn)
      } else {
        saveTransactions([...transactions, txOut, txIn])
      }
    }

    setModal(false)
    setForm(emptyForm)
  }

  const startEdit = (tx, pair) => {
    const rate = tx.currency === 'UZS'
      ? (pair ? tx.amount / pair.amount : '')
      : (pair ? pair.amount / tx.amount : '')
    setEditingPairId(tx.pairId)
    setForm({
      from: tx.currency || 'UZS',
      to: pair?.currency || 'UZS',
      fromAmount: String(tx.amount),
      rate: String(parseFloat(rate.toFixed(2))),
      note: tx.note || '',
      date: tx.date?.slice(0, 10) || new Date().toISOString().split('T')[0]
    })
    setModal(true)
  }

  const handleDelete = () => {
    if (!deleteConfirm) return
    const { tx, pair } = deleteConfirm
    const archiveEntry = {
      id: generateId(),
      pairId: tx.pairId,
      outTx: tx,
      inTx: pair,
      deletedAt: new Date().toISOString()
    }
    const current = getArchive(uid)
    saveArchive(uid, [archiveEntry, ...current])
    saveTransactions(transactions.filter(t => t.pairId !== tx.pairId))
    setDeleteConfirm(null)
    refreshArchive()
  }

  const handleRestore = (entry) => {
    const restored = [entry.outTx, entry.inTx].filter(Boolean)
    saveTransactions([...transactions, ...restored])
    const updated = getArchive(uid).filter(a => a.id !== entry.id)
    saveArchive(uid, updated)
    refreshArchive()
  }

  const handleDeletePermanent = (entry) => {
    if (!confirm('Arxivdan ham o\'chirilsinmi? Bu amalni ortga qaytarib bo\'lmaydi.')) return
    const updated = getArchive(uid).filter(a => a.id !== entry.id)
    saveArchive(uid, updated)
    refreshArchive()
  }

  const allTx = family ? familyTransactions : transactions
  const exchangeTx = allTx
    .filter(t => t.category === 'Valyuta ayirboshlash' && t.type === 'expense')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const openModal = () => {
    setEditingPairId(null)
    setForm({ ...emptyForm, rate: String(rates['USD'] || '') })
    setModal(true)
  }

  const daysLeft = (deletedAt) => {
    const diff = ARCHIVE_DAYS - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  return (
    <div className="flex flex-col pb-24 min-h-dvh">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Valyuta ayirboshlash</h1>
        {archive.length > 0 && (
          <button onClick={() => setShowArchive(v => !v)} className="flex items-center gap-1.5 text-xs text-gray-400 active:text-white">
            <Archive size={14} />
            Arxiv ({archive.length})
          </button>
        )}
      </div>

      {/* Archive section */}
      {showArchive && (
        <div className="px-4 mb-4">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 bg-orange-500/10 border-b border-white/5 flex items-center gap-2">
              <Archive size={14} className="text-orange-400" />
              <span className="text-orange-400 text-sm font-medium">Arxiv ({ARCHIVE_DAYS} kun)</span>
            </div>
            {archive.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">Arxiv bo'sh</p>
            ) : (
              archive.map((entry, i) => (
                <div key={entry.id}>
                  {i > 0 && <div className="h-px bg-white/5 mx-4" />}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-sm">{fmt(entry.outTx?.amount, entry.outTx?.currency)} {entry.outTx?.currency}</span>
                        <ArrowRight size={10} className="text-gray-600" />
                        <span className="text-blue-400/70 text-sm">{fmt(entry.inTx?.amount, entry.inTx?.currency)} {entry.inTx?.currency}</span>
                      </div>
                      <p className="text-gray-600 text-xs">{entry.outTx?.date?.slice(0, 10)} · {daysLeft(entry.deletedAt)} kun qoldi</p>
                    </div>
                    <button onClick={() => handleRestore(entry)} className="p-1.5 rounded-lg bg-green-500/15 text-green-400 active:opacity-70">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => handleDeletePermanent(entry)} className="p-1.5 rounded-lg bg-red-500/15 text-red-400 active:opacity-70">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Exchange list */}
      <div className="flex-1 px-4 flex flex-col gap-2">
        {exchangeTx.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-4xl mb-2">💱</p>
            <p className="text-gray-500 text-sm">Ayirboshlashlar yo'q</p>
            <p className="text-gray-600 text-xs mt-1">+ tugmasini bosib qo'shing</p>
          </div>
        ) : (
          exchangeTx.map(tx => {
            const pair = allTx.find(t => t.pairId === tx.pairId && t.type === 'income')
            return (
              <div key={tx.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-lg flex-shrink-0">
                  💱
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-semibold">{fmt(tx.amount, tx.currency)} {tx.currency}</span>
                    <ArrowRight size={12} className="text-gray-500 flex-shrink-0" />
                    {pair && <span className="text-blue-400 text-sm font-semibold">{fmt(pair.amount, pair.currency)} {pair.currency}</span>}
                  </div>
                  {tx.note && <p className="text-gray-500 text-xs truncate">{tx.note}</p>}
                  <p className="text-gray-600 text-xs">{format(new Date(tx.date), 'dd.MM.yyyy')}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(tx, pair)} className="p-1.5 rounded-lg text-gray-500 active:text-blue-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm({ tx, pair })} className="p-1.5 rounded-lg text-gray-500 active:text-red-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* FAB — only admin can add */}
      {isAdmin && (
        <button
          onClick={openModal}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg active:opacity-80"
        >
          <Plus size={24} className="text-white" />
        </button>
      )}

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditingPairId(null); setForm(emptyForm) }}
        title={editingPairId ? 'Tahrirlash' : 'Valyuta ayirboshlash'}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Dan</label>
              <select className="input-field" value={form.from} onChange={e => { set('from', e.target.value); set('rate', '') }} disabled={!!editingPairId}>
                {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
              </select>
            </div>
            {!editingPairId && (
              <button onClick={() => setForm(f => ({ ...f, from: f.to, to: f.from, rate: '' }))}
                className="mt-5 w-10 h-10 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <ArrowLeftRight size={18} />
              </button>
            )}
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Ga</label>
              <select className="input-field" value={form.to} onChange={e => { set('to', e.target.value); set('rate', '') }} disabled={!!editingPairId}>
                {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Summa ({form.from})</label>
            <input className="input-field" type="number" placeholder="0" value={form.fromAmount} onChange={e => set('fromAmount', e.target.value)} />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">
              Kurs {form.from !== 'UZS' && form.to !== 'UZS' ? `(1 ${form.from} = ? ${form.to})` : form.from === 'UZS' ? `(1 ${form.to} = ? UZS)` : `(1 ${form.from} = ? UZS)`}
            </label>
            <input className="input-field" type="number" placeholder="Kursni kiriting..." value={form.rate} onChange={e => set('rate', e.target.value)} />
          </div>

          {computedTo !== null && form.fromAmount && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-sm">{form.fromAmount} {form.from} =</p>
              <p className="text-blue-400 text-2xl font-bold">{fmt(computedTo, form.to)} <span className="text-base">{form.to}</span></p>
            </div>
          )}

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
            <input className="input-field" placeholder="Izoh..." value={form.note} onChange={e => set('note', e.target.value)} />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Sana</label>
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <button onClick={handleSave} disabled={!form.fromAmount || !form.rate} className="btn-primary disabled:opacity-40">
            {editingPairId ? 'Saqlash' : 'Tasdiqlash'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="O'chirishni tasdiqlang">
        {deleteConfirm && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-white font-semibold">
                {fmt(deleteConfirm.tx.amount, deleteConfirm.tx.currency)} {deleteConfirm.tx.currency}
                {' → '}
                {deleteConfirm.pair && `${fmt(deleteConfirm.pair.amount, deleteConfirm.pair.currency)} ${deleteConfirm.pair.currency}`}
              </p>
              <p className="text-gray-500 text-xs mt-1">{deleteConfirm.tx.date?.slice(0, 10)}</p>
            </div>
            <p className="text-gray-400 text-sm text-center">
              Ma'lumot o'chiriladi va <span className="text-orange-400">30 kun arxivda</span> saqlanadi. Kerak bo'lsa tiklab olish mumkin.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 text-white rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.07)' }}>Bekor</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold">O'chirish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
