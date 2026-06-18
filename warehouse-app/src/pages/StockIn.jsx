import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum, fmtDate, today } from '../utils/format'
import { generateId, getPinned } from '../store/storage'
import { addTeamMovement, deleteTeamMovement } from '../store/family'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { PackagePlus, Search, Users, MapPin, Plus, X } from 'lucide-react'
import { addLogEntry } from '../store/auditLog'

const emptyItem = (products) => ({ productId: products[0]?.id || '', quantity: '', price: '' })
const emptyForm = (products) => ({
  items: [emptyItem(products)],
  supplier: '',
  note: '',
  date: today()
})

export default function StockIn() {
  const { user, products, movements, saveMovements, team, teamId, teamMovements, perm } = useApp()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(() => emptyForm(products))
  const [teamMode, setTeamMode] = useState(false)
  const [pinned] = useState(() => getPinned(user?.id))

  const isTeam = teamMode && !!team
  const activeMovements = isTeam ? teamMovements : movements
  const p = perm(isTeam)
  const sortedProducts = [
    ...products.filter(pr => pinned.includes(pr.id)),
    ...products.filter(pr => !pinned.includes(pr.id))
  ]

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setItem = (idx, key) => e => setForm(f => ({
    ...f,
    items: f.items.map((item, i) => i === idx ? { ...item, [key]: e.target.value } : item)
  }))
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem(products)] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const totalAmount = form.items.reduce((sum, item) => {
    const prod = products.find(pr => pr.id === item.productId)
    const price = Number(item.price) || prod?.purchasePrice || 0
    return sum + (Number(item.quantity) || 0) * price
  }, 0)

  const filtered = [...activeMovements]
    .filter(m => m.type === 'kirim')
    .filter(m => !search || m.productName?.toLowerCase().includes(search.toLowerCase()) || m.supplier?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const openAdd = () => {
    setForm(emptyForm(products))
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (form.items.some(item => !item.productId || !item.quantity)) return
    const mvs = form.items.map(item => {
      const prod = products.find(pr => pr.id === item.productId)
      const price = Number(item.price) || prod?.purchasePrice || 0
      const qty = Number(item.quantity)
      return {
        id: generateId(),
        type: 'kirim',
        productId: item.productId,
        productName: prod?.name || '',
        quantity: qty,
        unit: prod?.unit || 'dona',
        price,
        total: qty * price,
        supplier: form.supplier,
        note: form.note,
        date: form.date || today(),
        userId: user?.id,
        userName: user?.fullName || user?.username
      }
    })
    if (isTeam && teamId) {
      for (const mv of mvs) await addTeamMovement(teamId, mv)
    } else {
      saveMovements([...movements, ...mvs], products)
    }
    for (const mv of mvs) {
      await addLogEntry(user?.id, {
        action: 'kirim_qoshildi',
        userId: user?.id,
        userName: user?.fullName || user?.username,
        productId: mv.productId,
        productName: mv.productName,
        quantity: mv.quantity,
        unit: mv.unit,
        price: mv.price,
        total: mv.total,
        supplier: mv.supplier,
        note: mv.note
      }, isTeam ? teamId : null)
    }
    setModalOpen(false)
  }

  const handleDelete = async (mv) => {
    if (!confirm(t('deleteConfirm'))) return
    if (isTeam && teamId) {
      await deleteTeamMovement(teamId, mv.id)
    } else {
      saveMovements(movements.filter(m => m.id !== mv.id))
    }
    await addLogEntry(user?.id, {
      action: 'kirim_ochirildi',
      userId: user?.id,
      userName: user?.fullName || user?.username,
      productId: mv.productId,
      productName: mv.productName,
      quantity: mv.quantity,
      unit: mv.unit,
      total: mv.total
    }, isTeam ? teamId : null)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">{t('stockIn')}</h1>
          {p.canAdd && (
            <button onClick={openAdd}
              className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <PackagePlus size={20} className="text-white" />
            </button>
          )}
        </div>

        {team && (
          <div className="flex bg-slate-800/60 rounded-xl p-1">
            <button onClick={() => setTeamMode(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              Shaxsiy
            </button>
            <button onClick={() => setTeamMode(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              <Users size={12} /> {team.name}
            </button>
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
            <PackagePlus size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{search ? t('notFound') : t('noMovements')}</p>
          </div>
        ) : (
          <div>
            {filtered.map(mv => (
              <SwipeableRow key={mv.id} onDelete={p.canDelete ? () => handleDelete(mv) : undefined}>
                <div className="bg-slate-800/60 rounded-xl px-4 py-3.5 border border-primary-500/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{mv.productName}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{fmtDate(mv.date)}{mv.supplier ? ` · ${mv.supplier}` : ''}</p>
                      {mv.userName && mv.userId !== user?.id && (
                        <p className="text-slate-500 text-xs mt-0.5">{mv.userName}</p>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-primary-400 font-semibold text-sm">+{fmtNum(mv.quantity)} {mv.unit}</p>
                      <p className="text-slate-400 text-xs">{fmtNum(mv.total)} so'm</p>
                    </div>
                  </div>
                  {mv.note && <p className="text-slate-500 text-xs mt-2 border-t border-slate-700/50 pt-2">{mv.note}</p>}
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('addKirim')}>
        <div className="space-y-3 pb-4">
          {products.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Avval mahsulot qo'shing</p>
          ) : (
            <>
              <div className="space-y-2">
                {form.items.map((item, idx) => {
                  const itemProd = products.find(pr => pr.id === item.productId)
                  const itemPrice = Number(item.price) || itemProd?.purchasePrice || 0
                  const itemTotal = (Number(item.quantity) || 0) * itemPrice
                  return (
                    <div key={idx} className="bg-slate-900/60 rounded-xl p-3 space-y-2 border border-slate-700/30">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-medium">#{idx + 1} mahsulot</span>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(idx)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg active:bg-red-500/20">
                            <X size={13} className="text-slate-500" />
                          </button>
                        )}
                      </div>
                      <select value={item.productId} onChange={setItem(idx, 'productId')}
                        className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500/40">
                        {sortedProducts.map(pr => (
                          <option key={pr.id} value={pr.id}>{pinned.includes(pr.id) ? '★ ' : ''}{pr.name} ({pr.unit})</option>
                        ))}
                      </select>
                      {itemProd?.location && (
                        <div className="flex items-center gap-1.5 px-0.5">
                          <MapPin size={11} className="text-amber-400" />
                          <span className="text-amber-400 text-xs">{itemProd.location}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={item.quantity} onChange={setItem(idx, 'quantity')}
                          placeholder="Miqdor"
                          className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
                        <input type="number" value={item.price} onChange={setItem(idx, 'price')}
                          placeholder={String(itemProd?.purchasePrice || 0)}
                          className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
                      </div>
                      {itemTotal > 0 && (
                        <p className="text-right text-primary-400 text-xs font-medium">{fmtNum(itemTotal)} so'm</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <button onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary-500/30 text-primary-400 text-sm active:scale-95 transition-all">
                <Plus size={15} /> Mahsulot qo'shish
              </button>

              {totalAmount > 0 && (
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">{t('total')}</span>
                  <span className="text-primary-400 font-bold">{fmtNum(totalAmount)} so'm</span>
                </div>
              )}

              <input value={form.supplier} onChange={set('supplier')} placeholder={t('supplier')}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />

              <input type="date" value={form.date} onChange={set('date')}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500/40" />

              <textarea value={form.note} onChange={set('note')} placeholder={t('note')} rows={2}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40 resize-none" />

              <button onClick={handleSave}
                className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all">
                {form.items.length > 1 ? `${form.items.length} ta kirim saqlash` : t('save')}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
