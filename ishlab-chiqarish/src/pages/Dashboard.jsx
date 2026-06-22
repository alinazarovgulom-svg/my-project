import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { DEPARTMENTS } from '../data/departments'
import { format } from 'date-fns'
import { Users, Settings, TrendingUp, ChevronRight } from 'lucide-react'

const today = format(new Date(), 'yyyy-MM-dd')

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

export default function Dashboard() {
  const [stats, setStats] = useState({ employees: 0, operations: 0 })
  const [deptStats, setDeptStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [empSnap, opSnap] = await Promise.all([
        getDocs(collection(db, 'factory_employees')),
        getDocs(collection(db, 'factory_operations')),
      ])

      // Operation norm map: opId -> norm
      const normMap = {}
      opSnap.forEach(d => { normMap[d.id] = d.data().norm || 0 })

      // Today's entries
      const entriesSnap = await getDocs(
        query(collection(db, 'factory_work_entries'), where('date', '==', today))
      )

      const deptData = {}
      DEPARTMENTS.forEach(d => {
        deptData[d.id] = { employees: 0, attended: 0, done: 0, expected: 0 }
      })

      // Count employees per dept
      empSnap.forEach(doc => {
        const deptId = doc.data().departmentId
        if (deptData[deptId]) deptData[deptId].employees++
      })

      // Count attendance and efficiency per dept
      const seenEmp = new Set()
      entriesSnap.forEach(doc => {
        const d = doc.data()
        const dd = deptData[d.departmentId]
        if (!dd) return

        const key = `${d.departmentId}_${d.employeeId}`
        if (!seenEmp.has(key)) {
          seenEmp.add(key)
          dd.attended++
        }

        const hours = calcHours(d.startTime, d.endTime)
        Object.entries(d.operations || {}).forEach(([opId, val]) => {
          dd.done     += Number(val.quantity || 0)
          dd.expected += (normMap[opId] || 0) * hours
        })
      })

      setStats({ employees: empSnap.size, operations: opSnap.size })
      setDeptStats(deptData)
      setLoading(false)
    }
    load()
  }, [])

  const totalAttended = Object.values(deptStats).reduce((s, d) => s + d.attended, 0)
  const totalDone     = Object.values(deptStats).reduce((s, d) => s + d.done, 0)
  const totalExp      = Object.values(deptStats).reduce((s, d) => s + d.expected, 0)
  const totalEff      = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : null

  function effColor(eff) {
    if (eff === null) return { text: 'text-gray-400', bg: 'bg-gray-100', bar: 'bg-gray-300' }
    if (eff >= 100) return { text: 'text-green-700', bg: 'bg-green-50', bar: 'bg-green-500' }
    if (eff >= 80)  return { text: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-400' }
    return              { text: 'text-red-700',   bg: 'bg-red-50',   bar: 'bg-red-500' }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.employees}</div>
              <div className="text-xs text-gray-500">Jami xodimlar</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : totalAttended}</div>
              <div className="text-xs text-gray-500">Bugun kelgan</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.operations}</div>
              <div className="text-xs text-gray-500">Operatsiyalar</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loading || totalEff === null ? 'bg-gray-100' : effColor(totalEff).bg}`}>
              <TrendingUp className={`w-5 h-5 ${loading || totalEff === null ? 'text-gray-400' : effColor(totalEff).text}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${loading || totalEff === null ? 'text-gray-400' : effColor(totalEff).text}`}>
                {loading ? '—' : totalEff === null ? '—' : `${totalEff}%`}
              </div>
              <div className="text-xs text-gray-500">Bugungi samaradorlik</div>
            </div>
          </div>
        </div>
      </div>

      {/* Departments grid */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Bo'limlar — bugun</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEPARTMENTS.map(dept => {
          const ds = deptStats[dept.id] || { employees: 0, attended: 0, done: 0, expected: 0 }
          const attendPct = ds.employees ? Math.round((ds.attended / ds.employees) * 100) : 0
          const eff = ds.expected > 0 ? Math.round((ds.done / ds.expected) * 100) : null
          const ec = effColor(eff)
          return (
            <Link
              key={dept.id}
              to={`/department/${dept.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {ds.employees} xodim
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>

              <div className="text-sm font-semibold text-gray-800 mb-3">{dept.name}</div>

              {/* Attendance */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Kelgan</span>
                  <span className="font-medium text-gray-700">{ds.attended}/{ds.employees}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(attendPct, 100)}%` }} />
                </div>
              </div>

              {/* Efficiency */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Samaradorlik</span>
                  <span className={`font-bold ${ec.text}`}>{eff === null ? '—' : `${eff}%`}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`${ec.bar} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(eff ?? 0, 100)}%` }} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
