import { useState } from 'react'
import { Plus, Trash2, Search, TrendingUp, TrendingDown, Users, Download, SlidersHorizontal, CheckSquare, Square, X } from 'lucide-react'
import { useApp, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../store/AppContext'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { generateId } from '../store/storage'
import { addFamilyTransaction, deleteFamilyTransaction, updateFamilyTransaction } from '../store/family'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { fmtCur } from '../utils/format'
import { exportTransactionsPDF } from '../utils/pdfExport'

const EMOJIS = { income: '💰', expense: '💸' }
const fmt = (n, cur) => fmtCur(n, cur)

const CATEGORY_EMOJIS = {
  'Maosh': '💼', 'Biznes': '🏢', 'Freelance': '💻', 'Investitsiya': '📈', 'Sovg\'a': '🎁', 'Boshqa kirim': '💰',
  'Oziq-ovqat': '🍕', 'Transport': '🚗', 'Uy-joy': '🏠', 'Kiyim': '👕', 'Sog\'liq': '💊', 'Ta\'lim': '📚',
  'Ko\'ngilochar': '🎮', 'Kommunal': '💡', 'Telefon/Internet': '📱', 'Boshqa chiqim': '💸'
}

const localNow = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const defaultForm = { type: 'expense', amount: '', category: '', currency: 'UZS', note: '', date: localNow() }

export default function Transactions() {
  const { transactions, saveTransactions, user, family, familyTransactions, familyMembers, canEdit, canAdd, refreshFamily } = useApp()
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const familyMode = !!family
  const [form, setForm] = useState(defaultForm)
  const [extraAmounts, setExtraAmounts] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [customCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_${user?.id}_categories`)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = (type = 'expense') => {
    setForm({ ...defaultForm, date: localNow(), type, category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] })
    setExtraAmounts([])
    setModal(true)
  }

  const handleSave = () => {
    if (!form.amount || !form.category) return
    const baseFields = {
      category: form.category,
      note: form.note,
      date: form.date,
      type: form.type,
      emoji: CATEGORY_EMOJIS[form.category] || EMOJIS[form.type],
      userId: user.id,
      userName: user.name
    }
    const newTxs = [
      { id: generateId(), ...baseFields, amount: parseFloat(form.amount), currency: form.currency },
      ...extraAmounts
        .filter(e => e.amount && parseFloat(e.amount) > 0)
        .map(e => ({ id: generateId(), ...baseFields, amount: parseFloat(e.amount), currency: e.currency }))
    ]
    if (familyMode && family) {
      newTxs.forEach(t => addFamilyTransaction(family.id, t))
    } else {
      saveTransactions([...transactions, ...newTxs])
    }
    setModal(false)
  }

  const openEdit = (tx) => {
    setEditingTx({ ...tx })
    setEditModal(true)
  }

  const handleEditSave = () => {
    if (!editingTx?.amount || !editingTx?.category) return
    const savedTx = { ...editingTx, amount: parseFloat(editingTx.amount) }
    if (familyMode && family) {
      updateFamilyTransaction(family.id, savedTx).then(() => refreshFamily())
    } else {
      saveTransactions(transactions.map(t => t.id === savedTx.id ? savedTx : t))
    }
    setEditModal(false)
    setEditingTx(null)
  }

  const handleDelete = (id, isFamily = false) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    if (isFamily && family) {
      deleteFamilyTransaction(family.id, id).then(() => refreshFamily())
    } else {
      saveTransactions(transactions.filter(t => t.id !== id))
    }
  }

  const activeList = (familyMode && family ? familyTransactions : transactions)
    .filter(t => t.category !== 'Valyuta ayirboshlash')

  const filtered = activeList
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !search || t.category.toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase()))
    .filter(t => !dateFrom || t.date.slice(0, 10) >= dateFrom)
    .filter(t => !dateTo || t.date.slice(0, 10) <= dateTo)
    .filter(t => currencyFilter === 'all' || (t.currency || 'UZS') === currencyFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const activeFilterCount = [dateFrom, dateTo, currencyFilter !== 'all'].filter(Boolean).length

  const categories = customCategories || (form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

  const getMemberName = (userId) => {
    const m = familyMembers.find(m => m.userId === userId)
    return m?.fullName || m?.username || 'Noma\'lum'
  }

  const getExportList = () => selected.size > 0 ? filtered.filter(t => selected.has(t.id)) : filtered

  const exportPDF = async () => {
    setExportModal(false)
    await exportTransactionsPDF(getExportList(), 'pulbek-tranzaksiyalar.pdf')
  }

  const exportExcel = () => {
    const data = getExportList().map(t => ({
      'Sana': format(new Date(t.date), 'dd.MM.yyyy'),
      'Tur': t.type === 'income' ? 'Kirim' : 'Chiqim',
      'Kategoriya': t.category,
      'Miqdor': t.amount,
      'Valyuta': t.currency || 'UZS',
      'Izoh': t.note || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tranzaksiyalar')
    XLSX.writeFile(wb, 'pulbek-tranzaksiyalar.xlsx')
    setExportModal(false)
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24 page-animate">
      <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Kirim / Chiqim</h1>
          <div className="flex gap-2">
            <button onClick={() => setExportModal(true)} className="p-2 rounded-xl bg-dark-700 text-gray-400 active:opacity-70">
              <Download size={18} />
            </button>
            <button onClick={() => { setSelectMode(s => !s); setSelected(new Set()) }} className={`p-2 rounded-xl active:opacity-70 ${selectMode ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-gray-400'}`}>
              <CheckSquare size={18} />
            </button>
            <button onClick={() => setShowFilter(f => !f)} className={`relative p-2 rounded-xl active:opacity-70 ${showFilter || activeFilterCount > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-gray-400'}`}>
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            {family && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-500/20 text-purple-400">
                <Users size={14} />
                Oila
              </span>
            )}
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input className="input-field pl-9 py-2 text-sm" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'income', 'expense'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${filter === f ? (f === 'income' ? 'bg-green-500 text-white' : f === 'expense' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-dark-700 text-gray-400'}`}>
              {f === 'all' ? 'Barchasi' : f === 'income' ? 'Kirim' : 'Chiqim'}
            </button>
          ))}
        </div>
        {showFilter && (
          <div className="mt-3 flex flex-col gap-2 bg-dark-800 rounded-xl p-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 block">Dan</label>
                <input className="input-field text-xs py-1.5" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 block">Gacha</label>
                <input className="input-field text-xs py-1.5" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'UZS', 'USD', 'EUR', 'RUB'].map(c => (
                <button key={c} onClick={() => setCurrencyFilter(c)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${currencyFilter === c ? 'bg-blue-500 text-white' : 'bg-dark-600 text-gray-400'}`}>
                  {c === 'all' ? 'Barchasi' : c}
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setCurrencyFilter('all') }} className="text-xs text-red-400 text-center">
                Filtrni tozalash
              </button>
            )}
          </div>
        )}
      </div>

      {/* Select mode toolbar */}
      {selectMode && (
        <div className="px-4 py-2 flex items-center justify-between bg-dark-800 border-b border-dark-600">
          <button onClick={() => {
            if (selected.size === filtered.length) setSelected(new Set())
            else setSelected(new Set(filtered.map(t => t.id)))
          }} className="flex items-center gap-2 text-sm text-blue-400">
            {selected.size === filtered.length ? <CheckSquare size={16} /> : <Square size={16} />}
            {selected.size === filtered.length ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
          </button>
          <span className="text-gray-400 text-xs">{selected.size} ta tanlandi</span>
        </div>
      )}

      <div className="flex-1 px-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-gray-500">Hech narsa topilmadi</p>
          </div>
        ) : (
          filtered.map(t => {
            const isFamily = familyMode && family
            const showDelete = isFamily ? canEdit(t.userId) : true
            const canEditTx = isFamily ? canEdit(t.userId) : true
            const isSelected = selected.has(t.id)
            return selectMode ? (
              <div key={t.id} onClick={() => {
                const s = new Set(selected)
                s.has(t.id) ? s.delete(t.id) : s.add(t.id)
                setSelected(s)
              }} className={`card flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'border border-blue-500/50 bg-blue-500/5' : ''}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-600'}`}>
                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${t.type === 'income' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {t.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.category}</p>
                  <p className="text-gray-500 text-xs">{t.note ? `${t.note} · ` : ''}{format(new Date(t.date), t.date?.includes('T') ? 'dd.MM.yyyy HH:mm' : 'dd.MM.yyyy')}</p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency || 'UZS')} {t.currency || 'UZS'}
                </p>
              </div>
            ) : (
              <SwipeableRow
                key={t.id}
                onDelete={showDelete ? () => handleDelete(t.id, isFamily) : null}
                onEdit={canEditTx ? () => openEdit(t) : null}
              >
                <div className="card flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${t.type === 'income' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                    {t.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.category}</p>
                    <p className="text-gray-500 text-xs">
                      {isFamily && t.userId ? `${getMemberName(t.userId)} · ` : ''}
                      {t.note ? `${t.note} · ` : ''}{format(new Date(t.date), t.date?.includes('T') ? 'dd.MM.yyyy HH:mm' : 'dd.MM.yyyy')}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency || 'UZS')} {t.currency || 'UZS'}
                  </p>
                </div>
              </SwipeableRow>
            )
          })
        )}
      </div>

      {/* Select mode bottom panel */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-dark-700 rounded-2xl p-3 flex gap-2 shadow-xl">
          <button onClick={exportPDF} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold">
            📄 PDF ({selected.size} ta)
          </button>
          <button onClick={exportExcel} className="flex-1 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold">
            📊 Excel ({selected.size} ta)
          </button>
          <button onClick={() => setSelected(new Set())} className="p-3 rounded-xl bg-dark-600 text-gray-400">
            <X size={18} />
          </button>
        </div>
      )}

      {(!familyMode || canAdd()) && !selectMode && (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2">
          <button onClick={() => openAdd('income')} className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30 active:opacity-80">
            <TrendingUp size={20} />
          </button>
          <button onClick={() => openAdd('expense')} className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:opacity-80">
            <TrendingDown size={20} />
          </button>
        </div>
      )}

      {/* Export Modal */}
      <Modal open={exportModal} onClose={() => setExportModal(false)} title="Ma'lumotlarni yuklash">
        <div className="flex flex-col gap-3">
          <p className="text-gray-400 text-sm">
            {filtered.length} ta {search || filter !== 'all' ? 'filtrlangan' : ''} tranzaksiya yuklanadi
          </p>
          <button onClick={exportPDF} className="btn-primary">📄 PDF yuklab olish</button>
          <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors">
            📊 Excel yuklab olish
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setEditingTx(null) }} title="Tahrirlash">
        {editingTx && (
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex gap-2">
              <button onClick={() => setEditingTx(tx => ({ ...tx, type: 'income', category: (customCategories || INCOME_CATEGORIES)[0] }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editingTx.type === 'income' ? 'bg-green-500 text-white' : 'bg-dark-600 text-gray-400'}`}>Kirim</button>
              <button onClick={() => setEditingTx(tx => ({ ...tx, type: 'expense', category: (customCategories || EXPENSE_CATEGORIES)[0] }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editingTx.type === 'expense' ? 'bg-red-500 text-white' : 'bg-dark-600 text-gray-400'}`}>Chiqim</button>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Summa</label>
              <input className="input-field" type="number" placeholder="0" value={editingTx.amount} onChange={e => setEditingTx(t => ({ ...t, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
              <select className="input-field" value={editingTx.currency || 'UZS'} onChange={e => setEditingTx(t => ({ ...t, currency: e.target.value }))}>
                {['UZS', 'USD', 'EUR', 'RUB'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Kategoriya</label>
              <select className="input-field" value={editingTx.category} onChange={e => setEditingTx(t => ({ ...t, category: e.target.value }))}>
                {(customCategories || (editingTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
              <input className="input-field" placeholder="Izoh..." value={editingTx.note || ''} onChange={e => setEditingTx(t => ({ ...t, note: e.target.value }))} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sana</label>
              <input className="input-field" type="datetime-local" value={editingTx.date} onChange={e => setEditingTx(t => ({ ...t, date: e.target.value }))} />
            </div>
            <button onClick={handleEditSave} className="btn-primary mt-2">Saqlash</button>
          </div>
        )}
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title={form.type === 'income' ? 'Kirim qo\'shish' : 'Chiqim qo\'shish'}>
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex gap-2">
            <button onClick={() => set('type', 'income')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-green-500 text-white' : 'bg-dark-600 text-gray-400'}`}>
              Kirim
            </button>
            <button onClick={() => set('type', 'expense')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-red-500 text-white' : 'bg-dark-600 text-gray-400'}`}>
              Chiqim
            </button>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Summa</label>
            <input className="input-field" type="number" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
            <select className="input-field" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {['UZS', 'USD', 'EUR', 'RUB'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Kategoriya</label>
            <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
            <input className="input-field" placeholder="Izoh..." value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Sana</label>
            <input className="input-field" type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          {extraAmounts.map((ea, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">Summa {i + 2}</label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="0"
                  value={ea.amount}
                  onChange={e => setExtraAmounts(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-400 text-xs mb-1 block">Valyuta</label>
                <select
                  className="input-field"
                  value={ea.currency}
                  onChange={e => setExtraAmounts(prev => prev.map((x, j) => j === i ? { ...x, currency: e.target.value } : x))}
                >
                  {['UZS', 'USD', 'EUR', 'RUB'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={() => setExtraAmounts(prev => prev.filter((_, j) => j !== i))}
                className="mb-0.5 px-3 py-2.5 rounded-xl bg-dark-600 text-gray-400 text-sm"
              >×</button>
            </div>
          ))}
          {extraAmounts.length < 3 && (
            <button
              onClick={() => setExtraAmounts(prev => [...prev, { amount: '', currency: 'USD' }])}
              className="text-blue-400 text-xs py-2 border border-dashed border-blue-400/40 rounded-xl w-full"
            >+ Valyuta qo'shish</button>
          )}
          {familyMode && family && (
            <p className="text-purple-400 text-xs bg-purple-500/10 py-2 px-3 rounded-lg">
              Bu tranzaksiya oilaviy rejimga saqlanadi
            </p>
          )}
          <button onClick={handleSave} className="btn-primary mt-2">Saqlash</button>
        </div>
      </Modal>
    </div>
  )
}
