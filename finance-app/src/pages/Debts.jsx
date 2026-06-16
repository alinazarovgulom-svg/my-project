import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, AlertTriangle, Pencil } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { generateId } from '../store/storage'
import { format, differenceInDays, isToday, isTomorrow, isPast, parseISO } from 'date-fns'

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))
const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']

const defaultForm = {
  direction: 'borrowed', person: '', amount: '', currency: 'UZS',
  note: '', date: new Date().toISOString().split('T')[0], dueDate: ''
}

function getDueDateWarning(debt) {
  if (debt.remaining <= 0 || !debt.dueDate) return null
  const due = parseISO(debt.dueDate)
  if (isPast(due) && !isToday(due)) return { level: 'red', msg: `🔴 ${debt.person} ga qarz muddati o'tib ketdi!` }
  if (isToday(due)) return { level: 'orange', msg: `⚠ ${debt.person} ga qarz bugun qaytarilishi kerak!` }
  if (isTomorrow(due)) return { level: 'orange', msg: `⚠ ${debt.person} ga qarz ertaga qaytarilishi kerak! (1 kun qoldi)` }
  return null
}

export default function Debts() {
  const { debts, saveDebts } = useApp()
  const [modal, setModal] = useState(false)
  const [payModal, setPayModal] = useState(null)
  const [editModal, setEditModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [payAmount, setPayAmount] = useState('')
  const [expanded, setExpanded] = useState({})
  const [filter, setFilter] = useState('all')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = () => {
    if (!form.person || !form.amount) return
    const amount = parseFloat(form.amount)
    const debt = { id: generateId(), ...form, amount, remaining: amount, payments: [] }
    saveDebts([...debts, debt])
    setModal(false)
    setForm(defaultForm)
  }

  const handlePay = () => {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    const updated = debts.map(d => {
      if (d.id !== payModal.id) return d
      const paid = Math.min(amount, d.remaining)
      const payments = [...d.payments, { id: generateId(), amount: paid, date: new Date().toISOString().split('T')[0] }]
      return { ...d, remaining: d.remaining - paid, payments }
    })
    saveDebts(updated)
    setPayModal(null)
    setPayAmount('')
  }

  const handleDelete = (id) => {
    if (confirm('O\'chirishni tasdiqlaysizmi?'))
      saveDebts(debts.filter(d => d.id !== id))
  }

  const openEdit = (debt) => {
    setEditingDebt({ ...debt, amount: String(debt.amount) })
    setEditModal(true)
  }

  const handleEditSave = () => {
    if (!editingDebt?.person || !editingDebt?.amount) return
    const updated = debts.map(d => {
      if (d.id !== editingDebt.id) return d
      const newAmount = parseFloat(editingDebt.amount)
      const alreadyPaid = d.amount - d.remaining
      const newRemaining = Math.max(0, newAmount - alreadyPaid)
      return { ...editingDebt, amount: newAmount, remaining: newRemaining }
    })
    saveDebts(updated)
    setEditModal(false)
    setEditingDebt(null)
  }

  const filtered = debts
    .filter(d => filter === 'all' || d.direction === filter || (filter === 'active' && d.remaining > 0) || (filter === 'done' && d.remaining <= 0))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const borrowed = debts.filter(d => d.direction === 'borrowed' && d.remaining > 0)
  const lent = debts.filter(d => d.direction === 'lent' && d.remaining > 0)

  // Collect all warnings
  const warnings = debts.filter(d => d.remaining > 0).map(d => getDueDateWarning(d)).filter(Boolean)

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-white mb-3">Qarzlar</h1>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {warnings.map((w, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${w.level === 'red' ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'}`}>
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{w.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-red-500/10 rounded-xl p-3">
            <p className="text-red-400 text-xs">Men qarzman</p>
            <p className="text-white font-bold text-sm">{borrowed.length} ta</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3">
            <p className="text-green-400 text-xs">Menga qarz</p>
            <p className="text-white font-bold text-sm">{lent.length} ta</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[['all', 'Barchasi'], ['active', 'Faol'], ['borrowed', 'Qarz oldim'], ['lent', 'Qarz berdim'], ['done', 'Tugatilgan']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === v ? 'bg-blue-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-gray-500">Qarzlar yo'q</p>
          </div>
        ) : (
          filtered.map(d => {
            const isOpen = expanded[d.id]
            const progress = d.amount > 0 ? ((d.amount - d.remaining) / d.amount) * 100 : 100
            const isDone = d.remaining <= 0
            const warn = getDueDateWarning(d)
            const cur = d.currency || 'UZS'
            return (
              <div key={d.id} className={`card ${warn?.level === 'red' ? 'border border-red-500/30' : warn?.level === 'orange' ? 'border border-orange-500/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${d.direction === 'borrowed' ? 'bg-red-500/15' : 'bg-green-500/15'}`}>
                    <span className="text-lg">{d.direction === 'borrowed' ? '⬇️' : '⬆️'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium truncate">{d.person}</p>
                      <div className="flex items-center gap-1">
                        {isDone ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg">✓ Tugatildi</span>
                        ) : (
                          <button onClick={() => { setPayModal(d); setPayAmount('') }} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg">
                            To'lash
                          </button>
                        )}
                        <button onClick={() => openEdit(d)} className="p-1 text-gray-600 active:text-blue-400">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1 text-gray-600 active:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">{d.note || format(new Date(d.date), 'dd.MM.yyyy')}</p>
                    {d.dueDate && (
                      <p className={`text-xs mt-0.5 ${warn ? (warn.level === 'red' ? 'text-red-400' : 'text-orange-400') : 'text-gray-500'}`}>
                        📅 Qaytarish: {format(parseISO(d.dueDate), 'dd.MM.yyyy')}
                      </p>
                    )}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Qoldi: <span className={isDone ? 'text-green-400' : 'text-white'}>{fmt(d.remaining)} {cur}</span></span>
                        <span className="text-gray-500">Jami: {fmt(d.amount)} {cur}</span>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    {d.payments.length > 0 && (
                      <button onClick={() => setExpanded(e => ({ ...e, [d.id]: !isOpen }))} className="flex items-center gap-1 text-xs text-blue-400 mt-2">
                        To'lovlar ({d.payments.length})
                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                    {isOpen && (
                      <div className="mt-2 flex flex-col gap-1">
                        {d.payments.map(p => (
                          <div key={p.id} className="flex justify-between text-xs bg-dark-600 rounded-lg px-2 py-1">
                            <span className="text-gray-400">{format(new Date(p.date), 'dd.MM.yyyy')}</span>
                            <span className="text-green-400">+{fmt(p.amount)} {cur}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      <button onClick={() => { setForm(defaultForm); setModal(true) }}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:opacity-80">
        <Plus size={24} />
      </button>

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Qarz qo'shish">
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex gap-2">
            <button onClick={() => set('direction', 'borrowed')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${form.direction === 'borrowed' ? 'bg-red-500 text-white' : 'bg-dark-600 text-gray-400'}`}>
              Qarz oldim
            </button>
            <button onClick={() => set('direction', 'lent')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${form.direction === 'lent' ? 'bg-green-500 text-white' : 'bg-dark-600 text-gray-400'}`}>
              Qarz berdim
            </button>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Shaxs ismi</label>
            <input className="input-field" placeholder="Kim bilan..." value={form.person} onChange={e => set('person', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Summa</label>
              <input className="input-field" type="number" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div className="w-28">
              <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
              <select className="input-field" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Izoh</label>
            <input className="input-field" placeholder="Izoh..." value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Sana</label>
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Qaytarish sanasi (ixtiyoriy)</label>
            <input className="input-field" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </div>
          <button onClick={handleAdd} className="btn-primary mt-2">Saqlash</button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setEditingDebt(null) }} title="Qarzni tahrirlash">
        {editingDebt && (
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex gap-2">
              <button onClick={() => setEditingDebt(d => ({ ...d, direction: 'borrowed' }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editingDebt.direction === 'borrowed' ? 'bg-red-500 text-white' : 'bg-dark-600 text-gray-400'}`}>Qarz oldim</button>
              <button onClick={() => setEditingDebt(d => ({ ...d, direction: 'lent' }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editingDebt.direction === 'lent' ? 'bg-green-500 text-white' : 'bg-dark-600 text-gray-400'}`}>Qarz berdim</button>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Shaxs ismi</label>
              <input className="input-field" placeholder="Kim bilan..." value={editingDebt.person} onChange={e => setEditingDebt(d => ({ ...d, person: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">Summa</label>
                <input className="input-field" type="number" placeholder="0" value={editingDebt.amount} onChange={e => setEditingDebt(d => ({ ...d, amount: e.target.value }))} />
              </div>
              <div className="w-28">
                <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
                <select className="input-field" value={editingDebt.currency || 'UZS'} onChange={e => setEditingDebt(d => ({ ...d, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Izoh</label>
              <input className="input-field" placeholder="Izoh..." value={editingDebt.note || ''} onChange={e => setEditingDebt(d => ({ ...d, note: e.target.value }))} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sana</label>
              <input className="input-field" type="date" value={editingDebt.date} onChange={e => setEditingDebt(d => ({ ...d, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Qaytarish sanasi</label>
              <input className="input-field" type="date" value={editingDebt.dueDate || ''} onChange={e => setEditingDebt(d => ({ ...d, dueDate: e.target.value }))} />
            </div>
            <button onClick={handleEditSave} className="btn-primary mt-2">Saqlash</button>
          </div>
        )}
      </Modal>

      {/* Pay Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="To'lov qilish">
        {payModal && (
          <div className="flex flex-col gap-3">
            <div className="bg-dark-600 rounded-xl p-3">
              <p className="text-gray-400 text-sm">{payModal.person}</p>
              <p className="text-white font-bold">{fmt(payModal.remaining)} {payModal.currency || 'UZS'} qoldi</p>
            </div>
            <button onClick={() => setPayAmount(String(payModal.remaining))} className="text-blue-400 text-sm text-left">
              To'liq to'lash ({fmt(payModal.remaining)} {payModal.currency || 'UZS'})
            </button>
            <input className="input-field" type="number" placeholder="To'lov summasi" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            <button onClick={handlePay} className="btn-primary">To'lash</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
