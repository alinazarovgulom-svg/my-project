import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy, where, getDocs,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react'

export default function Employees() {
  const { can } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [filterDept, setFilterDept] = useState('all')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', departmentId: '', operationIds: [] })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), orderBy('lastName'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    getDocs(query(collection(db, 'factory_operations'), orderBy('name')))
      .then(snap => setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const deptOps = allOps.filter(o => o.departmentId === form.departmentId)

  const openAdd = () => { setForm({ firstName: '', lastName: '', departmentId: departments[0]?.id || '', operationIds: [] }); setModal('add') }
  const openEdit = (emp) => {
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentId: emp.departmentId,
      operationIds: emp.operationIds || [],
    })
    setModal(emp)
  }

  const toggleOp = (id) => {
    setForm(f => ({
      ...f,
      operationIds: f.operationIds.includes(id)
        ? f.operationIds.filter(x => x !== id)
        : [...f.operationIds, id],
    }))
  }

  const handleDeptChange = (deptId) => {
    setForm(f => ({ ...f, departmentId: deptId, operationIds: [] }))
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return
    setSaving(true)
    const data = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      departmentId: form.departmentId,
      operationIds: form.operationIds,
    }
    if (modal === 'add') {
      await addDoc(collection(db, 'factory_employees'), { ...data, createdAt: serverTimestamp() })
    } else {
      await updateDoc(doc(db, 'factory_employees', modal.id), data)
    }
    setSaving(false)
    setModal(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_employees', id))
    setDeleting(null)
  }

  const [search, setSearch] = useState('')

  const filtered = employees
    .filter(e => filterDept === 'all' || e.departmentId === filterDept)
    .filter(e => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return `${e.lastName} ${e.firstName}`.toLowerCase().includes(q)
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Xodimlar</h1>
        {can.manageEmployees && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
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
          placeholder="Xodimni qidirish (ism yoki familya)..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterDept('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Barchasi ({employees.length})
        </button>
        {departments.map(d => {
          const count = employees.filter(e => e.departmentId === d.id).length
          return (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Xodimlar topilmadi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ismi Familyasi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Bo'lim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Operatsiyalar</th>
                  {can.manageEmployees && <th className="px-4 py-3 w-20" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((emp, i) => {
                  const empOps = allOps.filter(o => emp.operationIds?.includes(o.id))
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {emp.lastName} {emp.firstName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {getDeptName(emp.departmentId)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {empOps.length === 0 ? (
                            <span className="text-gray-400 text-xs">Tayinlanmagan</span>
                          ) : empOps.map(op => (
                            <span key={op.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                              {op.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      {can.manageEmployees && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(emp)} className="text-gray-400 hover:text-blue-600 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id)}
                              disabled={deleting === emp.id}
                              className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi xodim' : 'Xodimni tahrirlash'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Familyasi</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Karimov"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ismi</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ali"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => handleDeptChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operatsiyalar ({deptOps.length} ta)
                </label>
                {deptOps.length === 0 ? (
                  <p className="text-xs text-gray-400">Bu bo'limda operatsiyalar mavjud emas</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {deptOps.map(op => (
                      <label key={op.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                        <input
                          type="checkbox"
                          checked={form.operationIds.includes(op.id)}
                          onChange={() => toggleOp(op.id)}
                          className="accent-blue-700"
                        />
                        <span className="text-sm text-gray-700 flex-1">{op.name}</span>
                        <span className="text-xs text-gray-400">{op.norm} dona/soat</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
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
