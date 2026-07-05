import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Activity, AlertTriangle } from 'lucide-react'

function getDateRange(period) {
  const today = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  if (period === 'today') return { from: fmt(today), to: fmt(today) }
  if (period === 'week') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    return { from: fmt(mon), to: fmt(today) }
  }
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: fmt(from), to: fmt(today) }
}

function pctStyle(pct) {
  if (pct === null) return { bar: 'bg-gray-200', text: 'text-gray-400', row: '' }
  if (pct >= 100) return { bar: 'bg-green-500', text: 'text-green-700 font-bold', row: '' }
  if (pct >= 80)  return { bar: 'bg-yellow-400', text: 'text-yellow-700 font-semibold', row: 'bg-yellow-50/60' }
  return { bar: 'bg-red-500', text: 'text-red-700 font-bold', row: 'bg-red-50/70' }
}

export default function Pipeline() {
  const { can, userDoc } = useAuth()
  const { departments } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))

  const [selectedDept, setSelectedDept] = useState('')
  const [period, setPeriod] = useState('today')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!selectedDept && visibleDepts.length > 0) setSelectedDept(visibleDepts[0].id)
  }, [visibleDepts])

  const handleSearch = async () => {
    if (!selectedDept) return
    setLoading(true)
    setSearched(false)

    const { from, to } = getDateRange(period)

    const [opsSnap, entriesSnap] = await Promise.all([
      getDocs(query(collection(db, 'factory_operations'), where('departmentId', '==', selectedDept))),
      getDocs(query(
        collection(db, 'factory_work_entries'),
        where('departmentId', '==', selectedDept),
        where('date', '>=', from),
        where('date', '<=', to),
      )),
    ])

    const ops = opsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

    const opStats = {}
    entriesSnap.docs.forEach(d => {
      const entryOps = d.data().operations || {}
      Object.entries(entryOps).forEach(([opId, val]) => {
        if (!opStats[opId]) opStats[opId] = { qty: 0, expected: 0 }
        opStats[opId].qty      += Number(val.quantity || 0)
        opStats[opId].expected += Number(val.expected  || 0)
      })
    })

    setRows(ops.map(op => {
      const s = opStats[op.id]
      const pct = s?.expected > 0 ? Math.round((s.qty / s.expected) * 100) : null
      return { op, qty: s?.qty || 0, expected: s?.expected || 0, pct }
    }))

    setLoading(false)
    setSearched(true)
  }

  const deptName = departments.find(d => d.id === selectedDept)?.name || ''
  const periodLabel = { today: 'Bugun', week: 'Bu hafta', month: 'Bu oy' }[period]

  const bottleneckIdx = (() => {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].pct !== null && rows[i].pct < 80) return i
    }
    return -1
  })()

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-indigo-700" />
        <h1 className="text-xl font-bold text-gray-800">Ishlab chiqarish zanjiri</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bo'lim</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Davr</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Bugun</option>
              <option value="week">Bu hafta</option>
              <option value="month">Bu oy</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading || !selectedDept}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? 'Yuklanmoqda...' : 'Ko\'rish'}
            </button>
          </div>
        </div>
      </div>

      {searched && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-gray-800">{deptName}</span>
              <span className="text-gray-400 text-sm ml-2">— {periodLabel}</span>
            </div>
            {bottleneckIdx >= 0 && (
              <span className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                Tiqilish: {rows[bottleneckIdx].op.name}
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Bu davr uchun ma'lumot topilmadi</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rows.map(({ op, qty, expected, pct }, idx) => {
                const c = pctStyle(pct)
                const barW = pct === null ? 0 : Math.min(pct, 100)
                const isBottleneck = idx === bottleneckIdx

                return (
                  <div key={op.id} className={`px-4 py-3 ${c.row}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs w-6 text-right shrink-0 ${isBottleneck ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isBottleneck && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className="text-sm font-medium text-gray-800 truncate">{op.name}</span>
                          </div>
                          <span className={`text-sm shrink-0 ${c.text}`}>
                            {pct !== null ? `${pct}%` : '—'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${c.bar}`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        {expected > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {qty.toLocaleString()} / {Math.round(expected).toLocaleString()} dona
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
