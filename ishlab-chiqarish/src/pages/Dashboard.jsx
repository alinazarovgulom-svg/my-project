import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { format, subDays } from 'date-fns'
import { Users, Settings, TrendingUp, ChevronRight, Package } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const today = format(new Date(), 'yyyy-MM-dd')

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function effColor(eff) {
  if (eff === null) return { text: 'text-gray-400', bg: 'bg-gray-100', bar: 'bg-gray-300', hex: '#94a3b8' }
  if (eff >= 100)  return { text: 'text-green-700', bg: 'bg-green-50',  bar: 'bg-green-500',  hex: '#16a34a' }
  if (eff >= 80)   return { text: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-400', hex: '#ca8a04' }
  return                  { text: 'text-red-700',   bg: 'bg-red-50',    bar: 'bg-red-500',    hex: '#dc2626' }
}

// Shorten dept names for chart axis (remove "bo'limi")
function shortName(name) {
  return name.replace(/\s*bo['']limi/i, '').trim()
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { departments } = useDepartments()
  const [stats, setStats]       = useState({ employees: 0, operations: 0 })
  const [deptStats, setDeptStats] = useState({})
  const [weekData, setWeekData]   = useState([])
  const [loading, setLoading]     = useState(true)

  // Today's stats
  useEffect(() => {
    if (!departments.length) return
    async function load() {
      const [empSnap, opSnap] = await Promise.all([
        getDocs(collection(db, 'factory_employees')),
        getDocs(collection(db, 'factory_operations')),
      ])

      const normMap = {}
      const finalOpMap = {}
      opSnap.forEach(d => {
        const data = d.data()
        normMap[d.id] = data.norm || 0
        if (data.isFinal) finalOpMap[data.departmentId] = d.id
      })

      const entriesSnap = await getDocs(
        query(collection(db, 'factory_work_entries'), where('date', '==', today))
      )

      const deptData = {}
      departments.forEach(d => {
        deptData[d.id] = { employees: 0, attended: 0, done: 0, expected: 0, tayyor: 0 }
      })

      empSnap.forEach(doc => {
        const deptId = doc.data().departmentId
        if (deptData[deptId]) deptData[deptId].employees++
      })

      const seenEmp = new Set()
      entriesSnap.forEach(doc => {
        const d = doc.data()
        const dd = deptData[d.departmentId]
        if (!dd) return
        const key = `${d.departmentId}_${d.employeeId}`
        if (!seenEmp.has(key)) { seenEmp.add(key); dd.attended++ }
        const hours = calcHours(d.startTime, d.endTime)
        Object.entries(d.operations || {}).forEach(([opId, val]) => {
          const qty = Number(val.quantity || 0)
          dd.done     += qty
          dd.expected += (normMap[opId] || 0) * hours
          if (finalOpMap[d.departmentId] === opId) dd.tayyor += qty
        })
      })

      setStats({ employees: empSnap.size, operations: opSnap.size })
      setDeptStats(deptData)
      setLoading(false)
    }
    load()
  }, [departments])

  // Last 7 days trend
  useEffect(() => {
    async function loadWeek() {
      const last7 = Array.from({ length: 7 }, (_, i) =>
        format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
      )

      const [opSnap, entriesSnap] = await Promise.all([
        getDocs(collection(db, 'factory_operations')),
        getDocs(query(
          collection(db, 'factory_work_entries'),
          where('date', '>=', last7[0]),
          where('date', '<=', last7[6])
        )),
      ])

      const normMap = {}
      opSnap.forEach(d => { normMap[d.id] = d.data().norm || 0 })

      const dayMap = {}
      last7.forEach(d => { dayMap[d] = { done: 0, expected: 0 } })

      entriesSnap.forEach(doc => {
        const d = doc.data()
        const day = dayMap[d.date]
        if (!day) return
        const hours = calcHours(d.startTime, d.endTime)
        Object.entries(d.operations || {}).forEach(([opId, val]) => {
          day.done     += Number(val.quantity || 0)
          day.expected += (normMap[opId] || 0) * hours
        })
      })

      setWeekData(last7.map(date => ({
        date: date.slice(5).replace('-', '.'), // "06.22"
        samaradorlik: dayMap[date].expected > 0
          ? Math.round((dayMap[date].done / dayMap[date].expected) * 100)
          : null,
      })))
    }
    loadWeek()
  }, [])

  const totalAttended = Object.values(deptStats).reduce((s, d) => s + d.attended, 0)
  const totalDone     = Object.values(deptStats).reduce((s, d) => s + d.done, 0)
  const totalExp      = Object.values(deptStats).reduce((s, d) => s + d.expected, 0)
  const totalEff      = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : null
  const totalTayyor   = Object.values(deptStats).reduce((s, d) => s + (d.tayyor || 0), 0)

  // Bar chart data: departments with today's efficiency
  const deptChartData = departments
    .map(d => {
      const ds = deptStats[d.id]
      const eff = ds?.expected > 0 ? Math.round((ds.done / ds.expected) * 100) : 0
      return { name: shortName(d.name), eff }
    })
    .filter(d => d.eff > 0)

  const hasWeekData = weekData.some(d => d.samaradorlik !== null)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : totalTayyor}</div>
              <div className="text-xs text-gray-500">Tayyor mahsulot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

        {/* Line chart: last 7 days */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-semibold text-gray-700 mb-4">Oxirgi 7 kun samaradorligi</div>
          {!hasWeekData ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Ma'lumot yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="samaradorlik"
                  name="Samaradorlik"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1d4ed8' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                {/* 100% reference line */}
                <CartesianGrid stroke="none" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart: department comparison today */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-semibold text-gray-700 mb-4">Bo'limlar samaradorligi — bugun</div>
          {deptChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Bugun ma'lumot kiritilmagan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptChartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Samaradorlik']}
                  labelStyle={{ fontWeight: 600, fontSize: 12 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="eff" name="Samaradorlik" radius={[4, 4, 0, 0]}>
                  {deptChartData.map((entry, i) => (
                    <Cell key={i} fill={effColor(entry.eff).hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Departments grid */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Bo'limlar — bugun</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {departments.map(dept => {
          const ds = deptStats[dept.id] || { employees: 0, attended: 0, done: 0, expected: 0, tayyor: 0 }
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

              <div className="flex gap-2 mb-2">
                <div className="flex-1 bg-green-50 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-sm font-bold text-green-700">{ds.attended}</div>
                  <div className="text-xs text-green-600">Kelgan</div>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-sm font-bold text-red-600">{Math.max(0, ds.employees - ds.attended)}</div>
                  <div className="text-xs text-red-500">Kelmagan</div>
                </div>
              </div>

              <div className="mb-2">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(attendPct, 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Samaradorlik</span>
                  <span className={`font-bold ${ec.text}`}>{eff === null ? '—' : `${eff}%`}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`${ec.bar} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(eff ?? 0, 100)}%` }} />
                </div>
              </div>

              {ds.tayyor > 0 && (
                <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <div className="text-xs text-amber-700">
                    <strong>{ds.tayyor}</strong> tayyor mahsulot
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
