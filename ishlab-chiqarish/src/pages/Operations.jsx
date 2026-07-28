import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Star, Search, GripVertical, LogIn } from 'lucide-react'

export default function Operations() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const [operations, setOperations] = useState([])
  const [filterDept, setFilterDept] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | {id, ...}
  const [form, setForm] = useState({ name: '', norm: '', unitPrice: '', departmentId: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const [dragId, setDragId] = useState(null)       // sudralayotgan operatsiya
  const [dragOverId, setDragOverId] = useState(null) // ustiga kelingan operatsiya

  useEffect(() => {
    const q = query(collection(db, 'factory_operations'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setOperations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const openAdd = () => { setForm({ name: '', norm: '', unitPrice: '', departmentId: visibleDepts[0]?.id || '' }); setModal('add') }
  const openEdit = (op) => { setForm({ name: op.name, norm: op.norm, unitPrice: op.unitPrice ?? '', departmentId: op.departmentId }); setModal(op) }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim() || !form.norm || !form.departmentId) return
    setSaving(true)
    if (modal === 'add') {
      const maxOrder = operations
        .filter(o => o.departmentId === form.departmentId)
        .reduce((max, o) => Math.max(max, o.order ?? 0), 0)
      await addDoc(collection(db, 'factory_operations'), {
        name: form.name.trim(),
        norm: Number(form.norm),
        unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : 0,
        departmentId: form.departmentId,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'factory_operations', modal.id), {
        name: form.name.trim(),
        norm: Number(form.norm),
        unitPrice: form.unitPrice !== '' ? Number(form.unitPrice) : 0,
        departmentId: form.departmentId,
      })
    }
    setSaving(false)
    closeModal()
  }

  const handleToggleFinal = async (op) => {
    if (op.isFinal) {
      await updateDoc(doc(db, 'factory_operations', op.id), { isFinal: false })
    } else {
      const currentFinal = operations.find(o => o.departmentId === op.departmentId && o.isFinal && o.id !== op.id)
      if (currentFinal) {
        await updateDoc(doc(db, 'factory_operations', currentFinal.id), { isFinal: false })
      }
      await updateDoc(doc(db, 'factory_operations', op.id), { isFinal: true })
    }
  }

  // Boshlang'ich operatsiya — bo'limga kirimni ko'rsatadi (har bo'limda bitta)
  const handleToggleFirst = async (op) => {
    if (op.isFirst) {
      await updateDoc(doc(db, 'factory_operations', op.id), { isFirst: false })
    } else {
      const currentFirst = operations.find(o => o.departmentId === op.departmentId && o.isFirst && o.id !== op.id)
      if (currentFirst) {
        await updateDoc(doc(db, 'factory_operations', currentFirst.id), { isFirst: false })
      }
      await updateDoc(doc(db, 'factory_operations', op.id), { isFirst: true })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_operations', id))
    setDeleting(null)
  }

  // Sudrab tashlab tartiblash — faqat shu bo'lim ichida. Operatsiyani nishon
  // operatsiyaning oldiga joylab, bo'limning butun ro'yxatiga 0..n tartib beriladi.
  const reorderByDrag = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    const src = operations.find(o => o.id === sourceId)
    const tgt = operations.find(o => o.id === targetId)
    if (!src || !tgt || src.departmentId !== tgt.departmentId) return // boshqa bo'limга emas
    const list = operations
      .filter(o => o.departmentId === src.departmentId)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    const next = list.filter(o => o.id !== sourceId)
    const insertAt = next.findIndex(o => o.id === targetId)
    next.splice(insertAt, 0, src)
    setReordering(sourceId)
    await Promise.all(next.map((o, i) =>
      (o.order !== i) ? updateDoc(doc(db, 'factory_operations', o.id), { order: i }) : Promise.resolve()
    ))
    setReordering(null)
  }

  const visibleOpIds = new Set(visibleDepts.map(d => d.id))
  const visibleOps = operations
    .filter(o => visibleOpIds.has(o.departmentId))
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
  const filtered = visibleOps
    .filter(o => filterDept === 'all' || o.departmentId === filterDept)
    .filter(o => !search.trim() || o.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Operatsiyalar</h1>
        {can.manageOperations && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Operatsiya nomini qidiring..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterDept('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Barchasi
        </button>
        {visibleDepts.map(d => (
          <button
            key={d.id}
            onClick={() => setFilterDept(d.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {can.manageOperations && filtered.length > 1 && !search.trim() && (
        <p className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <GripVertical className="w-3.5 h-3.5" /> Operatsiyani sudrab tartibini o'zgartiring
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Operatsiyalar topilmadi
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(op => (
                <div key={op.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{op.name}</span>
                        {op.isFirst && <LogIn className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                        {op.isFinal && <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />}
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full mt-1 inline-block">
                        {getDeptName(op.departmentId)}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {op.norm} dona/soat{op.unitPrice ? ` · ${op.unitPrice.toLocaleString()} so'm` : ''}
                      </div>
                    </div>
                    {can.manageOperations && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(op)} className="p-2 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(op.id)} disabled={deleting === op.id} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Operatsiya nomi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bo'lim</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Norma (1 soat)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Dona narxi (so'm)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Yakuniy</th>
                    {can.manageOperations && <th className="px-4 py-3 w-24 text-center font-medium text-gray-600">Tartib</th>}
                    {can.manageOperations && <th className="px-4 py-3 w-20" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(op => {
                    const canDrag = can.manageOperations && !search.trim()
                    const isDragging = dragId === op.id
                    const isDragOver = dragOverId === op.id && dragId && dragId !== op.id
                    return (
                    <tr
                      key={op.id}
                      draggable={canDrag}
                      onDragStart={() => canDrag && setDragId(op.id)}
                      onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                      onDragOver={e => { if (dragId) { e.preventDefault(); setDragOverId(op.id) } }}
                      onDrop={e => { e.preventDefault(); reorderByDrag(dragId, op.id); setDragId(null); setDragOverId(null) }}
                      className={`hover:bg-gray-50 ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'border-t-2 border-indigo-500' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{op.name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{getDeptName(op.departmentId)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{op.norm} dona</td>
                      <td className="px-4 py-3 text-gray-600">{op.unitPrice ? `${op.unitPrice.toLocaleString()} so'm` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => can.manageOperations && handleToggleFirst(op)}
                            disabled={!can.manageOperations}
                            title="Boshlang'ich operatsiya (kirim)"
                            className={`flex items-center gap-1.5 text-xs transition-colors ${op.isFirst ? 'text-green-600' : can.manageOperations ? 'text-gray-300 hover:text-green-400' : 'text-gray-200 cursor-default'}`}
                          >
                            <LogIn className={`w-4 h-4 ${op.isFirst ? 'text-green-600' : ''}`} />
                            {op.isFirst && <span className="font-medium">Boshlang'ich</span>}
                          </button>
                          <button
                            onClick={() => can.manageOperations && handleToggleFinal(op)}
                            disabled={!can.manageOperations}
                            title="Yakuniy operatsiya (tayyor mahsulot)"
                            className={`flex items-center gap-1.5 text-xs transition-colors ${op.isFinal ? 'text-amber-600' : can.manageOperations ? 'text-gray-300 hover:text-amber-400' : 'text-gray-200 cursor-default'}`}
                          >
                            <Star className={`w-4 h-4 ${op.isFinal ? 'fill-amber-500 text-amber-500' : ''}`} />
                            {op.isFinal && <span className="font-medium">Yakuniy</span>}
                          </button>
                        </div>
                      </td>
                      {can.manageOperations && (
                        <td className="px-4 py-3">
                          <div className="flex justify-center" title={search.trim() ? "Tartiblash uchun qidiruvni tozalang" : "Sudrab tartiblang"}>
                            <span className={`${search.trim() ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing'}`}>
                              <GripVertical className="w-5 h-5" />
                            </span>
                          </div>
                        </td>
                      )}
                      {can.manageOperations && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(op)} className="text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(op.id)} disabled={deleting === op.id} className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi operatsiya' : 'Operatsiyani tahrirlash'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Operatsiya nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: Ko'ylak tikish"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {visibleDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  1 soatdagi norma (dona)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.norm}
                  onChange={e => setForm(f => ({ ...f, norm: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dona narxi (so'm) — <span className="text-gray-400 font-normal">akkord uchun</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="150"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.norm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
