import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Printer } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { getHamkorlar, saveHamkorlar, addHamkorEntry, getPartnerDebt } from '../store/hamkorlarStorage'
import { generateId } from '../store/storage'
import { fmtCur } from '../utils/format'
import { format } from 'date-fns'

const fmt = (n, cur) => fmtCur(n, cur || 'UZS')
const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const UNITS = ['kg', 'dona', 'litr', 'm']
const today = () => new Date().toISOString().split('T')[0]

const defaultXomashyo = { name: '', qty: '', unit: 'kg', price: '', note: '', date: today(), currency: 'UZS' }
const defaultXizmat = { amount: '', note: '', date: today(), currency: 'UZS' }
const defaultTolov = { amount: '', note: '', date: today(), currency: 'UZS', category: 'Hamkor to\'lovi' }

export default function HamkorlarDetail() {
  const navigate = useNavigate()
  const { type, id } = useParams()
  const { user, transactions, saveTransactions } = useApp()

  const partnerType = type === 'yetkazib-beruvchilar' ? 'yetkazib-beruvchi' : 'ishlab-chiqaruvchi'
  const isSupplier = partnerType === 'yetkazib-beruvchi'

  const [partner, setPartner] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [xomashyoForm, setXomashyoForm] = useState(defaultXomashyo)
  const [xizmatForm, setXizmatForm] = useState(defaultXizmat)
  const [tolovForm, setTolovForm] = useState(defaultTolov)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadPartner = () => {
    if (!user?.id) return
    const all = getHamkorlar(user.id)
    const found = all.find(p => p.id === id)
    setPartner(found || null)
  }

  useEffect(() => {
    loadPartner()
  }, [user?.id, id])

  const setX = (k, v) => setXomashyoForm(f => ({ ...f, [k]: v }))
  const setZ = (k, v) => setXizmatForm(f => ({ ...f, [k]: v }))
  const setT = (k, v) => setTolovForm(f => ({ ...f, [k]: v }))

  const handleAddXomashyo = () => {
    const qty = parseFloat(xomashyoForm.qty)
    const price = parseFloat(xomashyoForm.price)
    if (!xomashyoForm.name || !qty || !price) return
    const totalPrice = qty * price
    const entry = { type: 'xomashyo', ...xomashyoForm, qty, price, totalPrice }
    addHamkorEntry(user.id, id, entry)
    setXomashyoForm(defaultXomashyo)
    setAddModal(false)
    loadPartner()
  }

  const handleAddXizmat = () => {
    const amount = parseFloat(xizmatForm.amount)
    if (!amount) return
    const entry = { type: 'xizmat', ...xizmatForm, amount }
    addHamkorEntry(user.id, id, entry)
    setXizmatForm(defaultXizmat)
    setAddModal(false)
    loadPartner()
  }

  const handleTolov = () => {
    const amount = parseFloat(tolovForm.amount)
    if (!amount) return
    const entry = { type: 'tolov', ...tolovForm, amount }
    addHamkorEntry(user.id, id, entry)

    // Record in main transactions as expense
    const tx = {
      id: generateId(),
      type: 'expense',
      amount,
      currency: tolovForm.currency,
      category: tolovForm.category || 'Hamkor to\'lovi',
      emoji: '💸',
      note: `To'lov: ${partner?.name}${tolovForm.note ? ' · ' + tolovForm.note : ''}`,
      date: tolovForm.date,
      userId: user?.id,
      userName: user?.name,
    }
    saveTransactions([...transactions, tx])

    setTolovForm(defaultTolov)
    setPayModal(false)
    loadPartner()
  }

  if (!partner) {
    return (
      <div className="flex flex-col min-h-dvh pb-24">
        <div className="page-animate px-4 pt-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-700 text-gray-400">
            <ArrowLeft size={18} />
          </button>
          <p className="text-gray-500 mt-8 text-center">Hamkor topilmadi</p>
        </div>
      </div>
    )
  }

  const entries = partner.entries || []
  const debt = getPartnerDebt(partner)

  const filtered = entries
    .filter(e => {
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      return true
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const handlePrint = () => window.print()

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-700 text-gray-400 active:opacity-70">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{partner.name}</h1>
              {partner.phone && <p className="text-gray-500 text-xs">{partner.phone}</p>}
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-xl ${debt > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {debt > 0 ? `${fmt(debt, 'UZS')} UZS` : '✓ Qarz yo\'q'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setAddModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 active:opacity-80"
            >
              <Plus size={16} />
              Qo'shish
            </button>
            <button
              onClick={() => setPayModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium flex items-center justify-center gap-2 active:opacity-80"
            >
              💳 To'lov
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-dark-700 text-gray-400 active:opacity-70"
            >
              <Printer size={16} />
            </button>
          </div>

          {/* Date filter */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                className="input-field text-xs"
                type="date"
                placeholder="Dan"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <input
                className="input-field text-xs"
                type="date"
                placeholder="Gacha"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="px-3 rounded-xl bg-dark-700 text-gray-400 text-xs active:opacity-70"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Entries */}
        <div className="px-4 flex flex-col gap-2 mt-1">
          {filtered.length === 0 ? (
            <div className="card text-center py-10 mt-4">
              <p className="text-gray-500">Yozuvlar yo'q</p>
            </div>
          ) : (
            filtered.map(e => (
              <EntryCard key={e.id} entry={e} />
            ))
          )}
        </div>
      </div>

      {/* Add entry modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={isSupplier ? 'Xomashyo qo\'shish' : 'Xizmat qo\'shish'}>
        {isSupplier ? (
          <div className="flex flex-col gap-3 pb-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Xomashyo nomi *</label>
              <input className="input-field" placeholder="Nomi..." value={xomashyoForm.name} onChange={e => setX('name', e.target.value)} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">Miqdor *</label>
                <input className="input-field" type="number" placeholder="0" value={xomashyoForm.qty} onChange={e => setX('qty', e.target.value)} />
              </div>
              <div className="w-24">
                <label className="text-gray-400 text-xs mb-1 block">Birlik</label>
                <select className="input-field" value={xomashyoForm.unit} onChange={e => setX('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">Narx *</label>
                <input className="input-field" type="number" placeholder="0" value={xomashyoForm.price} onChange={e => setX('price', e.target.value)} />
              </div>
              <div className="w-24">
                <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
                <select className="input-field" value={xomashyoForm.currency} onChange={e => setX('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {xomashyoForm.qty && xomashyoForm.price && (
              <div className="bg-dark-700 rounded-xl px-3 py-2 text-sm text-white">
                Jami: {fmt(parseFloat(xomashyoForm.qty) * parseFloat(xomashyoForm.price), xomashyoForm.currency)} {xomashyoForm.currency}
              </div>
            )}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Izoh</label>
              <input className="input-field" placeholder="Izoh..." value={xomashyoForm.note} onChange={e => setX('note', e.target.value)} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sana</label>
              <input className="input-field" type="date" value={xomashyoForm.date} onChange={e => setX('date', e.target.value)} />
            </div>
            <button onClick={handleAddXomashyo} className="btn-primary mt-2">Saqlash</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">Xizmat haqi *</label>
                <input className="input-field" type="number" placeholder="0" value={xizmatForm.amount} onChange={e => setZ('amount', e.target.value)} />
              </div>
              <div className="w-24">
                <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
                <select className="input-field" value={xizmatForm.currency} onChange={e => setZ('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Izoh</label>
              <input className="input-field" placeholder="Izoh..." value={xizmatForm.note} onChange={e => setZ('note', e.target.value)} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sana</label>
              <input className="input-field" type="date" value={xizmatForm.date} onChange={e => setZ('date', e.target.value)} />
            </div>
            <button onClick={handleAddXizmat} className="btn-primary mt-2">Saqlash</button>
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="To'lov qilish">
        <div className="flex flex-col gap-3 pb-4">
          {debt > 0 && (
            <div className="bg-red-500/10 rounded-xl px-3 py-2 text-sm">
              <span className="text-gray-400">Qolgan qarz: </span>
              <span className="text-red-400 font-semibold">{fmt(debt, 'UZS')} UZS</span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Summa *</label>
              <input className="input-field" type="number" placeholder="0" value={tolovForm.amount} onChange={e => setT('amount', e.target.value)} />
            </div>
            <div className="w-24">
              <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
              <select className="input-field" value={tolovForm.currency} onChange={e => setT('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Kategoriya</label>
            <input className="input-field" placeholder="Hamkor to'lovi" value={tolovForm.category} onChange={e => setT('category', e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Izoh</label>
            <input className="input-field" placeholder="Izoh..." value={tolovForm.note} onChange={e => setT('note', e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Sana</label>
            <input className="input-field" type="date" value={tolovForm.date} onChange={e => setT('date', e.target.value)} />
          </div>
          <button onClick={handleTolov} className="btn-primary mt-2">To'lov qilish</button>
        </div>
      </Modal>
    </div>
  )
}

function EntryCard({ entry }) {
  const fmt = (n, cur) => fmtCur(n, cur || 'UZS')

  if (entry.type === 'xomashyo') {
    return (
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg">Xomashyo</span>
              <span className="text-gray-500 text-xs">{format(new Date(entry.date), 'dd.MM.yyyy')}</span>
            </div>
            <p className="text-white font-medium text-sm">
              {entry.name} {entry.qty} {entry.unit} × {fmt(entry.price, entry.currency)} = {fmt(entry.totalPrice, entry.currency)} {entry.currency}
            </p>
            {entry.note && <p className="text-gray-400 text-xs mt-0.5">{entry.note}</p>}
          </div>
          <span className="text-red-400 font-semibold text-sm whitespace-nowrap">
            -{fmt(entry.totalPrice, entry.currency)}
          </span>
        </div>
      </div>
    )
  }

  if (entry.type === 'xizmat') {
    return (
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-lg">Xizmat</span>
              <span className="text-gray-500 text-xs">{format(new Date(entry.date), 'dd.MM.yyyy')}</span>
            </div>
            {entry.note && <p className="text-white text-sm">{entry.note}</p>}
          </div>
          <span className="text-red-400 font-semibold text-sm whitespace-nowrap">
            -{fmt(entry.amount, entry.currency)} {entry.currency}
          </span>
        </div>
      </div>
    )
  }

  if (entry.type === 'tolov') {
    return (
      <div className="card border border-green-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg">To'lov</span>
              <span className="text-gray-500 text-xs">{format(new Date(entry.date), 'dd.MM.yyyy')}</span>
            </div>
            {entry.note && <p className="text-gray-400 text-xs">{entry.note}</p>}
          </div>
          <span className="text-green-400 font-semibold text-sm whitespace-nowrap">
            +{fmt(entry.amount, entry.currency)} {entry.currency}
          </span>
        </div>
      </div>
    )
  }

  return null
}
