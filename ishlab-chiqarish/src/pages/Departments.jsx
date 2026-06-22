import { useState } from 'react'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react'

export default function Departments() {
  const { departments, addDept, updateDept, deleteDept } = useDepartments()
  const { can } = useAuth()
  const [modal, setModal] = useState(null) // null | 'add' | { id, name }
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  const openAdd = () => { setName(''); setError(''); setModal('add') }
  const openEdit = (dept) => { setName(dept.name); setError(''); setModal(dept) }
  const closeModal = () => { setModal(null); setError('') }

  const handleSave = async () => {
    if (!name.trim()) { setError("Bo'lim nomi kiritilmadi"); return }
    setSaving(true)
    try {
      if (modal === 'add') {
        await addDept(name)
      } else {
        await updateDept(modal.id, name)
      }
      closeModal()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (dept) => {
    if (!confirm(`"${dept.name}" ni o'chirishni tasdiqlaysizmi?`)) return
    setDeleting(dept.id)
    await deleteDept(dept.id)
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Bo'limlar</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Bo'lim qo'shish
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Bo'limlar topilmadi</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {departments.map((dept, i) => (
              <div key={dept.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">{dept.name}</div>
                </div>
                {can.manageMembers && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(dept)} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      disabled={deleting === dept.id}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? "Yangi bo'lim" : "Bo'limni tahrirlash"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim nomi</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Masalan: Tikuv bo'limi"
                autoFocus
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
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
