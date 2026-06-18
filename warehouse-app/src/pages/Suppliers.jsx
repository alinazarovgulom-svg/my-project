import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum, fmtDate, today } from '../utils/format'
import { generateId } from '../store/storage'
import { getSuppliers, saveSuppliers, getSupplierTxns, saveSupplierTxns, getBalance } from '../store/suppliers'
import { getProcessing, saveProcessing } from '../store/processing'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { Truck, Plus, Search, ChevronDown, ChevronUp, Phone, Building2, TrendingUp, TrendingDown, Cog } from 'lucide-react'

export default function Suppliers() {
  const { user } = useApp()
  const { t } = useLang()
  const uid = user?.id

  const [suppliers, setSuppliers] = useState(() => getSuppliers(uid))
  const [txns, setTxns] = useState(() => getSupplierTxns(uid))
  const [processing, setProcessing] = useState(() => getProcessing(uid))
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const [supplierModal, setSupplierModal] = useState(false)
  const [txnModal, setTxnModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [activeSupplierId, setActiveSupplierId] = useState(null)

  const [form, setForm] = useState({ name: '', phone: '', company: '', note: '' })
  const [txnForm, setTxnForm] = useState({ type: 'debt', amount: '', note: '', date: today() })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setTxn = k => e => setTxnForm(f => ({ ...f, [k]: e.target.value }))

  const totalDebt = suppliers.reduce((sum, s) => {
    const b = getBalance(txns, s.id)
    return sum + (b > 0 ? b : 0)
  }, 0)

  const filtered = suppliers
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.company?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))
    .sort((a, b) => getBalance(txns, b.id) - getBalance(txns, a.id))

  const openAdd = () => {
    setForm({ name: '', phone: '', company: '', note: '' })
    setEditId(null)
    setSupplierModal(true)
  }

  const openEdit = (s) => {
    setForm({ name: s.name, phone: s.phone || '', company: s.company || '', note: s.note || '' })
    setEditId(s.id)
    setSupplierModal(true)
  }

  const handleSaveSupplier = () => {
    if (!form.name.trim()) return
    if (editId) {
      const updated = suppliers.map(s => s.id === editId ? { ...s, ...form } : s)
      setSuppliers(updated)
      saveSuppliers(uid, updated)
    } else {
      const newS = { id: generateId(), ...form, createdAt: new Date().toISOString(), userId: uid }
      const updated = [...suppliers, newS]
      setSuppliers(updated)
      saveSuppliers(uid, updated)
    }
    setSupplierModal(false)
  }

  const handleDeleteSupplier = (id) => {
    if (!confirm(t('deleteConfirm'))) return
    const updatedS = suppliers.filter(s => s.id !== id)
    setSuppliers(updatedS)
    saveSuppliers(uid, updatedS)
    const updatedT = txns.filter(tx => tx.supplierId !== id)
    setTxns(updatedT)
    saveSupplierTxns(uid, updatedT)
    const updatedP = processing.filter(p => p.supplierId !== id)
    setProcessing(updatedP)
    saveProcessing(uid, updatedP)
    if (expanded === id) setExpanded(null)
  }

  const openTxn = (supplierId, type) => {
    setActiveSupplierId(supplierId)
    setTxnForm({ type, amount: '', note: '', date: today() })
    setTxnModal(true)
  }

  const handleSaveTxn = () => {
    if (!txnForm.amount || !activeSupplierId) return
    const supplier = suppliers.find(s => s.id === activeSupplierId)
    const newTxn = {
      id: generateId(),
      supplierId: activeSupplierId,
      supplierName: supplier?.name || '',
      type: txnForm.type,
      amount: Number(txnForm.amount),
      note: txnForm.note,
      date: txnForm.date || today(),
      userId: uid,
      userName: user?.fullName || user?.username
    }
    const updated = [...txns, newTxn]
    setTxns(updated)
    saveSupplierTxns(uid, updated)
    setTxnModal(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">Yetkazuvchilar</h1>
          <button onClick={openAdd}
            className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Plus size={20} className="text-white" />
          </button>
        </div>
        {totalDebt > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Jami qarz</span>
            <span className="text-red-400 font-bold text-sm">{fmtNum(totalDebt)} so'm</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Truck size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{search ? t('notFound') : "Yetkazuvchilar yo'q"}</p>
            {!search && (
              <button onClick={openAdd}
                className="mt-4 px-5 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium">
                Yetkazuvchi qo'shish
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => {
              const balance = getBalance(txns, s.id)
              const sTxns = txns
                .filter(tx => tx.supplierId === s.id)
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              const sPending = processing.filter(p => p.supplierId === s.id && p.status === 'pending')
              const isExp = expanded === s.id
              return (
                <div key={s.id}>
                  <SwipeableRow onEdit={() => openEdit(s)} onDelete={() => handleDeleteSupplier(s.id)}>
                    <div className={`bg-slate-800/60 rounded-xl border ${balance > 0 ? 'border-red-500/20' : 'border-slate-700/30'}`}>
                      <button onClick={() => setExpanded(isExp ? null : s.id)} className="w-full px-4 py-3.5 text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">{s.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {s.phone && (
                                <span className="flex items-center gap-1 text-slate-400 text-xs">
                                  <Phone size={10} /> {s.phone}
                                </span>
                              )}
                              {s.company && (
                                <span className="flex items-center gap-1 text-slate-400 text-xs">
                                  <Building2 size={10} /> {s.company}
                                </span>
                              )}
                              {sPending.length > 0 && (
                                <span className="flex items-center gap-1 text-amber-400 text-xs">
                                  <Cog size={10} /> {sPending.length} ta qayta ishlashda
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <div className="text-right">
                              {balance > 0
                                ? <p className="text-red-400 font-semibold text-sm">{fmtNum(balance)} so'm</p>
                                : <p className="text-primary-400 text-xs font-medium">To'langan ✓</p>
                              }
                            </div>
                            {isExp ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                          </div>
                        </div>
                      </button>

                      {isExp && (
                        <div className="border-t border-slate-700/40 px-4 py-3 space-y-3">
                          <div className="flex gap-2">
                            <button onClick={() => openTxn(s.id, 'debt')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 text-sm font-medium active:scale-95 transition-all">
                              <TrendingUp size={14} /> Qarz qo'shish
                            </button>
                            <button onClick={() => openTxn(s.id, 'payment')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-500/15 border border-primary-500/20 text-primary-400 text-sm font-medium active:scale-95 transition-all">
                              <TrendingDown size={14} /> To'lov qilish
                            </button>
                          </div>

                                          {sPending.length > 0 && (
                            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 space-y-2">
                              <p className="text-amber-400 text-xs font-medium">Qayta ishlashda:</p>
                              {sPending.map(p => (
                                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-amber-500/10 last:border-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-medium">{p.productName}</p>
                                    <p className="text-slate-500 text-xs">{fmtDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
                                  </div>
                                  <p className="text-amber-400 text-sm font-semibold ml-3 flex-shrink-0">
                                    {fmtNum(p.quantity)} {p.unit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {s.note && (
                            <p className="text-slate-500 text-xs">{s.note}</p>
                          )}

                          {sTxns.length === 0 ? (
                            <p className="text-slate-600 text-xs text-center py-2">Hali tranzaksiya yo'q</p>
                          ) : (
                            <div className="space-y-1 max-h-52 overflow-y-auto">
                              {sTxns.slice(0, 15).map(tx => (
                                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-slate-400 text-xs">{fmtDate(tx.date)}</p>
                                    {tx.note && <p className="text-slate-500 text-xs truncate">{tx.note}</p>}
                                  </div>
                                  <p className={`text-sm font-semibold ml-3 flex-shrink-0 ${tx.type === 'debt' ? 'text-red-400' : 'text-primary-400'}`}>
                                    {tx.type === 'debt' ? '+' : '-'}{fmtNum(tx.amount)} so'm
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SwipeableRow>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Supplier Modal */}
      <Modal open={supplierModal} onClose={() => setSupplierModal(false)}
        title={editId ? "Yetkazuvchini tahrirlash" : "Yetkazuvchi qo'shish"}>
        <div className="space-y-3 pb-4">
          <input value={form.name} onChange={set('name')} placeholder="Yetkazuvchi nomi *"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
          <input value={form.phone} onChange={set('phone')} placeholder="Telefon: +998901234567" type="tel"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
          <input value={form.company} onChange={set('company')} placeholder="Kompaniya nomi"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
          <textarea value={form.note} onChange={set('note')} placeholder={t('note')} rows={2}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40 resize-none" />
          <button onClick={handleSaveSupplier}
            className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all">
            {t('save')}
          </button>
        </div>
      </Modal>

      {/* Debt / Payment Modal */}
      <Modal open={txnModal} onClose={() => setTxnModal(false)}
        title={suppliers.find(s => s.id === activeSupplierId)?.name || ''}>
        <div className="space-y-3 pb-4">
          <div className="flex bg-slate-800/60 rounded-xl p-1">
            <button onClick={() => setTxnForm(f => ({ ...f, type: 'debt' }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${txnForm.type === 'debt' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>
              Qarz qo'shish
            </button>
            <button onClick={() => setTxnForm(f => ({ ...f, type: 'payment' }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${txnForm.type === 'payment' ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              To'lov qilish
            </button>
          </div>

          <input type="number" value={txnForm.amount} onChange={setTxn('amount')} placeholder="Summa (so'm)"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />

          <input type="date" value={txnForm.date} onChange={setTxn('date')}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500/40" />

          <input value={txnForm.note} onChange={setTxn('note')} placeholder={t('note')}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />

          <button onClick={handleSaveTxn}
            className={`w-full text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all shadow-lg ${txnForm.type === 'debt' ? 'bg-red-500 shadow-red-500/20' : 'bg-primary-500 shadow-primary-500/20'}`}>
            {t('save')}
          </button>
        </div>
      </Modal>

    </div>
  )
}
