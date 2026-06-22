import { useEffect, useState, useCallback } from 'react'
import {
  collection, query, where, onSnapshot,
  setDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, UserX, UserCheck } from 'lucide-react'

const REASONS = [
  { value: 'kasallik', label: 'Kasallik' },
  { value: 'tatil',    label: "Ta'til"   },
  { value: 'sababsiz', label: 'Sababsiz' },
  { value: 'boshqa',   label: 'Boshqa'   },
]

const reasonBadge = {
  kasallik: 'bg-blue-100 text-blue-700',
  tatil:    'bg-purple-100 text-purple-700',
  sababsiz: 'bg-red-100 text-red-700',
  boshqa:   'bg-gray-100 text-gray-600',
}

export default function Attendance() {
  const { user, can } = useAuth()
  const { departments } = useDepartments()

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [employees, setEmployees] = useState([])
  const [absences, setAbsences] = useState({}) // { [empId]: { reason, note } }
  const [notes, setNotes] = useState({})        // local note input state
  const [saving, setSaving] = useState({})

  // Load all employees
  useEffect(() => {
    return onSnapshot(collection(db, 'factory_employees'), snap => {
      setEmployees(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
          )
      )
    })
  }, [])

  // Load absences for selected date
  useEffect(() => {
    if (!date) return
    return onSnapshot(
      query(collection(db, 'factory_absences'), where('date', '==', date)),
      snap => {
        const data = {}
        const noteData = {}
        snap.forEach(d => {
          const rec = d.data()
          data[rec.employeeId] = { reason: rec.reason, note: rec.note || '' }
          noteData[rec.employeeId] = rec.note || ''
        })
        setAbsences(data)
        setNotes(prev => {
          // Only overwrite note from DB if user isn't actively editing
          const merged = { ...noteData }
          Object.keys(prev).forEach(id => {
            if (data[id]) merged[id] = prev[id]
          })
          return merged
        })
      }
    )
  }, [date])

  const saveAbsence = useCallback(async (emp, reason, note) => {
    const docId = `${date}_${emp.id}`
    setSaving(s => ({ ...s, [emp.id]: true }))
    await setDoc(doc(db, 'factory_absences', docId), {
      date,
      employeeId: emp.id,
      departmentId: emp.departmentId,
      reason,
      note: note ?? '',
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
    })
    setSaving(s => ({ ...s, [emp.id]: false }))
  }, [date, user])

  const toggleAbsent = async (emp) => {
    if (!can.enterHourly) return
    const docId = `${date}_${emp.id}`
    if (absences[emp.id]) {
      await deleteDoc(doc(db, 'factory_absences', docId))
      setNotes(n => { const c = { ...n }; delete c[emp.id]; return c })
    } else {
      await saveAbsence(emp, 'sababsiz', '')
    }
  }

  const changeReason = async (emp, reason) => {
    if (!can.enterHourly) return
    await saveAbsence(emp, reason, notes[emp.id] ?? '')
  }

  const handleNoteBlur = async (emp) => {
    if (!can.enterHourly || !absences[emp.id]) return
    await saveAbsence(emp, absences[emp.id].reason, notes[emp.id] ?? '')
  }

  // Group employees by department
  const byDept = departments
    .map(dept => ({ dept, emps: employees.filter(e => e.departmentId === dept.id) }))
    .filter(d => d.emps.length > 0)

  const totalEmp    = employees.length
  const totalAbsent = Object.keys(absences).filter(id => employees.some(e => e.id === id)).length
  const totalPresent = totalEmp - totalAbsent

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Davomat</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelmaganlarni belgilang va sabab kiriting</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{totalEmp}</div>
          <div className="text-xs text-blue-500 mt-1">Jami xodimlar</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{totalPresent}</div>
          <div className="text-xs text-green-600 mt-1">Kelgan</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{totalAbsent}</div>
          <div className="text-xs text-red-500 mt-1">Kelmagan</div>
        </div>
      </div>

      {/* Absent list summary (quick overview) */}
      {totalAbsent > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
          <div className="text-xs font-semibold text-red-700 mb-2">Kelmaganlar:</div>
          <div className="flex flex-wrap gap-2">
            {employees
              .filter(e => absences[e.id])
              .map(e => (
                <span key={e.id} className="inline-flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-3 py-1 text-xs text-red-700">
                  {e.lastName} {e.firstName}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${reasonBadge[absences[e.id]?.reason] || 'bg-gray-100 text-gray-600'}`}>
                    {REASONS.find(r => r.value === absences[e.id]?.reason)?.label || '—'}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Per department */}
      <div className="space-y-4">
        {byDept.map(({ dept, emps }) => {
          const deptAbsent = emps.filter(e => absences[e.id]).length
          return (
            <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Dept header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 font-medium">{emps.length - deptAbsent} kelgan</span>
                  {deptAbsent > 0 && (
                    <span className="bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                      {deptAbsent} kelmagan
                    </span>
                  )}
                </div>
              </div>

              {/* Employee rows */}
              <div className="divide-y divide-gray-50">
                {emps.map((emp, i) => {
                  const isAbsent = !!absences[emp.id]
                  const abs = absences[emp.id]

                  return (
                    <div
                      key={emp.id}
                      className={`px-4 py-3 transition-colors ${isAbsent ? 'bg-red-50/60' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>

                        <span className={`flex-1 min-w-0 text-sm font-medium ${isAbsent ? 'text-red-700' : 'text-gray-800'}`}>
                          {emp.lastName} {emp.firstName}
                        </span>

                        {isAbsent ? (
                          <>
                            {/* Reason select */}
                            <select
                              value={abs.reason}
                              onChange={e => changeReason(emp, e.target.value)}
                              disabled={!can.enterHourly || saving[emp.id]}
                              className="border border-red-200 bg-white rounded-lg px-2 py-1.5 text-xs text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400"
                            >
                              {REASONS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>

                            {/* Note input */}
                            <input
                              type="text"
                              value={notes[emp.id] ?? ''}
                              onChange={e => setNotes(n => ({ ...n, [emp.id]: e.target.value }))}
                              onBlur={() => handleNoteBlur(emp)}
                              disabled={!can.enterHourly}
                              placeholder="Izoh..."
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-36 md:w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">✓ Kelgan</span>
                        )}

                        {/* Toggle button */}
                        {can.enterHourly && (
                          <button
                            onClick={() => toggleAbsent(emp)}
                            disabled={saving[emp.id]}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              isAbsent
                                ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                          >
                            {isAbsent
                              ? <><UserCheck className="w-3.5 h-3.5" /> Keldi</>
                              : <><UserX className="w-3.5 h-3.5" /> Kelmadi</>}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
