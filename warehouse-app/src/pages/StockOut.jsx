import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum, fmtDate, today } from '../utils/format'
import { generateId } from '../store/storage'
import { addTeamMovement, deleteTeamMovement } from '../store/family'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { PackageMinus, Search, Users, AlertCircle } from 'lucide-react'
import { addLogEntry } from '../store/auditLog'

const emptyForm = (products) => ({
  productId: products[0]?.id || '',
  quantity: '',
  price: '',
  customer: '',
  note: '',
  date: today()
})

export default function StockOut() {
  const { user, products, movements, saveMovements, team, teamId, teamMovements, getInventory } = useApp()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(() => emptyForm(products))
  const [teamMode, setTeamMode] = useState(false)
  const [stockError, setStockError] = useState('')

  const isTeam = teamMode && !!team
  const activeMovements = isTeam ? teamMovements : movements
  const inventory = getInventory(activeMovements)

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setStockError('')
  }

  const selectedProduct = products.find(p => p.id === form.productId)
  const currentStock = inventory.find(i => i.productId === form.productId)?.quantity || 0
  const salePrice = Number(form.price) || selectedProduct?.salePrice || 0
  const totalAmount = (Number(form.quantity) || 0) * salePrice

  const filtered = [...activeMovements]
    .filter(m => m.type === 'chiqim')
    .filter(m => !search || m.productName?.toLowerCase().includes(search.toLowerCase()) || m.customer?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date?.localeCompare(a.date))

  const openAdd = () => {
    setForm(emptyForm(products))
    setStockError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.productId || !form.quantity) return
    const qty = Number(form.quantity)
    if (qty > currentStock) {
      setStockError(`Omborda faqat ${fmtNum(currentStock)} ${selectedProduct?.unit || 'dona'} bor`)
      return
    }
    const prod = products.find(p => p.id === form.productId)
    const price = Number(form.price) || prod?.salePrice || 0
    const mv = {
      id: generateId(),
      type: 'chiqim',
      productId: form.productId,
      productName: prod?.name || '',
      quantity: qty,
      unit: prod?.unit || 'dona',
      price,
      total: qty * price,
      customer: form.customer,
      note: form.note,
      date: form.date || today(),
      userId: user?.id,
      userName: user?.fullName || user?.username
    }
    if (isTeam && teamId) {
      await addTeamMovement(teamId, mv)
    } else {
      saveMovements([...movements, mv], products)
    }
    await addLogEntry(user?.id, {
      action: 'chiqim_qoshildi',
      userId: user?.id,
      userName: user?.fullName || user?.username,
      productId: mv.productId,
      productName: mv.productName,
      quantity: mv.quantity,
      unit: mv.unit,
      price: mv.price,
      total: mv.total,
      customer: mv.customer,
      note: mv.note
    }, isTeam ? teamId : null)
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
      action: 'chiqim_ochirildi',
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
          <h1 className="text-white text-xl font-bold">{t('stockOut')}</h1>
          <button onClick={openAdd}
            className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <PackageMinus size={20} className="text-white" />
          </button>
        </div>

        {team && (
          <div className="flex bg-slate-800/60 rounded-xl p-1">
            <button onClick={() => setTeamMode(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!teamMode ? 'bg-red-500 text-white' : 'text-slate-400'}`}>
              Shaxsiy
            </button>
            <button onClick={() => setTeamMode(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${teamMode ? 'bg-red-500 text-white' : 'text-slate-400'}`}>
              <Users size={12} /> {team.name}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/40" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <PackageMinus size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{search ? t('notFound') : t('noMovements')}</p>
          </div>
        ) : (
          <div>
            {filtered.map(mv => (
              <SwipeableRow key={mv.id} onDelete={() => handleDelete(mv)}>
                <div className="bg-slate-800/60 rounded-xl px-4 py-3.5 border border-red-500/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{mv.productName}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{fmtDate(mv.date)}{mv.customer ? ` · ${mv.customer}` : ''}</p>
                      {mv.userName && mv.userId !== user?.id && (
                        <p className="text-slate-500 text-xs mt-0.5">{mv.userName}</p>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-red-400 font-semibold text-sm">-{fmtNum(mv.quantity)} {mv.unit}</p>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('addChiqim')}>
        <div className="space-y-3 pb-4">
          {products.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Avval mahsulot qo'shing</p>
          ) : (
            <>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t('product')}</label>
                <select value={form.productId} onChange={set('productId')}
                  className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40">
                  {products.map(p => {
                    const stock = inventory.find(i => i.productId === p.id)?.quantity || 0
                    return <option key={p.id} value={p.id}>{p.name} (qoldiq: {fmtNum(stock)} {p.unit})</option>
                  })}
                </select>
              </div>

              <div className="bg-slate-800/60 rounded-xl px-4 py-2.5 flex justify-between items-center">
                <span className="text-slate-400 text-sm">{t('currentStock')}</span>
                <span className={`font-medium text-sm ${currentStock <= 0 ? 'text-red-400' : 'text-white'}`}>
                  {fmtNum(currentStock)} {selectedProduct?.unit || 'dona'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">{t('quantity')}</label>
                  <input type="number" value={form.quantity} onChange={set('quantity')} placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/40" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">{t('salePrice')}</label>
                  <input type="number" value={form.price} onChange={set('price')} placeholder={String(selectedProduct?.salePrice || 0)}
                    className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/40" />
                </div>
              </div>

              {stockError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{stockError}</p>
                </div>
              )}

              {totalAmount > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">{t('total')}</span>
                  <span className="text-red-400 font-bold">{fmtNum(totalAmount)} so'm</span>
                </div>
              )}

              <input value={form.customer} onChange={set('customer')} placeholder={t('customer')}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/40" />

              <input type="date" value={form.date} onChange={set('date')}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40" />

              <textarea value={form.note} onChange={set('note')} placeholder={t('note')} rows={2}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-red-500/40 resize-none" />

              <button onClick={handleSave}
                className="w-full bg-red-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                {t('save')}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
