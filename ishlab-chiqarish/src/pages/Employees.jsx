import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy, getDocs,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Search, Archive, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Employees() {
  const navigate = useNavigate()
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', departmentId: '', operationIds: [], salaryType: 'hourly', hourlyRate: '', salaryHistory: [], telegramId: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const [search, setSearch] = useState('')
  const [opSearch, setOpSearch] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), orderBy('lastName'))
    return onSnapshot(q, snap => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    getDocs(query(collection(db, 'factory_operations'), orderBy('name')))
      .then(snap => setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const deptOps = allOps.filter(o => o.departmentId === form.departmentId)

  const openAdd = () => {
    setForm({ firstName: '', lastName: '', departmentId: visibleDepts[0]?.id || '', operationIds: [], salaryType: 'hourly', hourlyRate: '', salaryHistory: [], telegramId: '' })
    setOpSearch('')
    setSaveError('')
    setModal('add')
  }
  const openEdit = (emp) => {
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentId: emp.departmentId,
      operationIds: emp.operationIds || [],
      salaryType: emp.salaryType || 'hourly',
      hourlyRate: emp.hourlyRate ?? '',
      salaryHistory: emp.salaryHistory || [],
      telegramId: emp.telegramId || '',
    })
    setOpSearch('')
    setSaveError('')
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
    if (!form.firstName.trim() || !form.lastName.trim() || !form.departmentId) return
    setSaving(true)
    setSaveError('')
    try {
      const newRate = form.hourlyRate !== '' ? Number(form.hourlyRate) : null
      const today = new Date().toISOString().slice(0, 10)
      const prevHistory = form.salaryHistory || []
      const lastEntry = prevHistory[prevHistory.length - 1]
      const salaryHistory = newRate !== null && (!lastEntry || lastEntry.hourlyRate !== newRate)
        ? [...prevHistory, { hourlyRate: newRate, from: today }]
        : prevHistory
      const data = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        departmentId: form.departmentId,
        operationIds: form.operationIds,
        salaryType: form.salaryType,
        hourlyRate: newRate,
        salaryHistory,
        telegramId: form.telegramId.trim() || null,
      }
      if (modal === 'add') {
        const maxOrder = employees
          .filter(e => e.departmentId === form.departmentId)
          .reduce((max, e) => Math.max(max, e.order ?? 0), 0)
        await addDoc(collection(db, 'factory_employees'), { ...data, isActive: true, order: maxOrder + 1, createdAt: serverTimestamp() })
      } else {
        await updateDoc(doc(db, 'factory_employees', modal.id), data)
      }
      setSaving(false)
      setModal(null)
    } catch (err) {
      setSaving(false)
      setSaveError(err.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.')
    }
  }

  const handleArchive = async (id) => {
    if (!confirm('Xodimni arxivlaysizmi? DepartmentWork va Davomatda ko\'rinmay qoladi.')) return
    await updateDoc(doc(db, 'factory_employees', id), { isActive: false })
  }

  const handleRestore = async (id) => {
    await updateDoc(doc(db, 'factory_employees', id), { isActive: true })
  }

  const handleDelete = async (id) => {
    if (!confirm('Xodimni butunlay o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi.')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_employees', id))
    setDeleting(null)
  }

  const reorder = async (emp, dir) => {
    const deptList = employees
      .filter(e => e.departmentId === emp.departmentId && e.isActive !== false)
      .sort((a, b) => {
        const aO = a.order ?? Infinity
        const bO = b.order ?? Infinity
        if (aO !== bO) return aO - bO
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
      })
    const idx = deptList.findIndex(e => e.id === emp.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= deptList.length) return
    setReordering(emp.id)
    await Promise.all(deptList.map((e, i) => {
      if (e.id === emp.id) return updateDoc(doc(db, 'factory_employees', e.id), { order: swapIdx })
      if (i === swapIdx) return updateDoc(doc(db, 'factory_employees', e.id), { order: idx })
      if (e.order == null) return updateDoc(doc(db, 'factory_employees', e.id), { order: i })
      return Promise.resolve()
    }))
    setReordering(null)
  }

  const visibleDeptIds = new Set(visibleDepts.map(d => d.id))

  const byStatus = (e) => filterStatus === 'active' ? e.isActive !== false : e.isActive === false

  const filtered = employees
    .filter(e => visibleDeptIds.has(e.departmentId))
    .filter(byStatus)
    .filter(e => filterDept === 'all' || e.departmentId === filterDept)
    .filter(e => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return `${e.lastName} ${e.firstName}`.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (filterDept === 'all' && a.departmentId !== b.departmentId)
        return getDeptName(a.departmentId).localeCompare(getDeptName(b.departmentId), 'uz')
      const aO = a.order ?? Infinity
      const bO = b.order ?? Infinity
      if (aO !== bO) return aO - bO
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
    })

  const activeCount = employees.filter(e => visibleDeptIds.has(e.departmentId) && e.isActive !== false).length
  const archivedCount = employees.filter(e => visibleDeptIds.has(e.departmentId) && e.isActive === false).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Xodimlar</h1>
        {can.manageEmployees && filterStatus === 'active' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex gap-2 mb-4">
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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Xodimni qidirish (ism yoki familya)..."
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Dept filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterDept('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Barchasi
        </button>
        {visibleDepts.map(d => {
          const count = employees.filter(e => e.departmentId === d.id && byStatus(e)).length
          return (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {filterStatus === 'archived' ? 'Arxivlangan xodimlar yo\'q' : 'Xodimlar topilmadi'}
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map((emp) => {
                const empOps = allOps.filter(o => emp.operationIds?.includes(o.id))
                return (
                  <div key={emp.id} className={`px-4 py-3 ${filterStatus === 'archived' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/employee/${emp.id}`)}>
                        <div className="text-sm font-medium text-gray-800 hover:text-indigo-700">{emp.lastName} {emp.firstName}</div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full mt-1 inline-block">
                          {getDeptName(emp.departmentId)}
                        </span>
                        {empOps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {empOps.map(op => (
                              <span key={op.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{op.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {can.manageEmployees && (
                        <div className="flex gap-1 shrink-0">
                          {filterStatus === 'active' ? (
                            <>
                              <button onClick={e => { e.stopPropagation(); openEdit(emp) }} className="p-2 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                              <button onClick={e => { e.stopPropagation(); handleArchive(emp.id) }} className="p-2 text-gray-400 hover:text-amber-600"><Archive className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={e => { e.stopPropagation(); handleRestore(emp.id) }} className="p-2 text-gray-400 hover:text-green-600"><RotateCcw className="w-4 h-4" /></button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(emp.id) }} disabled={deleting === emp.id} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ismi Familyasi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bo'lim</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Operatsiyalar</th>
                    {can.manageEmployees && filterDept !== 'all' && filterStatus === 'active' && <th className="px-4 py-3 w-20 text-center font-medium text-gray-600">Tartib</th>}
                    {can.manageEmployees && <th className="px-4 py-3 w-24" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((emp, i) => {
                    const empOps = allOps.filter(o => emp.operationIds?.includes(o.id))
                    return (
                      <tr key={emp.id} onClick={() => navigate(`/employee/${emp.id}`)} className={`hover:bg-gray-50 cursor-pointer ${filterStatus === 'archived' ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 hover:text-indigo-700">{emp.lastName} {emp.firstName}</td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{getDeptName(emp.departmentId)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {empOps.length === 0 ? (
                              <span className="text-gray-400 text-xs">Tayinlanmagan</span>
                            ) : empOps.map(op => (
                              <span key={op.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{op.name}</span>
                            ))}
                          </div>
                        </td>
                        {can.manageEmployees && filterDept !== 'all' && filterStatus === 'active' && (
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => reorder(emp, 'up')} disabled={reordering === emp.id || i === 0} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                              <button onClick={() => reorder(emp, 'down')} disabled={reordering === emp.id || i === filtered.length - 1} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                            </div>
                          </td>
                        )}
                        {can.manageEmployees && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              {filterStatus === 'active' ? (
                                <>
                                  <button onClick={e => { e.stopPropagation(); openEdit(emp) }} className="text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={e => { e.stopPropagation(); handleArchive(emp.id) }} className="text-gray-400 hover:text-amber-600 transition-colors"><Archive className="w-4 h-4" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={e => { e.stopPropagation(); handleRestore(emp.id) }} className="text-gray-400 hover:text-green-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                                  <button onClick={e => { e.stopPropagation(); handleDelete(emp.id) }} disabled={deleting === emp.id} className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                                </>
                              )}
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Karimov"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ismi</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ali"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => handleDeptChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {visibleDepts.map(d => (
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
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Operatsiya qidirish..."
                        value={opSearch}
                        onChange={e => setOpSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {deptOps.filter(op => op.name.toLowerCase().includes(opSearch.toLowerCase())).map(op => (
                        <label key={op.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={form.operationIds.includes(op.id)}
                            onChange={() => toggleOp(op.id)}
                            className="accent-indigo-600"
                          />
                          <span className="text-sm text-gray-700 flex-1">{op.name}</span>
                          <span className="text-xs text-gray-400">{op.norm} dona/soat</span>
                        </label>
                      ))}
                      {deptOps.filter(op => op.name.toLowerCase().includes(opSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">Topilmadi</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Telegram ID */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telegram ID — <span className="text-gray-400 font-normal">xabar yuborish uchun</span>
                </label>
                <input
                  type="text"
                  value={form.telegramId}
                  onChange={e => setForm(f => ({ ...f, telegramId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="590319878"
                />
                <p className="text-xs text-gray-400 mt-1">Xodim @KAFTIMDA_ERP botga /start yozib ID sini oladi</p>
              </div>

              {/* Maosh bo'limi */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Maosh turi</label>
                <select
                  value={form.salaryType}
                  onChange={e => setForm(f => ({ ...f, salaryType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                >
                  <option value="hourly">Soatlik</option>
                  <option value="piece">Akkord (dona uchun)</option>
                  <option value="both">Aralash (soatlik + akkord)</option>
                </select>

                {(form.salaryType === 'hourly' || form.salaryType === 'both') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Soatlik stavka (so'm)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.hourlyRate}
                      onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="5000"
                    />
                  </div>
                )}

                {form.salaryHistory?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1.5">Maosh tarixi:</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {[...form.salaryHistory].reverse().map((h, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                          <span>{h.from}</span>
                          <span>{h.hourlyRate?.toLocaleString()} so'm/soat</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {saveError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                {saveError}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.firstName.trim() || !form.lastName.trim() || !form.departmentId}
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
