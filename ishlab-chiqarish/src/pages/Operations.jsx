import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

export default function Operations() {
  const { can } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const [operations, setOperations] = useState([])
  const [filterDept, setFilterDept] = useState('all')
  const [modal, setModal] = useState(null) // null | 'add' | {id, ...}
  const [form, setForm] = useState({ name: '', norm: '', departmentId: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'factory_operations'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setOperations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const empty = { name: '', norm: '', departmentId: departments[0]?.id || '' }
  const openAdd = () => { setForm({ name: '', norm: '', departmentId: departments[0]?.id || '' }); setModal('add') }
  const openEdit = (op) => { setForm({ name: op.name, norm: op.norm, departmentId: op.departmentId }); setModal(op) }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim() || !form.norm || !form.departmentId) return
    setSaving(true)
    if (modal === 'add') {
      await addDoc(collection(db, 'factory_operations'), {
        name: form.name.trim(),
        norm: Number(form.norm),
        departmentId: form.departmentId,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'factory_operations', modal.id), {
        name: form.name.trim(),
        norm: Number(form.norm),
        departmentId: form.departmentId,
      })
    }
    setSaving(false)
    closeModal()
  }

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_operations', id))
    setDeleting(null)
  }

  const filtered = filterDept === 'all' ? operations : operations.filter(o => o.departmentId === filterDept)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Operatsiyalar</h1>
        {can.manageOperations && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterDept('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Barchasi
        </button>
        {departments.map(d => (
          <button
            key={d.id}
            onClick={() => setFilterDept(d.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Operatsiyalar topilmadi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Operatsiya nomi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Bo'lim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Norma (1 soat)</th>
                  {can.manageOperations && <th className="px-4 py-3 w-20" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(op => (
                  <tr key={op.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{op.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {getDeptName(op.departmentId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{op.norm} dona</td>
                    {can.manageOperations && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(op)} className="text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(op.id)}
                            disabled={deleting === op.id}
                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masalan: Ko'ylak tikish"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map(d => (
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
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
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
