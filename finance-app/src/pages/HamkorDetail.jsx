import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, CreditCard, Trash2, Package, Wrench, Banknote } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { getData, saveData, generateId } from '../store/storage'
import { calcDebt } from '../store/hamkorlar'
import { fmtCur } from '../utils/format'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const UNITS = ['kg', 'g', 'tonna', 'litr', 'ml', 'dona', 'm', 'm²', 'm³']
const today = () => new Date().toISOString().split('T')[0]

export default function HamkorDetail() {
  const { type, id } = useParams()
  const nav = useNavigate()
  const { user, saveTransactions, transactions } = useApp()
  const uid = user?.id
  const isSupplier = type === 'yetkazib-beruvchilar'

  const [hamkor, setHamkor] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Xomashyo form
  const [xForm, setXForm] = useState({ name: '', qty: '', unit: 'kg', price: '', note: '', date: today(), currency: 'UZS' })
  // Xizmat form
  const [zForm, setZForm] = useState({ amount: '', note: '', date: today(), currency: 'UZS' })
  // Tolov form
  const [tForm, setTForm] = useState({ amount: '', note: '', date: today(), currency: 'UZS' })

  const load = () => {
    const all = getData('hamkorlar', uid)
    const found = all.find(h => h.id === id)
    setHamkor(found || null)
  }

  useEffect(() => { if (uid) load() }, [uid, id])

  const updateEntries = (newEntry) => {
    const all = getData('hamkorlar', uid)
    const updated = all.map(h => h.id === id ? { ...h, entries: [...(h.entries || []), newEntry] } : h)
    saveData('hamkorlar', uid, updated)
    load()
  }

  const handleAddXomashyo = () => {
    if (!xForm.name || !xForm.qty || !xForm.price) return
    const qty = parseFloat(xForm.qty)
    const price = parseFloat(xForm.price)
    const totalPrice = qty * price
    updateEntries({ id: generateId(), entryType: 'xomashyo', ...xForm, qty, price, totalPrice, createdAt: new Date().toISOString() })
    setXForm({ name: '', qty: '', unit: 'kg', price: '', note: '', date: today(), currency: 'UZS' })
    setAddModal(false)
  }

  const handleAddXizmat = () => {
    if (!zForm.amount) return
    updateEntries({ id: generateId(), entryType: 'xizmat', ...zForm, amount: parseFloat(zForm.amount), createdAt: new Date().toISOString() })
    setZForm({ amount: '', note: '', date: today(), currency: 'UZS' })
    setAddModal(false)
  }

  const handleTolov = () => {
    if (!tForm.amount) return
    const amount = parseFloat(tForm.amount)
    // Add to partner entries
    updateEntries({ id: generateId(), entryType: 'tolov', ...tForm, amount, createdAt: new Date().toISOString() })
    // Deduct from main wallet as expense
    const tx = {
      id: generateId(),
      type: 'expense',
      amount,
      currency: tForm.currency,
      category: 'Hamkorlar',
      emoji: '🤝',
      note: `${hamkor?.name} ga to'lov${tForm.note ? ': ' + tForm.note : ''}`,
      date: tForm.date,
      userId: uid,
      userName: user?.name,
    }
    saveTransactions([tx, ...transactions])
    setTForm({ amount: '', note: '', date: today(), currency: 'UZS' })
    setPayModal(false)
  }

  const handleDeleteEntry = (entryId) => {
    const all = getData('hamkorlar', uid)
    const updated = all.map(h => h.id === id ? { ...h, entries: (h.entries || []).filter(e => e.id !== entryId) } : h)
    saveData('hamkorlar', uid, updated)
    load()
  }

  const handleDeleteHamkor = () => {
    const all = getData('hamkorlar', uid)
    saveData('hamkorlar', uid, all.filter(h => h.id !== id))
    nav(`/hamkorlar/${type}`)
  }

  if (!hamkor) return null

  const debt = calcDebt(hamkor.entries || [])
  const sortedEntries = [...(hamkor.entries || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const entryLabel = (e) => {
    if (e.entryType === 'xomashyo') return `${e.name} — ${e.qty} ${e.unit} × ${fmtCur(e.price, e.currency)} = ${fmtCur(e.totalPrice, e.currency)}`
    if (e.entryType === 'xizmat') return `Xizmat haqi${e.note ? ': ' + e.note : ''}`
    if (e.entryType === 'tolov') return `To'lov${e.note ? ': ' + e.note : ''}`
    return ''
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => nav(`/hamkorlar/${type}`)} className="text-gray-400 active:text-white">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-bold text-white flex-1 truncate">{hamkor.name}</h1>
            <button onClick={() => setDeleteConfirm(true)} className="text-gray-500 active:text-red-400 p-1">
              <Trash2 size={18} />
            </button>
          </div>

          {/* Debt badge */}
          <div className={`rounded-2xl p-4 ${debt > 0 ? 'bg-red-500/15 border border-red-500/20' : 'bg-green-500/15 border border-green-500/20'}`}>
            <p className="text-gray-400 text-xs mb-1">Umumiy qarz</p>
            <p className={`text-2xl font-black ${debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {debt > 0 ? fmtCur(debt, 'UZS') : 'Qarz yo\'q'}
            </p>
          </div>
        </div>

        {/* Entries */}
        <div className="px-4 mt-3 flex flex-col gap-2">
          {sortedEntries.length === 0 && (
            <p className="text-center text-gray-500 py-12">Hali ma'lumot kiritilmagan</p>
          )}
          {sortedEntries.map(e => (
            <div key={e.id} className="bg-gray-800 rounded-2xl px-4 py-3 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                e.entryType === 'tolov' ? 'bg-green-500/20' :
                e.entryType === 'xomashyo' ? 'bg-blue-500/20' : 'bg-purple-500/20'
              }`}>
                {e.entryType === 'tolov' ? <Banknote size={16} className="text-green-400" /> :
                 e.entryType === 'xomashyo' ? <Package size={16} className="text-blue-400" /> :
                 <Wrench size={16} className="text-purple-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-snug">{entryLabel(e)}</p>
                <p className="text-gray-500 text-xs mt-0.5">{e.date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${e.entryType === 'tolov' ? 'text-green-400' : 'text-red-400'}`}>
                  {e.entryType === 'tolov' ? '-' : '+'}{fmtCur(
                    e.entryType === 'xomashyo' ? e.totalPrice : e.amount,
                    e.currency
                  )}
                </p>
                <button onClick={() => handleDeleteEntry(e.id)} className="text-gray-600 active:text-red-400 mt-1">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FABs */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2">
        <button
          onClick={() => setPayModal(true)}
          className="w-13 h-13 w-14 h-14 rounded-full bg-green-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="To'lov"
        >
          <CreditCard size={20} className="text-white" />
        </button>
        <button
          onClick={() => setAddModal(true)}
          className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Qo'shish"
        >
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* Add entry modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title={isSupplier ? 'Xomashyo qo\'shish' : 'Xizmat haqi qo\'shish'}>
        {isSupplier ? (
          <div className="flex flex-col gap-3">
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Xomashyo nomi *" value={xForm.name} onChange={e => setXForm(f => ({ ...f, name: e.target.value }))} />
            <div className="flex gap-2">
              <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Miqdor *" type="number" value={xForm.qty} onChange={e => setXForm(f => ({ ...f, qty: e.target.value }))} />
              <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={xForm.unit} onChange={e => setXForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Narx (1 birlik) *" type="number" value={xForm.price} onChange={e => setXForm(f => ({ ...f, price: e.target.value }))} />
              <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={xForm.currency} onChange={e => setXForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {xForm.qty && xForm.price && (
              <p className="text-blue-400 text-sm text-center font-semibold">
                Jami: {fmtCur(parseFloat(xForm.qty || 0) * parseFloat(xForm.price || 0), xForm.currency)}
              </p>
            )}
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Izoh (ixtiyoriy)" value={xForm.note} onChange={e => setXForm(f => ({ ...f, note: e.target.value }))} />
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" type="date" value={xForm.date} onChange={e => setXForm(f => ({ ...f, date: e.target.value }))} />
            <button onClick={handleAddXomashyo} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">Qo'shish</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Xizmat haqi *" type="number" value={zForm.amount} onChange={e => setZForm(f => ({ ...f, amount: e.target.value }))} />
              <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={zForm.currency} onChange={e => setZForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Izoh (ixtiyoriy)" value={zForm.note} onChange={e => setZForm(f => ({ ...f, note: e.target.value }))} />
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" type="date" value={zForm.date} onChange={e => setZForm(f => ({ ...f, date: e.target.value }))} />
            <button onClick={handleAddXizmat} className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold">Qo'shish</button>
          </div>
        )}
      </Modal>

      {/* To'lov modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="To'lov qilish">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Summa *" type="number" value={tForm.amount} onChange={e => setTForm(f => ({ ...f, amount: e.target.value }))} />
            <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={tForm.currency} onChange={e => setTForm(f => ({ ...f, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Izoh (ixtiyoriy)" value={tForm.note} onChange={e => setTForm(f => ({ ...f, note: e.target.value }))} />
          <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" type="date" value={tForm.date} onChange={e => setTForm(f => ({ ...f, date: e.target.value }))} />
          <p className="text-gray-400 text-xs text-center">To'lov summa hisobingizdan chiqim sifatida yoziladi</p>
          <button onClick={handleTolov} className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold">To'lov qilish</button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Hamkorni o'chirish">
        <p className="text-gray-300 mb-4">"{hamkor.name}" ni barcha ma'lumotlari bilan o'chirasizmi?</p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteConfirm(false)} className="flex-1 bg-gray-700 text-white rounded-xl py-3">Bekor</button>
          <button onClick={handleDeleteHamkor} className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold">O'chirish</button>
        </div>
      </Modal>
    </div>
  )
}
