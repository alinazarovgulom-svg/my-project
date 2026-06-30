import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  setDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, UserX, UserCheck, FileText, Download, Send } from 'lucide-react'
import { exportAttendancePDF, buildAttendancePDFHtml } from '../utils/pdf'
import { exportAttendanceExcel } from '../utils/excel'
import { sendHTMLToTelegram } from '../utils/telegram'

const REASONS = [
  { value: 'kasallik', label: 'Kasallik',  badge: 'bg-blue-100 text-blue-700'    },
  { value: 'tatil',    label: "Ta'til",    badge: 'bg-purple-100 text-purple-700' },
  { value: 'sababsiz', label: 'Sababsiz',  badge: 'bg-red-100 text-red-700'      },
  { value: 'boshqa',   label: 'Boshqa',    badge: 'bg-gray-100 text-gray-600'    },
]

export default function Attendance() {
  const { user, can, userDoc } = useAuth()
  const { departments } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const visibleDeptIds = new Set(visibleDepts.map(d => d.id))

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [employees, setEmployees] = useState([])
  const [absences, setAbsences] = useState({}) // { [empId]: { reason, note } }
  const [notes, setNotes]       = useState({})
  const [saving, setSaving]     = useState({})
  const [tgSending, setTgSending] = useState(false)
  const [tgMsg, setTgMsg]         = useState('')

  useEffect(() => {
    return onSnapshot(collection(db, 'factory_employees'), snap => {
      setEmployees(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(e => e.isActive !== false)
          .sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
          )
      )
    })
  }, [])

  useEffect(() => {
    if (!date) return
    return onSnapshot(
      query(collection(db, 'factory_absences'), where('date', '==', date)),
      snap => {
        const data = {}
        const noteData = {}
        snap.forEach(d => {
          const rec = d.data()
          data[rec.employeeId]     = { reason: rec.reason || '', note: rec.note || '' }
          noteData[rec.employeeId] = rec.note || ''
        })
        setAbsences(data)
        setNotes(n => ({ ...noteData, ...n }))
      }
    )
  }, [date])

  const confirmAbsent = async (emp, reason, note) => {
    setSaving(s => ({ ...s, [emp.id]: true }))
    await setDoc(doc(db, 'factory_absences', `${date}_${emp.id}`), {
      date,
      employeeId:   emp.id,
      departmentId: emp.departmentId,
      reason:       reason ?? '',
      note:         note ?? '',
      updatedAt:    serverTimestamp(),
      updatedBy:    user?.uid || '',
    })
    setSaving(s => ({ ...s, [emp.id]: false }))
  }

  const confirmPresent = async (empId) => {
    await deleteDoc(doc(db, 'factory_absences', `${date}_${empId}`))
    setNotes(n => { const c = { ...n }; delete c[empId]; return c })
  }

  const handleToggle = (emp) => {
    if (absences[emp.id]) confirmPresent(emp.id)
    else confirmAbsent(emp, '', '')
  }

  const handleReasonChange = (emp, reason) => {
    confirmAbsent(emp, reason, notes[emp.id] ?? '')
  }

  const handleNoteBlur = (emp) => {
    if (!absences[emp.id]) return
    confirmAbsent(emp, absences[emp.id].reason, notes[emp.id] ?? '')
  }

  const visibleEmps  = employees.filter(e => visibleDeptIds.has(e.departmentId))
  const absentEmps   = visibleEmps.filter(e => absences[e.id])
  const presentCount = visibleEmps.length - absentEmps.length

  const byDept = visibleDepts
    .map(dept => ({
      dept,
      emps: visibleEmps.filter(e => e.departmentId === dept.id),
    }))
    .filter(d => d.emps.length > 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Davomat</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelmagan xodimlarni tasdiqlang</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <button
              disabled={tgSending}
              onClick={async () => {
                setTgSending(true)
                setTgMsg('')
                try {
                  const html = buildAttendancePDFHtml(absentEmps, visibleEmps, absences, visibleDepts, date)
                  const filename = `davomat-${date}.pdf`
                  const caption = `📋 Davomat | ${date} | Kelmaganlar: ${absentEmps.length} nafar`
                  await sendHTMLToTelegram(html, filename, caption)
                  setTgMsg('✓ Yuborildi!')
                } catch (err) {
                  setTgMsg('Xatolik: ' + err.message)
                } finally {
                  setTgSending(false)
                  setTimeout(() => setTgMsg(''), 4000)
                }
              }}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs px-3 py-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {tgSending ? 'Yuborilmoqda...' : 'Telegram'}
            </button>
            {tgMsg && (
              <div className={`absolute top-full mt-1 right-0 text-xs px-2 py-1 rounded whitespace-nowrap z-10 ${tgMsg.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {tgMsg}
              </div>
            )}
          </div>
          <button
            onClick={() => exportAttendancePDF(absentEmps, visibleEmps, absences, visibleDepts, date)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => exportAttendanceExcel(absentEmps, visibleEmps, absences, visibleDepts, date)}
            className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-xs px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{visibleEmps.length}</div>
          <div className="text-xs text-blue-500 mt-1">Jami xodimlar</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{presentCount}</div>
          <div className="text-xs text-green-600 mt-1">Kelgan</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{absentEmps.length}</div>
          <div className="text-xs text-red-500 mt-1">Kelmagan</div>
        </div>
      </div>

      {/* Absent banner */}
      {absentEmps.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
          <div className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5" /> Kelmaganlar ({absentEmps.length} nafar):
          </div>
          <div className="flex flex-wrap gap-2">
            {absentEmps.map(e => {
              const abs = absences[e.id]
              const reason = REASONS.find(r => r.value === abs?.reason)
              return (
                <span key={e.id} className="inline-flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-3 py-1 text-xs text-red-700">
                  {e.lastName} {e.firstName}
                  {reason && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${reason.badge}`}>
                      {reason.label}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* All employees by department */}
      <div className="space-y-4">
        {byDept.map(({ dept, emps }) => {
          const deptAbsent = emps.filter(e => absences[e.id]).length
          return (
            <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                <div className="flex items-center gap-2">
                  {deptAbsent > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                      {deptAbsent} kelmagan
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{emps.length} xodim</span>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {emps.map((emp, i) => {
                  const abs = absences[emp.id]
                  const isAbsent = !!abs
                  const reason = REASONS.find(r => r.value === abs?.reason)

                  return (
                    <div key={emp.id} className={`px-4 py-3 ${isAbsent ? 'bg-red-50/40' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>

                        <span className={`flex-1 min-w-0 text-sm font-medium ${isAbsent ? 'text-red-700' : 'text-gray-800'}`}>
                          {emp.lastName} {emp.firstName}
                        </span>

                        {/* Toggle button */}
                        {can.enterHourly && (
                          <button
                            onClick={() => handleToggle(emp)}
                            disabled={saving[emp.id]}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                              isAbsent
                                ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {isAbsent
                              ? <><UserX className="w-3.5 h-3.5" /> Kelmagan</>
                              : <><UserCheck className="w-3.5 h-3.5" /> Kelgan</>
                            }
                          </button>
                        )}

                        {!can.enterHourly && isAbsent && (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <UserX className="w-3.5 h-3.5" /> Kelmagan
                          </span>
                        )}

                        {/* Reason select — only when absent */}
                        {isAbsent && can.enterHourly && (
                          <select
                            value={abs?.reason ?? ''}
                            onChange={e => handleReasonChange(emp, e.target.value)}
                            disabled={saving[emp.id]}
                            className="border border-red-200 bg-white rounded-lg px-2 py-1.5 text-xs text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400"
                          >
                            <option value="">— Sabab —</option>
                            {REASONS.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}

                        {isAbsent && !can.enterHourly && reason && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${reason.badge}`}>
                            {reason.label}
                          </span>
                        )}

                        {/* Note */}
                        {isAbsent && can.enterHourly && (
                          <input
                            type="text"
                            value={notes[emp.id] ?? ''}
                            onChange={e => setNotes(n => ({ ...n, [emp.id]: e.target.value }))}
                            onBlur={() => handleNoteBlur(emp)}
                            placeholder="Izoh..."
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-36 md:w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}

                        {isAbsent && !can.enterHourly && abs?.note && (
                          <span className="text-xs text-gray-500">{abs.note}</span>
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

      {visibleEmps.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Xodimlar topilmadi
        </div>
      )}
    </div>
  )
}
