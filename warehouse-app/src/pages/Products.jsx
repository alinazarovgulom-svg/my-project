import { useState, useRef, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum } from '../utils/format'
import { generateId } from '../store/storage'
import { DEFAULT_CATEGORIES, UNITS } from '../store/AppContext'
import { downloadTemplate, parseExcelFile } from '../utils/excelImport'
import { addLogEntry } from '../store/auditLog'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import {
  Package, Plus, Search, FileSpreadsheet,
  Download, Upload, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Camera, X
} from 'lucide-react'

const emptyForm = () => ({
  name: '', category: DEFAULT_CATEGORIES[0], unit: 'dona',
  purchasePrice: '', salePrice: '', minStock: '', barcode: '', note: '', image: ''
})

const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const MAX = 600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
})

export default function Products() {
  const { products, saveProducts, user } = useApp()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)

  // Import holati
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { products, errors }
  const [showErrors, setShowErrors] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  const handleImageChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setForm(f => ({ ...f, image: compressed }))
    e.target.value = ''
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setModalOpen(true) }
  const openEdit = (p) => {
    setForm({
      name: p.name, category: p.category, unit: p.unit,
      purchasePrice: p.purchasePrice, salePrice: p.salePrice,
      minStock: p.minStock || '', barcode: p.barcode || '', note: p.note || '',
      image: p.image || ''
    })
    setEditId(p.id); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (editId) {
      saveProducts(products.map(p => p.id === editId ? {
        ...p, ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        minStock: Number(form.minStock) || 0,
        image: form.image || p.image || ''
      } : p))
      await addLogEntry(user?.id, {
        action: 'mahsulot_tahrirlandi',
        userId: user?.id,
        userName: user?.fullName || user?.username,
        productId: editId,
        productName: form.name
      })
    } else {
      const newProduct = {
        id: generateId(), ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        minStock: Number(form.minStock) || 0,
        createdAt: new Date().toISOString(),
        userId: user?.id
      }
      saveProducts([...products, newProduct])
      await addLogEntry(user?.id, {
        action: 'mahsulot_qoshildi',
        userId: user?.id,
        userName: user?.fullName || user?.username,
        productId: newProduct.id,
        productName: newProduct.name,
        price: newProduct.purchasePrice
      })
    }
    setModalOpen(false)
  }

  const handleDelete = async (id) => {
    if (!confirm(t('deleteConfirm'))) return
    const prod = products.find(p => p.id === id)
    saveProducts(products.filter(p => p.id !== id))
    await addLogEntry(user?.id, {
      action: 'mahsulot_ochirildi',
      userId: user?.id,
      userName: user?.fullName || user?.username,
      productId: id,
      productName: prod?.name || ''
    })
  }

  // --- Import ---
  const openImport = () => {
    setImportResult(null)
    setImportDone(false)
    setShowErrors(false)
    setImportModal(true)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setImportDone(false)
    try {
      const result = await parseExcelFile(file, user?.id)
      setImportResult(result)
    } catch (err) {
      setImportResult({ products: [], errors: [err.message] })
    }
    setImporting(false)
    e.target.value = ''
  }

  const handleImportConfirm = async () => {
    if (!importResult?.products?.length) return
    const existingNames = new Set(products.map(p => p.name.toLowerCase()))
    const newOnes = importResult.products.filter(p => !existingNames.has(p.name.toLowerCase()))
    const duplicates = importResult.products.length - newOnes.length
    saveProducts([...products, ...newOnes])
    await addLogEntry(user?.id, {
      action: 'excel_import',
      userId: user?.id,
      userName: user?.fullName || user?.username,
      count: newOnes.length,
      productName: `${newOnes.length} ta mahsulot import qilindi`
    })
    setImportDone(true)
    setImportResult(r => ({ ...r, duplicates, imported: newOnes.length }))
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-white text-xl font-bold">{t('products')}</h1>
          <div className="flex items-center gap-2">
            <button onClick={openImport}
              className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-primary-400" />
            </button>
            <button onClick={openAdd}
              className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Plus size={20} className="text-white" />
            </button>
          </div>
        </div>
        <p className="text-slate-500 text-xs">{products.length} ta mahsulot</p>
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
            {!search && (
              <div className="flex gap-3 mt-4">
                <button onClick={openAdd}
                  className="px-5 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium">
                  {t('addProduct')}
                </button>
                <button onClick={openImport}
                  className="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm font-medium flex items-center gap-2">
                  <FileSpreadsheet size={14} /> Excel import
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(p => (
              <SwipeableRow key={p.id} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)}>
                <div className="bg-slate-800/60 rounded-xl px-4 py-3.5 border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      : <div className="w-12 h-12 rounded-xl bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                          <Package size={20} className="text-slate-500" />
                        </div>
                    }
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{p.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{p.category} · {p.unit}</p>
                        {p.minStock > 0 && <p className="text-slate-500 text-xs mt-0.5">Min: {p.minStock} {p.unit}</p>}
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-primary-400 text-sm font-semibold">{fmtNum(p.purchasePrice)} so'm</p>
                        {p.salePrice > 0 && <p className="text-slate-400 text-xs">{fmtNum(p.salePrice)} so'm</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      {/* Mahsulot qo'shish / tahrirlash modali */}
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

          {/* Rasm */}
          <input ref={imageRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          {form.image ? (
            <div className="relative">
              <img src={form.image} alt="preview" className="w-full h-40 object-cover rounded-xl" />
              <button onClick={() => setForm(f => ({ ...f, image: '' }))}
                className="absolute top-2 right-2 w-7 h-7 bg-slate-900/80 rounded-full flex items-center justify-center">
                <X size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => imageRef.current?.click()}
              className="w-full flex items-center gap-3 bg-slate-800/60 border border-dashed border-slate-600 rounded-xl px-4 py-3 active:scale-95 transition-all">
              <Camera size={18} className="text-slate-400" />
              <span className="text-slate-400 text-sm">Rasm qo'shish (ixtiyoriy)</span>
            </button>
          )}

          <button onClick={handleSave}
            className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all">
            {t('save')}
          </button>
        </div>
      </Modal>

      {/* Excel import modali */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Excel import">
        <div className="space-y-4 pb-4">

          {/* Shablon yuklab olish */}
          <button onClick={downloadTemplate}
            className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3.5 active:scale-95 transition-all">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-primary-400" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-medium">Shablon yuklab olish</p>
              <p className="text-slate-400 text-xs">Excel shablonni oching va to'ldiring</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">keyin</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Fayl yuklash */}
          <input ref={fileRef} type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden" />

          {!importResult && !importing && (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 bg-primary-500/10 border-2 border-dashed border-primary-500/30 rounded-xl px-4 py-5 active:scale-95 transition-all">
              <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Upload size={18} className="text-primary-400" />
              </div>
              <div className="text-left">
                <p className="text-primary-400 text-sm font-medium">Excel fayl yuklash</p>
                <p className="text-slate-400 text-xs">.xlsx, .xls yoki .csv</p>
              </div>
            </button>
          )}

          {importing && (
            <div className="flex items-center justify-center gap-3 py-6">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 text-sm">O'qilmoqda...</p>
            </div>
          )}

          {/* Natija */}
          {importResult && !importDone && (
            <div className="space-y-3">
              {/* Muvaffaqiyatli */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-primary-400" />
                  <span className="text-white text-sm">Tayyor mahsulotlar</span>
                </div>
                <span className="text-primary-400 font-bold text-lg">{importResult.products.length}</span>
              </div>

              {/* Xatolar */}
              {importResult.errors.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl overflow-hidden">
                  <button onClick={() => setShowErrors(s => !s)}
                    className="w-full px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-amber-400" />
                      <span className="text-white text-sm">Xatolar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{importResult.errors.length}</span>
                      {showErrors ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>
                  {showErrors && (
                    <div className="border-t border-amber-500/20 px-4 py-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-amber-300 text-xs flex items-start gap-2">
                          <XCircle size={12} className="flex-shrink-0 mt-0.5" /> {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview — birinchi 3 ta */}
              {importResult.products.length > 0 && (
                <div className="bg-slate-800/40 rounded-xl overflow-hidden">
                  <p className="text-slate-400 text-xs px-4 py-2 border-b border-slate-700/50">Ko'rinish (dastlabki 3 ta)</p>
                  {importResult.products.slice(0, 3).map((p, i) => (
                    <div key={i} className={`px-4 py-2.5 flex justify-between items-center ${i > 0 ? 'border-t border-slate-700/30' : ''}`}>
                      <div>
                        <p className="text-white text-sm">{p.name}</p>
                        <p className="text-slate-400 text-xs">{p.category} · {p.unit}</p>
                      </div>
                      <p className="text-primary-400 text-sm font-medium">{fmtNum(p.purchasePrice)} so'm</p>
                    </div>
                  ))}
                  {importResult.products.length > 3 && (
                    <p className="text-slate-500 text-xs px-4 py-2 border-t border-slate-700/30">
                      ... va yana {importResult.products.length - 3} ta
                    </p>
                  )}
                </div>
              )}

              {importResult.products.length > 0 ? (
                <button onClick={handleImportConfirm}
                  className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all">
                  {importResult.products.length} ta mahsulot import qilish
                </button>
              ) : (
                <button onClick={() => { setImportResult(null); fileRef.current?.click() }}
                  className="w-full bg-slate-700 text-slate-300 py-3.5 rounded-xl text-sm">
                  Boshqa fayl tanlash
                </button>
              )}
            </div>
          )}

          {/* Import tugadi */}
          {importDone && importResult && (
            <div className="space-y-3">
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                  <CheckCircle size={32} className="text-primary-400" />
                </div>
                <p className="text-white font-semibold text-lg">Import tugadi!</p>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-primary-400 font-bold text-2xl">{importResult.imported}</p>
                    <p className="text-slate-400 text-xs">qo'shildi</p>
                  </div>
                  {importResult.duplicates > 0 && (
                    <div>
                      <p className="text-slate-400 font-bold text-2xl">{importResult.duplicates}</p>
                      <p className="text-slate-400 text-xs">takror (o'tkazildi)</p>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div>
                      <p className="text-amber-400 font-bold text-2xl">{importResult.errors.length}</p>
                      <p className="text-slate-400 text-xs">xato</p>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setImportModal(false)}
                className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all">
                Yopish
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
