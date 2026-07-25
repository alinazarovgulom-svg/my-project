import { useEffect, useState, useRef } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Package, Archive, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'

export default function Orders() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const canManage = can.manageOperations

  const [orders, setOrders] = useState([])
  const [filterStatus, setFilterStatus] = useState('active') // 'active' | 'archived'
  const [modal, setModal] = useState(null) // null | 'add' | {order}
  const [form, setForm] = useState({ name: '', quantity: '', departmentId: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const reorderingRef = useRef(false)

  useEffect(() => {
    const q = query(collection(db, 'factory_orders'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const openAdd = () => {
    setForm({ name: '', quantity: '', departmentId: visibleDepts[0]?.id || '' })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (order) => {
    setForm({ name: order.name, quantity: order.quantity ?? '', departmentId: order.departmentId || '' })
    setSaveError('')
    setModal(order)
  }
  const closeModal = () => { setModal(null); setSaveError('') }

  const handleSave = async () => {
    if (!form.name.trim() || !form.quantity || !form.departmentId) {
      setSaveError('Nomi, miqdor va bo\'lim kiritilishi shart')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const data = {
        name: form.name.trim(),
        quantity: Number(form.quantity),
        departmentId: form.departmentId,
      }
      if (modal === 'add') {
        // Navbat: eng katta order + 1 (oxiriga qo'shiladi — FIFO)
        const maxOrder = orders.reduce((m, o) => Math.max(m, o.order ?? 0), 0)
        await addDoc(collection(db, 'factory_orders'), {
          ...data,
          order: maxOrder + 1,
          status: 'active',   // holat: keyingi bosqichda avto hisoblanadi
          isActive: true,
          createdAt: serverTimestamp(),
        })
      } else {
        await updateDoc(doc(db, 'factory_orders', modal.id), data)
      }
      closeModal()
    } catch (err) {
      setSaveError(err.message || 'Xatolik yuz berdi')
    }
    setSaving(false)
  }

  const handleArchive = async (id) => {
    if (!confirm('Buyurtmani arxivlaysizmi?')) return
    await updateDoc(doc(db, 'factory_orders', id), { isActive: false })
  }
  const handleRestore = async (id) => {
    await updateDoc(doc(db, 'factory_orders', id), { isActive: true })
  }
  const handleDelete = async (id) => {
    if (!confirm('Buyurtmani butunlay o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi.')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_orders', id))
    setDeleting(null)
  }

  const reorder = async (order, dir) => {
    if (reorderingRef.current) return
    reorderingRef.current = true
    const list = orders
      .filter(o => o.isActive !== false)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    const idx = list.findIndex(o => o.id === order.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) { reorderingRef.current = false; return }
    setReordering(order.id)
    await Promise.all(list.map((o, i) => {
      if (o.id === order.id) return updateDoc(doc(db, 'factory_orders', o.id), { order: swapIdx })
      if (i === swapIdx)     return updateDoc(doc(db, 'factory_orders', o.id), { order: idx })
      if (o.order == null)   return updateDoc(doc(db, 'factory_orders', o.id), { order: i })
      return Promise.resolve()
    }))
    setReordering(null)
    reorderingRef.current = false
  }

  const filtered = orders
    .filter(o => filterStatus === 'active' ? o.isActive !== false : o.isActive === false)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

  const activeCount = orders.filter(o => o.isActive !== false).length
  const archivedCount = orders.filter(o => o.isActive === false).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-700" />
          <h1 className="text-xl font-bold text-gray-800">Buyurtmalar</h1>
        </div>
        {canManage && filterStatus === 'active' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Buyurtma qo'shish
          </button>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Faol ({activeCount})
        </button>
        <button
          onClick={() => setFilterStatus('archived')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Arxivlangan ({archivedCount})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {filterStatus === 'archived' ? 'Arxivlangan buyurtmalar yo\'q' : 'Hozircha buyurtma yo\'q'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((order, i) => (
              <div key={order.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${filterStatus === 'archived' ? 'opacity-60' : ''}`}>
                <span className="text-xs text-gray-400 w-6 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{order.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      {Number(order.quantity).toLocaleString()} dona
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {getDeptName(order.departmentId)}
                    </span>
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      Jarayonda
                    </span>
                  </div>
                </div>

                {canManage && filterStatus === 'active' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col">
                      <button onClick={() => reorder(order, 'up')} disabled={reordering === order.id || i === 0} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                      <button onClick={() => reorder(order, 'down')} disabled={reordering === order.id || i === filtered.length - 1} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => openEdit(order)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleArchive(order.id)} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"><Archive className="w-4 h-4" /></button>
                  </div>
                )}
                {canManage && filterStatus === 'archived' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleRestore(order.id)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(order.id)} disabled={deleting === order.id} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi buyurtma' : 'Buyurtmani tahrirlash'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-xs">{saveError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Buyurtma nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: Ko'k ko'ylak"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Miqdor (dona)</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Tanlang —</option>
                  {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Bekor</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.quantity || !form.departmentId}
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
