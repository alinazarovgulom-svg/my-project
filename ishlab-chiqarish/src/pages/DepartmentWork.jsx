import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, onSnapshot, getDocs,
  doc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, Save, CheckCircle, RefreshCw, X, Search, MoreVertical } from 'lucide-react'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function normStatus(quantity, norm, hours) {
  const expected = norm * hours
  if (!expected || quantity === '' || quantity === null) return 'none'
  const qty = Number(quantity)
  if (qty > expected) return 'above'
  if (qty === expected) return 'equal'
  return 'below'
}

const statusStyle = {
  above: 'bg-green-100 text-green-800 border-green-200',
  equal: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  below: 'bg-red-100 text-red-800 border-red-200',
  none: 'bg-white text-gray-700 border-gray-200',
}

export default function DepartmentWork() {
  const { deptId } = useParams()
  const { user, userDoc, can } = useAuth()
  const { departments } = useDepartments()
  const dept = departments.find(d => d.id === deptId)

  const hasAccess = can.manageMembers || !userDoc?.departmentIds?.length || userDoc.departmentIds.includes(deptId)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [entries, setEntries] = useState({}) // { [empId]: { [opId]: { quantity, note } } }
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [savingAll, setSavingAll] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [overrides, setOverrides] = useState({}) // { [empId]: opId[] } — session only
  const [menuEmp, setMenuEmp] = useState(null) // 3-dot menu open for which empId
  const [pickerEmp, setPickerEmp] = useState(null) // empId whose picker is open
  const [pickerSel, setPickerSel] = useState([]) // temp selection in picker
  const [search, setSearch] = useState('')
  const [activeShift, setActiveShift] = useState(null)

  useEffect(() => {
    getDocs(query(collection(db, 'factory_shifts'), where('isActive', '==', true)))
      .then(snap => {
        if (!snap.empty) setActiveShift({ id: snap.docs[0].id, ...snap.docs[0].data() })
      })
  }, [])

  // Load employees in this dept
  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), where('departmentId', '==', deptId))
    return onSnapshot(q, snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
        return nameA.localeCompare(nameB, 'uz')
      }))
    })
  }, [deptId])

  // Load all operations
  useEffect(() => {
    getDocs(collection(db, 'factory_operations')).then(snap => {
      setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  // Reset overrides and dirty flag when date/time changes
  useEffect(() => {
    setOverrides({})
    setPickerEmp(null)
    setBreakMinutes(0)
    setIsDirty(false)
  }, [date, startTime, endTime])

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Load existing entries when date/time changes
  useEffect(() => {
    if (!date || !startTime || !endTime) return
    const q = query(
      collection(db, 'factory_work_entries'),
      where('departmentId', '==', deptId),
      where('date', '==', date),
      where('startTime', '==', startTime),
      where('endTime', '==', endTime),
    )
    return onSnapshot(q, snap => {
      const data = {}
      let loadedBreak = 0
      snap.forEach(d => {
        const { employeeId, operations, breakMinutes: bm } = d.data()
        data[employeeId] = operations || {}
        if (bm !== undefined) loadedBreak = bm
      })
      setEntries(data)
      setBreakMinutes(loadedBreak)
    })
  }, [deptId, date, startTime, endTime])

  const setEntryVal = (empId, opId, field, value) => {
    setEntries(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [opId]: { ...prev[empId]?.[opId], [field]: value },
      },
    }))
    setSaved(s => ({ ...s, [empId]: false }))
    setIsDirty(true)
  }

  const saveEmployee = async (empId) => {
    setSaving(s => ({ ...s, [empId]: true }))
    const entryId = `${date}_${deptId}_${startTime.replace(':','')}_${endTime.replace(':','')}_${empId}`
    await setDoc(doc(db, 'factory_work_entries', entryId), {
      employeeId: empId,
      departmentId: deptId,
      date,
      startTime,
      endTime,
      breakMinutes,
      operations: entries[empId] || {},
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    setSaving(s => ({ ...s, [empId]: false }))
    setSaved(s => ({ ...s, [empId]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [empId]: false })), 2000)
  }

  const saveAll = async () => {
    setSavingAll(true)
    await Promise.all(employees.map(emp => saveEmployee(emp.id)))
    setSavingAll(false)
    setSavedAll(true)
    setIsDirty(false)
    setTimeout(() => setSavedAll(false), 2500)
  }

  const openPicker = (emp) => {
    const current = overrides[emp.id] ?? emp.operationIds ?? []
    setPickerSel(current)
    setPickerEmp(emp.id)
  }

  const applyPicker = (empId) => {
    setOverrides(o => ({ ...o, [empId]: pickerSel }))
    setPickerEmp(null)
  }

  const togglePickerOp = (opId) => {
    setPickerSel(s => s.includes(opId) ? s.filter(id => id !== opId) : [...s, opId])
  }

  const hours = Math.max(0, calcHours(startTime, endTime) - breakMinutes / 60)

  if (!dept) return <div className="text-red-500 p-4">Bo'lim topilmadi</div>
  if (!hasAccess) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <div className="text-gray-700 font-semibold">Ruxsat yo'q</div>
      <div className="text-gray-400 text-sm mt-1">Bu bo'limga kirishingiz cheklanган</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">{dept.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ish ma'lumotlarini kiritish</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        {activeShift && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Tez tanlash ({activeShift.name})</div>
            <div className="flex flex-wrap gap-2">
              {(activeShift.slots || []).map((slot, i) => {
                const isSelected = startTime === slot.startTime && endTime === slot.endTime
                return (
                  <button
                    key={i}
                    onClick={() => { setStartTime(slot.startTime); setEndTime(slot.endTime); setBreakMinutes(slot.breakMinutes || 0) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {slot.startTime}–{slot.endTime}
                    {slot.breakMinutes > 0 && <span className={`ml-1 ${isSelected ? 'text-blue-200' : 'text-orange-400'}`}>⏸{slot.breakMinutes}'</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Sana
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Boshlanish
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Tugash
            </label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanaffus (daq.)</label>
            <input
              type="number"
              min="0"
              max="240"
              value={breakMinutes || ''}
              onChange={e => setBreakMinutes(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500 pb-2">
            <span className="font-semibold text-gray-700">{hours.toFixed(1)}</span> soat
            {breakMinutes > 0 && (
              <span className="text-xs text-orange-500 ml-1">(−{breakMinutes} daq.)</span>
            )}
          </div>
        </div>
      </div>

      {/* Employees */}
      {(!date || !startTime || !endTime) ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Sana, boshlanish va tugash vaqtini tanlang
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Bu bo'limda xodimlar mavjud emas
        </div>
      ) : (
        <>
          {/* Search + Save All */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Xodimni qidirish..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {can.enterHourly && (
              <button
                onClick={saveAll}
                disabled={savingAll}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                  savedAll
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                } disabled:opacity-60`}
              >
                {savedAll ? (
                  <><CheckCircle className="w-4 h-4" /> Hammasi saqlandi</>
                ) : (
                  <><Save className="w-4 h-4" /> {savingAll ? 'Saqlanmoqda...' : 'Barchasini saqlash'}</>
                )}
              </button>
            )}
          </div>
        <div className="space-y-4">
          {employees.filter(emp => {
            if (!search.trim()) return true
            const q = search.trim().toLowerCase()
            return `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q)
          }).map((emp, idx) => {
            const activeOpIds = overrides[emp.id] ?? emp.operationIds ?? []
            const empOps = allOps.filter(o => activeOpIds.includes(o.id))
            const isOverridden = overrides[emp.id] != null
            const empEntries = entries[emp.id] || {}

            return (
              <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Employee header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-gray-800 text-sm">
                      {emp.lastName} {emp.firstName}
                    </span>
                    {isOverridden && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Almashtrilgan
                      </span>
                    )}
                  </div>
                  {can.enterHourly && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuEmp(menuEmp === emp.id ? null : emp.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                        title="Boshqa amallar"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuEmp === emp.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuEmp(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                            <button
                              onClick={() => { openPicker(emp); setMenuEmp(null) }}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                              Operatsiya almashtirish
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Operation picker modal */}
                {pickerEmp === emp.id && (
                  <div className="border-b border-orange-100 bg-orange-50 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-orange-800">Operatsiyalarni tanlang (faqat shu sessiya uchun)</span>
                      <button onClick={() => setPickerEmp(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {allOps.filter(o => o.departmentId === deptId).map(op => (
                        <label key={op.id} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                          pickerSel.includes(op.id)
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={pickerSel.includes(op.id)}
                            onChange={() => togglePickerOp(op.id)}
                          />
                          {op.name}
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => applyPicker(emp.id)}
                      className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Tasdiqlash
                    </button>
                  </div>
                )}

                {/* Operations */}
                {empOps.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-400">
                    Operatsiyalar tayinlanmagan
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {empOps.map(op => {
                      const qty = empEntries[op.id]?.quantity ?? ''
                      const note = empEntries[op.id]?.note ?? ''
                      const expected = op.norm * hours
                      const status = normStatus(qty, op.norm, hours)

                      return (
                        <div key={op.id} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-700">{op.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Norma: {op.norm} dona/soat · {hours > 0 ? `${hours.toFixed(1)} soat = ` : ''}{hours > 0 ? `${expected.toFixed(0)} dona` : '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={qty}
                                onChange={e => setEntryVal(emp.id, op.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={!can.enterHourly}
                                className={`w-24 border rounded-lg px-3 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold ${statusStyle[status]}`}
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-400">dona</span>
                            </div>
                            <input
                              type="text"
                              value={note}
                              onChange={e => setEntryVal(emp.id, op.id, 'note', e.target.value)}
                              disabled={!can.enterHourly}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 md:w-52"
                              placeholder="Izoh..."
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </>
      )}

    </div>
  )
}
