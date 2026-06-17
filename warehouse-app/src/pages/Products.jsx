import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum } from '../utils/format'
import { generateId } from '../store/storage'
import { DEFAULT_CATEGORIES, UNITS } from '../store/AppContext'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { Package, Plus, Search, ChevronDown } from 'lucide-react'

const emptyForm = () => ({
  name: '', category: DEFAULT_CATEGORIES[0], unit: 'dona',
  purchasePrice: '', salePrice: '', minStock: '', barcode: '', note: ''
})

export default function Products() {
  const { products, saveProducts, user } = useApp()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setModalOpen(true) }
  const openEdit = (p) => {
    setForm({ name: p.name, category: p.category, unit: p.unit, purchasePrice: p.purchasePrice, salePrice: p.salePrice, minStock: p.minStock || '', barcode: p.barcode || '', note: p.note || '' })
    setEditId(p.id); setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editId) {
      saveProducts(products.map(p => p.id === editId ? {
        ...p, ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        minStock: Number(form.minStock) || 0
      } : p))
    } else {
      saveProducts([...products, {
        id: generateId(), ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        minStock: Number(form.minStock) || 0,
        createdAt: new Date().toISOString(),
        userId: user?.id
      }])
    }
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    if (!confirm(t('deleteConfirm'))) return
    saveProducts(products.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">{t('products')}</h1>
        <button onClick={openAdd} className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <Plus size={20} className="text-white" />
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{search ? t('notFound') : t('noProducts')}</p>
            {!search && <button onClick={openAdd} className="mt-4 px-6 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium">{t('addProduct')}</button>}
          </div>
        ) : (
          <div>
            {filtered.map(p => (
              <SwipeableRow key={p.id} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)}>
                <div className="bg-slate-800/60 rounded-xl px-4 py-3.5 border border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{p.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{p.category} · {p.unit}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-primary-400 text-sm font-semibold">{fmtNum(p.purchasePrice)} so'm</p>
                      {p.salePrice > 0 && <p className="text-slate-400 text-xs">{fmtNum(p.salePrice)} so'm</p>}
                    </div>
                  </div>
                  {p.minStock > 0 && (
                    <p className="text-slate-500 text-xs mt-1.5">Min: {p.minStock} {p.unit}</p>
                  )}
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('editProduct') : t('addProduct')}>
        <div className="space-y-3 pb-4">
          <input value={form.name} onChange={set('name')} placeholder={t('productName')}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />

          <select value={form.category} onChange={set('category')}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500/40">
            {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={form.unit} onChange={set('unit')}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary-500/40">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t('purchasePrice')}</label>
              <input type="number" value={form.purchasePrice} onChange={set('purchasePrice')} placeholder="0"
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t('salePrice')}</label>
              <input type="number" value={form.salePrice} onChange={set('salePrice')} placeholder="0"
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t('minStock')}</label>
              <input type="number" value={form.minStock} onChange={set('minStock')} placeholder="0"
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t('barcode')}</label>
              <input value={form.barcode} onChange={set('barcode')} placeholder="..."
                className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
            </div>
          </div>

          <textarea value={form.note} onChange={set('note')} placeholder={t('note')} rows={2}
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40 resize-none" />

          <button onClick={handleSave}
            className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all">
            {t('save')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
