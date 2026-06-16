import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Search, TrendingUp, TrendingDown, Users, Download, AlertTriangle } from 'lucide-react'
import { useApp, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../store/AppContext'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { generateId } from '../store/storage'
import { addFamilyTransaction, deleteFamilyTransaction } from '../store/family'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { fmtCur } from '../utils/format'

const EMOJIS = { income: '💰', expense: '💸' }
const fmt = (n, cur) => fmtCur(n, cur)

const CATEGORY_EMOJIS = {
  'Maosh': '💼', 'Biznes': '🏢', 'Freelance': '💻', 'Investitsiya': '📈', 'Sovg\'a': '🎁', 'Boshqa kirim': '💰',
  'Oziq-ovqat': '🍕', 'Transport': '🚗', 'Uy-joy': '🏠', 'Kiyim': '👕', 'Sog\'liq': '💊', 'Ta\'lim': '📚',
  'Ko\'ngilochar': '🎮', 'Kommunal': '💡', 'Telefon/Internet': '📱', 'Boshqa chiqim': '💸'
}

const defaultForm = { type: 'expense', amount: '', category: '', currency: 'UZS', note: '', date: new Date().toISOString().split('T')[0] }

export default function Transactions() {
  const { transactions, saveTransactions, softDeleteTransactions, user, family, familyTransactions, familyMembers, canEdit, canAdd, refreshFamily, getCurrencyBalance } = useApp()
  const nav = useNavigate()
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, isFamily, label }
  const [familyMode, setFamilyMode] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [balanceError, setBalanceError] = useState('')
  const [customCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_${user?.id}_categories`)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = (type = 'expense') => {
    const cats = customCategories || []
    if (cats.length === 0) {
      nav('/categories')
      return
    }
    setForm({ ...defaultForm, type, category: cats[0] || '' })
    setModal(true)
  }

  const handleSave = () => {
    if (!form.amount || !form.category) return
    setBalanceError('')
    if (form.type === 'expense') {
      const curBal = getCurrencyBalance(form.currency || 'UZS')
      if (parseFloat(form.amount) > curBal) {
        setBalanceError(`Yetarli mablag' yo'q. ${form.currency || 'UZS'} balansi: ${new Intl.NumberFormat('uz-UZ').format(Math.round(curBal))}`)
        return
      }
    }
    const t = {
      id: generateId(),
      ...form,
      amount: parseFloat(form.amount),
      emoji: CATEGORY_EMOJIS[form.category] || EMOJIS[form.type],
      userId: user.id,
      userName: user.name
    }
    if (familyMode && family) {
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
    const tx = (familyMode && family ? familyTransactions : transactions).find(t => t.id === id)
    setDeleteConfirm({ id, isFamily, label: tx?.category || '' })
  }

  const confirmDelete = () => {
    if (!deleteConfirm) return
    const { id, isFamily } = deleteConfirm
    if (isFamily && family) {
      deleteFamilyTransaction(family.id, id).then(() => refreshFamily())
    } else {
      softDeleteTransactions([id])
    }
    setDeleteConfirm(null)
  }

  const activeList = (familyMode && family ? familyTransactions : transactions)
    .filter(t => t.category !== 'Valyuta ayirboshlash')

  const filtered = activeList
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !search || t.category.toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const categories = customCategories || (form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

  const getMemberName = (userId) => {
    const m = familyMembers.find(m => m.userId === userId)
    return m?.fullName || m?.username || 'Noma\'lum'
  }

  const buildPDF = async (list, filename) => {
    const currencies = [...new Set(list.map(t => t.currency || 'UZS'))]
    const totalsHtml = currencies.map(cur => {
      const income = list.filter(t => t.type === 'income' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
      const expense = list.filter(t => t.type === 'expense' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
      return `${income > 0 ? `<div>Kirim (${cur}): <span style="color:#16a34a">+${fmt(income, cur)}</span></div>` : ''}
              ${expense > 0 ? `<div>Chiqim (${cur}): <span style="color:#dc2626">-${fmt(expense, cur)}</span></div>` : ''}`
    }).join('')

    const rows = list.map(t => `
      <tr>
        <td>${format(new Date(t.date), 'dd.MM.yyyy')}</td>
        <td style="color:${t.type === 'income' ? '#16a34a' : '#dc2626'}">${t.type === 'income' ? 'Kirim' : 'Chiqim'}</td>
        <td>${t.category}</td>
        <td>${fmt(t.amount, t.currency || 'UZS')}</td>
        <td>${t.currency || 'UZS'}</td>
        <td>${t.note || ''}</td>
      </tr>`).join('')

    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;padding:40px;font-family:Arial,sans-serif;font-size:13px;color:#111;line-height:1.5'
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <div style="font-size:20px;font-weight:bold;margin-bottom:4px">PulBek — Tranzaksiyalar</div>
          <div style="color:#555;font-size:12px">Chop etilgan: ${format(new Date(), 'dd.MM.yyyy')} &nbsp;·&nbsp; Jami: ${list.length} ta operatsiya</div>
        </div>
        <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#b8860b">by KAFTIMDA</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1d4ed8;color:#fff">
            <th style="padding:8px 6px;text-align:left">Sana</th>
            <th style="padding:8px 6px;text-align:left">Tur</th>
            <th style="padding:8px 6px;text-align:left">Kategoriya</th>
            <th style="padding:8px 6px;text-align:right">Miqdor</th>
            <th style="padding:8px 6px;text-align:left">Valyuta</th>
            <th style="padding:8px 6px;text-align:left">Izoh</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((t, i) => `
          <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
            <td style="padding:7px 6px;border-bottom:1px solid #e5e7eb">${format(new Date(t.date), 'dd.MM.yyyy')}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #e5e7eb;color:${t.type === 'income' ? '#16a34a' : '#dc2626'}">${t.type === 'income' ? 'Kirim' : 'Chiqim'}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #e5e7eb">${t.category}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(t.amount, t.currency || 'UZS')}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #e5e7eb">${t.currency || 'UZS'}</td>
            <td style="padding:7px 6px;border-bottom:1px solid #e5e7eb">${t.note || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;font-size:12px"><strong>Umumiy:</strong>${totalsHtml}</div>`

    document.body.appendChild(el)
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    document.body.removeChild(el)

    const imgData = canvas.toDataURL('image/png')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const imgH = (canvas.height * pageW) / canvas.width
    let y = 0
    while (y < imgH) {
      if (y > 0) doc.addPage()
      doc.addImage(imgData, 'PNG', 0, -y, pageW, imgH)
      y += pageH
    }
    doc.save(filename)
    setExportModal(false)
  }

  const exportPDF = () => buildPDF(filtered, 'pulbek-tranzaksiyalar.pdf')

  const exportExcel = () => {
    const header = [['by KAFTIMDA', '', '', '', '', ''], ['PulBek - Tranzaksiyalar', '', '', '', '', ''], [`Chop etilgan: ${format(new Date(), 'dd.MM.yyyy')}`, '', '', '', '', ''], []]
    const rows = filtered.map(t => [
      format(new Date(t.date), 'dd.MM.yyyy'),
      t.type === 'income' ? 'Kirim' : 'Chiqim',
      t.category,
      t.amount,
      t.currency || 'UZS',
      t.note || ''
    ])
    const ws = XLSX.utils.aoa_to_sheet([...header, ['Sana', 'Tur', 'Kategoriya', 'Miqdor', 'Valyuta', 'Izoh'], ...rows])
    ws['A1'] = { v: 'by KAFTIMDA', t: 's' }
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
            {family && (
              <button
                onClick={() => setFamilyMode(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${familyMode ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-600 text-gray-400'}`}
              >
                <Users size={14} />
                Oila
              </button>
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
      </div>

      <div className="flex-1 px-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-gray-500">Hech narsa topilmadi</p>
          </div>
        ) : (
          filtered.map(t => {
            const isFamily = familyMode && family
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
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency || 'UZS')} {t.currency || 'UZS'}
                  </p>
                </div>
              </SwipeableRow>
            )
          })
        )}
      </div>

      {(!familyMode || canAdd()) && (
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

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="O'chirishni tasdiqlang">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
            <AlertTriangle size={20} className="text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">{deleteConfirm?.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">O'chirilgan tranzaksiya 30 kun ichida tiklanishi mumkin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-dark-600 text-gray-300 text-sm font-medium">Bekor qilish</button>
            <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium">O'chirish</button>
          </div>
        </div>
      </Modal>

      <Modal open={modal} onClose={() => { setModal(false); setBalanceError('') }} title={form.type === 'income' ? 'Kirim qo\'shish' : 'Chiqim qo\'shish'}>
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
          {familyMode && family && (
            <p className="text-purple-400 text-xs bg-purple-500/10 py-2 px-3 rounded-lg">
              Bu tranzaksiya oilaviy rejimga saqlanadi
            </p>
          )}
          {balanceError && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{balanceError}</p>}
          <button onClick={handleSave} className="btn-primary mt-2">Saqlash</button>
        </div>
      </Modal>
    </div>
  )
}
