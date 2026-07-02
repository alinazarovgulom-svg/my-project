import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { ArrowLeft, Calendar } from 'lucide-react'

function calcHours(start, end, breakMinutes) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const raw = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
  return Math.max(0, raw - (breakMinutes || 0) / 60)
}

const ABSENCE_LABEL = { kasallik: 'Kasallik', tatil: "Ta'til", sababsiz: 'Sababsiz', boshqa: 'Boshqa' }
const ABSENCE_BADGE = {
  kasallik: 'bg-indigo-100 text-indigo-700',
  tatil: 'bg-purple-100 text-purple-700',
  sababsiz: 'bg-red-100 text-red-700',
  boshqa: 'bg-gray-100 text-gray-600',
}

export default function EmployeeCard() {
  const { empId } = useParams()
  const navigate = useNavigate()
  const { getDeptName } = useDepartments()

  const [emp, setEmp] = useState(null)
  const [allOps, setAllOps] = useState([])
  const [workEntries, setWorkEntries] = useState([])
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    getDoc(doc(db, 'factory_employees', empId)).then(d => {
      if (d.exists()) setEmp({ id: d.id, ...d.data() })
    })
    getDocs(collection(db, 'factory_operations')).then(snap => {
      setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [empId])

  useEffect(() => {
    if (!month) return
    setLoading(true)
    const monthStart = `${month}-01`
    const monthEnd = `${month}-31`
    Promise.all([
      getDocs(query(
        collection(db, 'factory_work_entries'),
        where('employeeId', '==', empId),
      )),
      getDocs(query(
        collection(db, 'factory_absences'),
        where('employeeId', '==', empId),
      )),
    ]).then(([wSnap, aSnap]) => {
      const inMonth = d => d.date >= monthStart && d.date <= monthEnd
      setWorkEntries(wSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(inMonth))
      setAbsences(aSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(inMonth))
      setLoading(false)
    })
  }, [empId, month])

  const totalHours = workEntries.reduce((s, e) => s + calcHours(e.startTime, e.endTime, e.breakMinutes), 0)
  const uniqueDays = new Set(workEntries.map(e => e.date)).size
  const totalPay = workEntries.reduce((s, e) => s + (Number(e.totalPay) || 0), 0)

  const opsSummary = {}
  workEntries.forEach(entry => {
    Object.entries(entry.operations || {}).forEach(([opId, val]) => {
      if (!opsSummary[opId]) opsSummary[opId] = { quantity: 0, piecePay: 0, expected: 0 }
      opsSummary[opId].quantity += Number(val.quantity || 0)
      opsSummary[opId].piecePay += Number(val.piecePay || 0)
      opsSummary[opId].expected += Number(val.expected || 0)
    })
  })

  const salaryTypeLabel = { piece: 'Donabay', mixed: 'Aralash', hourly: 'Soatbay' }[emp?.salaryType] || 'Soatbay'

  if (!emp) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{emp.lastName} {emp.firstName}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{getDeptName(emp.departmentId)}</span>
            <span className="text-xs text-gray-400">{salaryTypeLabel}</span>
            {emp.hourlyRate ? <span className="text-xs text-gray-400">{Number(emp.hourlyRate).toLocaleString()} so'm/soat</span> : null}
          </div>
        </div>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-700">{uniqueDays}</div>
              <div className="text-xs text-indigo-500 mt-1">Kun ishladi</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{totalHours.toFixed(1)}</div>
              <div className="text-xs text-purple-500 mt-1">Jami soat</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{absences.length}</div>
              <div className="text-xs text-red-500 mt-1">Kelmagan kun</div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-green-700 leading-tight">{totalPay.toLocaleString()}</div>
              <div className="text-xs text-green-500 mt-1">Maosh (so'm)</div>
            </div>
          </div>

          {/* Operations */}
          {Object.keys(opsSummary).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-800">Operatsiyalar</div>
              <div className="divide-y divide-gray-50">
                {Object.entries(opsSummary).map(([opId, stat]) => {
                  const op = allOps.find(o => o.id === opId)
                  const pct = stat.expected > 0 ? Math.round(stat.quantity / stat.expected * 100) : null
                  return (
                    <div key={opId} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{op?.name || opId}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{stat.quantity} dona</div>
                      </div>
                      <div className="text-right shrink-0">
                        {pct !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {pct}% norma
                          </span>
                        )}
                        {stat.piecePay > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">{stat.piecePay.toLocaleString()} so'm</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Absences */}
          {absences.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-800">Kelmaganlar</div>
              <div className="divide-y divide-gray-50">
                {[...absences].sort((a, b) => a.date.localeCompare(b.date)).map(abs => (
                  <div key={abs.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">{abs.date}</div>
                    <div className="flex items-center gap-2">
                      {abs.reason && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ABSENCE_BADGE[abs.reason] || 'bg-gray-100 text-gray-600'}`}>
                          {ABSENCE_LABEL[abs.reason] || abs.reason}
                        </span>
                      )}
                      {abs.note && <span className="text-xs text-gray-400 truncate max-w-[100px]">{abs.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workEntries.length === 0 && absences.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              Bu oyda ma'lumot topilmadi
            </div>
          )}
        </>
      )}
    </div>
  )
}
