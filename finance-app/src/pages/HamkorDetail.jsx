import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, CreditCard, Trash2, Package, Wrench, Banknote, Pencil, ArchiveRestore, Archive, FileDown, Sheet } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { generateId } from '../store/storage'
import { calcDebt, calcDebtByCurrency, archiveEntry, getArchive, restoreEntry, deleteFromArchive, getPartners, savePartners } from '../store/hamkorlar'
import { fmtCur } from '../utils/format'
import { formatDistanceToNow, format } from 'date-fns'
import { uz } from 'date-fns/locale'
import * as XLSX from 'xlsx'

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const UNITS = ['kg', 'g', 'tonna', 'litr', 'ml', 'dona', 'm', 'm²', 'm³']
const today = () => new Date().toISOString().split('T')[0]

export default function HamkorDetail() {
  const { sectionId, id } = useParams()
  const nav = useNavigate()
  const { user, saveTransactions, transactions, family, familyMembers } = useApp()
  const uid = user?.id

  // Admin check: no family = always admin; family = must be admin role
  const isAdmin = !family || familyMembers.find(m => m.userId === uid)?.role === 'admin'

  const [hamkor, setHamkor] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [addTab, setAddTab] = useState('xomashyo')
  const [payModal, setPayModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [showArchive, setShowArchive] = useState(false)
  const [archive, setArchive] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [xForm, setXForm] = useState({ name: '', qty: '', unit: 'kg', price: '', note: '', date: today(), currency: 'UZS' })
  const [zForm, setZForm] = useState({ amount: '', note: '', date: today(), currency: 'UZS' })
  const [tForm, setTForm] = useState({ amount: '', note: '', date: today(), currency: 'UZS' })
  const [tConvert, setTConvert] = useState(false) // boshqa valyutada hisoblash
  const [tConvCurrency, setTConvCurrency] = useState('USD')
  const [tConvRate, setTConvRate] = useState('')

  const load = () => {
    const all = getPartners(uid)
    setHamkor(all.find(h => h.id === id) || null)
    setArchive(getArchive(uid).filter(a => a.hamkorId === id))
  }

  useEffect(() => { if (uid) load() }, [uid, id])

  const updateEntries = (newEntry) => {
    const all = getPartners(uid)
    savePartners(uid, all.map(h =>
      h.id === id ? { ...h, entries: [...(h.entries || []), newEntry] } : h
    ))
    load()
  }

  const handleAddXomashyo = () => {
    if (!xForm.name || !xForm.qty || !xForm.price) return
    const qty = parseFloat(xForm.qty), price = parseFloat(xForm.price)
    updateEntries({ id: generateId(), entryType: 'xomashyo', ...xForm, qty, price, totalPrice: qty * price, createdAt: new Date().toISOString() })
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
    const paidAmount = parseFloat(tForm.amount)

    // Hamkor qarzidan ayiriladigan summa
    let debtAmount, debtCurrency
    if (tConvert && tConvRate && parseFloat(tConvRate) > 0) {
      // Konvertatsiya: men UZS berdim, hamkor qarzidan USD (yoki boshqa) ayiriladi
      debtAmount = paidAmount / parseFloat(tConvRate)
      debtCurrency = tConvCurrency
    } else {
      debtAmount = paidAmount
      debtCurrency = tForm.currency
    }

    updateEntries({
      id: generateId(), entryType: 'tolov',
      amount: debtAmount, currency: debtCurrency,
      note: tForm.note, date: tForm.date,
      // Haqiqiy to'lov ma'lumoti
      paidAmount, paidCurrency: tForm.currency,
      createdAt: new Date().toISOString()
    })
    saveTransactions([{
      id: generateId(), type: 'expense',
      amount: paidAmount, currency: tForm.currency,
      category: 'Hamkorlar', emoji: '🤝',
      note: `${hamkor?.name} ga to'lov${tForm.note ? ': ' + tForm.note : ''}`,
      date: tForm.date, userId: uid, userName: user?.name,
    }, ...transactions])
    setTForm({ amount: '', note: '', date: today(), currency: 'UZS' })
    setTConvert(false); setTConvRate(''); setTConvCurrency('USD')
    setPayModal(false)
  }

  const filterEntries = (entries) => {
    return entries.filter(e => {
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo && e.date > dateTo) return false
      return true
    })
  }

  const entryRow = (e) => {
    const type = e.entryType === 'xomashyo' ? 'Xomashyo' : e.entryType === 'xizmat' ? 'Xizmat haqi' : "To'lov"
    const desc = e.entryType === 'xomashyo'
      ? `${e.name} ${e.qty} ${e.unit} × ${e.price}`
      : (e.note || '')
    const amount = e.entryType === 'xomashyo' ? e.totalPrice : e.amount
    const sign = e.entryType === 'tolov' ? '-' : '+'
    return { type, desc, amount: `${sign}${fmtCur(amount, e.currency)}`, date: e.date, currency: e.currency }
  }

  const exportPDF = (entries) => {
    const period = dateFrom || dateTo ? `${dateFrom || '...'} — ${dateTo || '...'}` : 'Barcha davr'
    const debtVal = calcDebt(entries)
    const rows = entries.map(e => {
      const r = entryRow(e)
      return `<tr>
        <td>${r.date}</td>
        <td>${r.type}</td>
        <td>${r.desc}</td>
        <td style="text-align:right;font-weight:600;color:${e.entryType === 'tolov' ? '#16a34a' : '#dc2626'}">${r.amount}</td>
      </tr>`
    }).join('')

    const debtByCurAll = calcDebtByCurrency(entries)
    const activeDebts = debtByCurAll.filter(d => d.val > 0)
    const debtColor = activeDebts.length > 0 ? '#dc2626' : '#16a34a'
    const debtText = activeDebts.length > 0
      ? activeDebts.map(({ cur, val }) => `${fmtCur(val, cur)} ${cur}`).join(' + ')
      : "To'liq to'langan ✓"

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${hamkor.name} hisobot</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Roboto, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }

      .header {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%);
        padding: 32px 48px 36px;
        position: relative;
        overflow: hidden;
      }
      .header::before {
        content: '';
        position: absolute;
        top: -60px; right: -60px;
        width: 200px; height: 200px;
        background: rgba(255,255,255,0.04);
        border-radius: 50%;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 18px;
        margin-bottom: 22px;
        position: relative;
        z-index: 1;
      }
      .brand { display: flex; align-items: center; gap: 12px; }
      .brand-icon {
        width: 40px; height: 40px;
        background: linear-gradient(135deg, #ffd700, #b8860b);
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
      }
      .brand-name { font-size: 20px; font-weight: 900; color: #ffd700; letter-spacing: 2px; line-height: 1; }
      .brand-sub { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px; margin-top: 2px; }
      .contact { text-align: right; }
      .contact div { font-size: 12px; color: rgba(255,255,255,0.75); margin-bottom: 4px; }

      .title-row { display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; }
      .title { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
      .subtitle { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }
      .meta-right { text-align: right; }
      .meta-right div { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 2px; }

      .summary-card {
        margin: 28px 48px 0;
        display: flex;
        gap: 12px;
      }
      .card {
        flex: 1;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 16px 20px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .card-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
      .card-value { font-size: 18px; font-weight: 800; }

      .content { padding: 32px 48px 24px; }
      .section-title {
        font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; color: #64748b; margin-bottom: 12px;
      }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      thead tr { background: #f1f5f9; }
      th { padding: 11px 14px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
      td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) td { background: #f8fafc; }

      .footer {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
        padding: 18px 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 32px;
      }
      .footer-brand { font-size: 11px; font-weight: 900; letter-spacing: 4px; color: #ffd700; text-transform: uppercase; margin-bottom: 3px; }
      .footer-tagline { font-size: 11px; color: rgba(255,255,255,0.5); font-style: italic; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>

    <div class="header">
      <div class="topbar">
        <div class="brand">
          <div class="brand-icon">💰</div>
          <div>
            <div class="brand-name">KAFTIMDA</div>
            <div class="brand-sub">PulBek · Moliya ilovasi</div>
          </div>
        </div>
        <div class="contact">
          <div>📧 kaftimda@gmail.com</div>
          <div>📞 +998 91 760 66 66</div>
        </div>
      </div>
      <div class="title-row">
        <div>
          <div class="title">${hamkor.name}</div>
          <div class="subtitle">Hamkor hisoboti · Davr: ${period}</div>
        </div>
        <div class="meta-right">
          <div>${format(new Date(), 'dd.MM.yyyy HH:mm')}</div>
          <div>${entries.length} ta yozuv</div>
        </div>
      </div>
    </div>

    <div class="summary-card">
      <div class="card">
        <div class="card-label">Jami qarz holati</div>
        <div class="card-value" style="color:${debtColor}">${debtText}</div>
      </div>
      <div class="card">
        <div class="card-label">Jami yozuvlar</div>
        <div class="card-value" style="color:#1e40af">${entries.length} ta</div>
      </div>
    </div>

    <div class="content">
      <div class="section-title">Operatsiyalar tarixi</div>
      <table>
        <thead><tr><th>Sana</th><th>Tur</th><th>Izoh</th><th style="text-align:right">Summa</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="footer">
      <div style="text-align:center">
        <div class="footer-brand">✦ KAFTIMDA ✦</div>
        <div class="footer-tagline">KAFTIMDA bilan biznesingiz kaftingizda</div>
      </div>
    </div>

    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  const exportExcel = (entries) => {
    const rows = entries.map(e => {
      const r = entryRow(e)
      return { 'Sana': r.date, 'Tur': r.type, 'Izoh': r.desc, 'Summa': r.amount, 'Valyuta': r.currency }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, hamkor.name.slice(0, 30))
    XLSX.writeFile(wb, `${hamkor.name}_hisobot.xlsx`)
  }

  // Edit entry
  const openEdit = (entry) => {
    setEditingEntry({ ...entry })
  }

  const handleEditSave = () => {
    if (!editingEntry) return
    const e = editingEntry
    const updated = { ...e }
    if (e.entryType === 'xomashyo') {
      updated.qty = parseFloat(e.qty)
      updated.price = parseFloat(e.price)
      updated.totalPrice = updated.qty * updated.price
    } else {
      updated.amount = parseFloat(e.amount)
    }
    const all = getPartners(uid)
    savePartners(uid, all.map(h =>
      h.id === id ? { ...h, entries: (h.entries || []).map(en => en.id === updated.id ? updated : en) } : h
    ))
    setEditingEntry(null)
    load()
  }

  // Delete (archive)
  const handleDeleteEntry = (entry) => {
    archiveEntry(uid, id, hamkor?.name, sectionId, entry)
    const all = getPartners(uid)
    savePartners(uid, all.map(h =>
      h.id === id ? { ...h, entries: (h.entries || []).filter(e => e.id !== entry.id) } : h
    ))
    load()
  }

  const handleRestoreEntry = (archiveId) => {
    restoreEntry(uid, archiveId)
    load()
  }

  const handleDeleteFromArchive = (archiveId) => {
    deleteFromArchive(uid, archiveId)
    load()
  }

  const handleDeleteHamkor = () => {
    const all = getPartners(uid)
    savePartners(uid, all.filter(h => h.id !== id))
    nav(`/hamkorlar/${sectionId}`)
  }

  if (!hamkor) return null

  const allEntries = [...(hamkor.entries || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const sortedEntries = filterEntries(allEntries)
  const debt = calcDebt(sortedEntries)
  const debtByCur = calcDebtByCurrency(sortedEntries)

  const entryLabel = (e) => {
    if (e.entryType === 'xomashyo') return `${e.name} — ${e.qty} ${e.unit} × ${fmtCur(e.price, e.currency)} = ${fmtCur(e.totalPrice, e.currency)}`
    if (e.entryType === 'xizmat') return `Xizmat haqi${e.note ? ': ' + e.note : ''}`
    if (e.entryType === 'tolov') {
      if (e.paidCurrency && e.paidCurrency !== e.currency) {
        return `To'lov: ${fmtCur(e.paidAmount, e.paidCurrency)} → ${fmtCur(e.amount, e.currency)}${e.note ? ' · ' + e.note : ''}`
      }
      return `To'lov${e.note ? ': ' + e.note : ''}`
    }
    return ''
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => nav(`/hamkorlar/${sectionId}`)} className="text-gray-400 active:text-white">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-bold text-white flex-1 truncate">{hamkor.name}</h1>
            {isAdmin && (
              <>
                <button onClick={() => setShowArchive(v => !v)} className={`p-1 ${showArchive ? 'text-orange-400' : 'text-gray-500'} active:opacity-70`} title="Arxiv">
                  <Archive size={18} />
                </button>
                <button onClick={() => setDeleteConfirm(true)} className="text-gray-500 active:text-red-400 p-1">
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>

          {/* Debt badge */}
          <div className={`rounded-2xl p-4 ${debt > 0 ? 'bg-red-500/15 border border-red-500/20' : 'bg-green-500/15 border border-green-500/20'}`}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Umumiy qarz</p>
            {debtByCur.filter(d => d.val > 0).length > 0 ? (
              debtByCur.filter(d => d.val > 0).map(({ cur, val }) => (
                <p key={cur} className="text-2xl font-black text-red-400 leading-tight">
                  {fmtCur(val, cur)} <span className="text-sm font-medium opacity-70">{cur}</span>
                </p>
              ))
            ) : (
              <p className="text-2xl font-black text-green-400">Qarz yo'q</p>
            )}
          </div>
        </div>

        {/* Davr filtri + Export */}
        <div className="px-4 mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input type="date" className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 outline-none text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 outline-none text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportPDF(sortedEntries)} className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl py-2.5 text-sm font-medium active:opacity-70">
              <FileDown size={15} /> PDF
            </button>
            <button onClick={() => exportExcel(sortedEntries)} className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-xl py-2.5 text-sm font-medium active:opacity-70">
              <Sheet size={15} /> Excel
            </button>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="px-3 bg-gray-700 text-gray-400 rounded-xl text-sm active:opacity-70">
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="px-4 mt-1 flex flex-col gap-2">
          {/* Archive view */}
          {showArchive && (
            <div className="mb-2">
              <p className="text-orange-400 text-sm font-semibold mb-2">🗃 Arxiv ({archive.length} ta)</p>
              {archive.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Arxiv bo'sh</p>}
              {archive.map(a => (
                <div key={a.id} className="bg-gray-800/60 border border-orange-500/20 rounded-2xl px-4 py-3 flex items-center gap-3 mb-2 opacity-70">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-sm">{entryLabel(a)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      O'chirildi: {formatDistanceToNow(new Date(a.deletedAt), { addSuffix: true, locale: uz })}
                    </p>
                  </div>
                  <button onClick={() => handleRestoreEntry(a.id)} className="text-green-400 active:opacity-70 p-1" title="Tiklash">
                    <ArchiveRestore size={16} />
                  </button>
                  <button onClick={() => handleDeleteFromArchive(a.id)} className="text-red-400 active:opacity-70 p-1" title="Butunlay o'chirish">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active entries */}
          {sortedEntries.length === 0 && !showArchive && (
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
                    e.entryType === 'xomashyo' ? e.totalPrice : e.amount, e.currency
                  )}
                </p>
                {isAdmin && (
                  <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => openEdit(e)} className="text-gray-500 active:text-blue-400">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDeleteEntry(e)} className="text-gray-600 active:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FABs */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2">
        <button onClick={() => setPayModal(true)}
          className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="To'lov">
          <CreditCard size={20} className="text-white" />
        </button>
        <button onClick={() => setAddModal(true)}
          className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Qo'shish">
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* Add entry modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Qo'shish">
        <div className="flex gap-2 mb-1">
          <button onClick={() => setAddTab('xomashyo')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${addTab === 'xomashyo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            📦 Xomashyo
          </button>
          <button onClick={() => setAddTab('xizmat')} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${addTab === 'xizmat' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            🔧 Xizmat haqi
          </button>
        </div>
        {addTab === 'xomashyo' ? (
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
                Jami: {fmtCur(parseFloat(xForm.qty) * parseFloat(xForm.price), xForm.currency)}
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

      {/* Edit modal */}
      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Tahrirlash">
        {editingEntry && (
          <div className="flex flex-col gap-3">
            {editingEntry.entryType === 'xomashyo' && (
              <>
                <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Xomashyo nomi *" value={editingEntry.name} onChange={e => setEditingEntry(v => ({ ...v, name: e.target.value }))} />
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Miqdor *" type="number" value={editingEntry.qty} onChange={e => setEditingEntry(v => ({ ...v, qty: e.target.value }))} />
                  <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={editingEntry.unit} onChange={e => setEditingEntry(v => ({ ...v, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Narx *" type="number" value={editingEntry.price} onChange={e => setEditingEntry(v => ({ ...v, price: e.target.value }))} />
                  <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={editingEntry.currency} onChange={e => setEditingEntry(v => ({ ...v, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {editingEntry.qty && editingEntry.price && (
                  <p className="text-blue-400 text-sm text-center font-semibold">
                    Jami: {fmtCur(parseFloat(editingEntry.qty) * parseFloat(editingEntry.price), editingEntry.currency)}
                  </p>
                )}
              </>
            )}
            {(editingEntry.entryType === 'xizmat' || editingEntry.entryType === 'tolov') && (
              <div className="flex gap-2">
                <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Summa *" type="number" value={editingEntry.amount} onChange={e => setEditingEntry(v => ({ ...v, amount: e.target.value }))} />
                <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={editingEntry.currency} onChange={e => setEditingEntry(v => ({ ...v, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Izoh" value={editingEntry.note || ''} onChange={e => setEditingEntry(v => ({ ...v, note: e.target.value }))} />
            <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" type="date" value={editingEntry.date} onChange={e => setEditingEntry(v => ({ ...v, date: e.target.value }))} />
            <button onClick={handleEditSave} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">Saqlash</button>
          </div>
        )}
      </Modal>

      {/* To'lov modal */}
      <Modal open={payModal} onClose={() => { setPayModal(false); setTConvert(false); setTConvRate(''); }} title="To'lov qilish">
        <div className="flex flex-col gap-3">
          {/* Asosiy to'lov */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Men to'layman</label>
            <div className="flex gap-2">
              <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Summa *" type="number" value={tForm.amount} onChange={e => setTForm(f => ({ ...f, amount: e.target.value }))} />
              <select className="bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" value={tForm.currency} onChange={e => setTForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Konvertatsiya toggle */}
          <button
            onClick={() => setTConvert(v => !v)}
            className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors ${tConvert ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-gray-700/50 border-gray-600 text-gray-400'}`}
          >
            {tConvert ? '✓' : '+'} Boshqa valyutada hisoblash
          </button>

          {/* Konvertatsiya fields */}
          {tConvert && (
            <div className="bg-gray-700/50 rounded-xl p-3 flex flex-col gap-2">
              <label className="text-gray-400 text-xs">Hamkor qarzidan ayiriladi</label>
              <div className="flex gap-2">
                <select className="bg-gray-700 text-white rounded-xl px-3 py-2.5 outline-none" value={tConvCurrency} onChange={e => setTConvCurrency(e.target.value)}>
                  {CURRENCIES.filter(c => c !== tForm.currency).map(c => <option key={c}>{c}</option>)}
                </select>
                <input className="flex-1 bg-gray-700 text-white rounded-xl px-3 py-2.5 outline-none" placeholder={`1 ${tConvCurrency} = ? ${tForm.currency}`} type="number" value={tConvRate} onChange={e => setTConvRate(e.target.value)} />
              </div>
              {tForm.amount && tConvRate && parseFloat(tConvRate) > 0 && (
                <p className="text-blue-400 text-sm font-semibold text-center">
                  = {fmtCur(parseFloat(tForm.amount) / parseFloat(tConvRate), tConvCurrency)} hamkor qarzidan ayiriladi
                </p>
              )}
            </div>
          )}

          <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" placeholder="Izoh (ixtiyoriy)" value={tForm.note} onChange={e => setTForm(f => ({ ...f, note: e.target.value }))} />
          <input className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none" type="date" value={tForm.date} onChange={e => setTForm(f => ({ ...f, date: e.target.value }))} />
          <p className="text-gray-400 text-xs text-center">To'lov hisobingizdan chiqim sifatida yoziladi</p>
          <button onClick={handleTolov} className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold">To'lov qilish</button>
        </div>
      </Modal>

      {/* Delete hamkor confirm */}
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Hamkorni o'chirish">
        <p className="text-gray-300 mb-4">"{hamkor.name}" ni barcha ma'lumotlari bilan o'chirasizmi?</p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteConfirm(false)} className="flex-1 bg-gray-700 text-white rounded-xl py-3">Bekor</button>
          <button onClick={handleDeleteHamkor} className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold">O'chirish</button>
        </div>
      </Modal>
    </div>
  )
}
