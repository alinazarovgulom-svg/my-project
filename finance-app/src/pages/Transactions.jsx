import { useState } from 'react'
import { Plus, Trash2, Search, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { useApp, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../store/AppContext'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { generateId } from '../store/storage'
import { addFamilyTransaction, deleteFamilyTransaction } from '../store/family'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const EMOJIS = { income: '💰', expense: '💸' }
const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

const CATEGORY_EMOJIS = {
  'Maosh': '💼', 'Biznes': '🏢', 'Freelance': '💻', 'Investitsiya': '📈', 'Sovg\'a': '🎁', 'Boshqa kirim': '💰',
  'Oziq-ovqat': '🍕', 'Transport': '🚗', 'Uy-joy': '🏠', 'Kiyim': '👕', 'Sog\'liq': '💊', 'Ta\'lim': '📚',
  'Ko\'ngilochar': '🎮', 'Kommunal': '💡', 'Telefon/Internet': '📱', 'Boshqa chiqim': '💸'
}

const defaultForm = { type: 'expense', amount: '', category: '', currency: 'UZS', note: '', date: new Date().toISOString().split('T')[0] }

export default function Transactions() {
  const { transactions, saveTransactions, user, family, familyTransactions, familyMembers, canEdit, canAdd, refreshFamily } = useApp()
  const isFamily = !!family
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [customCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_${user?.id}_categories`)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = (type = 'expense') => {
    setForm({ ...defaultForm, type, category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] })
    setModal(true)
  }

  const handleSave = () => {
    if (!form.amount || !form.category) return
    const t = {
      id: generateId(),
      ...form,
      amount: parseFloat(form.amount),
      emoji: CATEGORY_EMOJIS[form.category] || EMOJIS[form.type],
      userId: user.id,
      userName: user.name
    }
    if (isFamily) {
      addFamilyTransaction(family.id, t).then(() => refreshFamily())
    } else {
      saveTransactions([...transactions, t])
    }
    setModal(false)
  }

  const openEdit = (tx) => {
    setEditingTx({ ...tx })
    setEditModal(true)
  }

  const handleEditSave = () => {
    if (!editingTx?.amount || !editingTx?.category) return
    const updated = transactions.map(t =>
      t.id === editingTx.id
        ? { ...editingTx, amount: parseFloat(editingTx.amount) }
        : t
    )
    saveTransactions(updated)
    setEditModal(false)
    setEditingTx(null)
  }

  const handleDelete = (id, isFamily = false) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    if (isFamily) {
      deleteFamilyTransaction(family.id, id).then(() => refreshFamily())
    } else {
      saveTransactions(transactions.filter(t => t.id !== id))
    }
  }

  const activeList = isFamily ? familyTransactions : transactions

  const filtered = activeList
    .filter(t => t.category !== 'Valyuta ayirboshlash')
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !search || t.category.toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const categories = customCategories || (form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

  const getMemberName = (userId) => {
    const m = familyMembers.find(m => m.userId === userId)
    return m?.fullName || m?.username || 'Noma\'lum'
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('PulBek - Tranzaksiyalar', 14, 20)
    doc.setFontSize(10)
    doc.text(`Sana: ${format(new Date(), 'dd.MM.yyyy')}`, 14, 28)
    autoTable(doc, {
      startY: 35,
      head: [['Sana', 'Tur', 'Kategoriya', 'Miqdor', 'Valyuta', 'Izoh']],
      body: filtered.map(t => [
        format(new Date(t.date), 'dd.MM.yyyy'),
        t.type === 'income' ? 'Kirim' : 'Chiqim',
        t.category,
        fmt(t.amount),
        t.currency || 'UZS',
        t.note || ''
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [29, 78, 216] }
    })
    doc.save('pulbek-tranzaksiyalar.pdf')
    setExportModal(false)
  }

  const exportExcel = () => {
    const data = filtered.map(t => ({
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
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Kirim / Chiqim</h1>
          <div className="flex gap-2">
            <button onClick={() => setExportModal(true)} className="p-2 rounded-xl bg-dark-700 text-gray-400 active:opacity-70">
              <Download size={18} />
            </button>
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
      </div>

      <div className="flex-1 px-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-gray-500">Hech narsa topilmadi</p>
          </div>
        ) : (
          filtered.map(t => {
            const showDelete = isFamily ? canEdit(t.userId) : true
            const canEditTx = !isFamily
            return (
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
                      {t.note ? `${t.note} · ` : ''}{format(new Date(t.date), 'dd.MM.yyyy')}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)} {t.currency || 'UZS'}
                  </p>
                </div>
              </SwipeableRow>
            )
          })
        )}
      </div>

      {(!isFamily || canAdd()) && (
        <div className="fixed bottom-20 right-4 flex flex-col gap-2">
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
              <button onClick={() => setEditingTx(tx => ({ ...tx, type: 'income', category: INCOME_CATEGORIES[0] }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editingTx.type === 'income' ? 'bg-green-500 text-white' : 'bg-dark-600 text-gray-400'}`}>Kirim</button>
              <button onClick={() => setEditingTx(tx => ({ ...tx, type: 'expense', category: EXPENSE_CATEGORIES[0] }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editingTx.type === 'expense' ? 'bg-red-500 text-white' : 'bg-dark-600 text-gray-400'}`}>Chiqim</button>
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
                {(editingTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
              <input className="input-field" placeholder="Izoh..." value={editingTx.note || ''} onChange={e => setEditingTx(t => ({ ...t, note: e.target.value }))} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sana</label>
              <input className="input-field" type="date" value={editingTx.date} onChange={e => setEditingTx(t => ({ ...t, date: e.target.value }))} />
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
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          {isFamily && (
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
