import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { BarChart2, Download } from 'lucide-react'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function monthDates(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export default function MonthlyReport() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDept, setSelectedDept] = useState('')
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

    const { from, to } = monthDates(year, month)

    const [entriesSnap, empSnap, absSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'factory_work_entries'),
        where('departmentId', '==', selectedDept),
        where('date', '>=', from),
        where('date', '<=', to),
      )),
      getDocs(query(collection(db, 'factory_employees'), where('departmentId', '==', selectedDept))),
      getDocs(query(
        collection(db, 'factory_absences'),
        where('departmentId', '==', selectedDept),
        where('date', '>=', from),
        where('date', '<=', to),
      )),
    ])

    const empMap = {}
    empSnap.docs.forEach(d => { empMap[d.id] = { id: d.id, ...d.data() } })

    const absMap = {}
    absSnap.docs.forEach(d => {
      const a = d.data()
      if (!absMap[a.employeeId]) absMap[a.employeeId] = 0
      absMap[a.employeeId]++
    })

    const summary = {}
    entriesSnap.docs.forEach(d => {
      const e = d.data()
      const empId = e.employeeId
      if (!empMap[empId]) return
      const bm = e.breakMinutes || 0
      const h = Math.max(0, calcHours(e.startTime, e.endTime) - bm / 60)
      if (!summary[empId]) {
        summary[empId] = { empId, totalHours: 0, totalDays: 0, totalQty: 0, totalExpected: 0, totalPay: 0 }
      }
      summary[empId].totalHours += h
      summary[empId].totalDays++
      summary[empId].totalPay += Number(e.totalPay || 0)
      const ops = e.operations || {}
      Object.values(ops).forEach(op => {
        summary[empId].totalQty += Number(op.quantity || 0)
        summary[empId].totalExpected += Number(op.expected || 0)
      })
    })

    const result = Object.values(summary).map(s => {
      const emp = empMap[s.empId]
      const pct = s.totalExpected > 0 ? Math.round((s.totalQty / s.totalExpected) * 100) : null
      return {
        ...s,
        name: `${emp.lastName} ${emp.firstName}`,
        absentDays: absMap[s.empId] || 0,
        pct,
      }
    }).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))

    setRows(result)
    setLoading(false)
    setSearched(true)
  }

  const pctColor = (pct) => {
    if (pct === null) return 'text-gray-400'
    if (pct > 100) return 'text-green-700 font-bold'
    if (pct === 100) return 'text-indigo-700 font-bold'
    if (pct >= 95) return 'text-yellow-700 font-semibold'
    return 'text-red-700 font-semibold'
  }

  const { from, to } = monthDates(year, month)
  const monthName = new Date(year, month - 1, 1).toLocaleString('uz-UZ', { month: 'long', year: 'numeric' })

  const handleExport = () => {
    if (!rows.length) return
    const lines = [
      `${getDeptName(selectedDept)} — ${monthName}`,
      '',
      ['#', 'Xodim', 'Ish kunlari', 'Soat', 'Bajarilgan', 'Kutilgan', 'Foiz %', 'Davomat', 'Maosh (so\'m)'].join('\t'),
      ...rows.map((r, i) => [
        i + 1,
        r.name,
        r.totalDays,
        r.totalHours.toFixed(1),
        r.totalQty,
        Math.round(r.totalExpected),
        r.pct !== null ? r.pct + '%' : '—',
        r.absentDays > 0 ? `${r.absentDays} kun kelmagan` : 'To\'liq',
        r.totalPay > 0 ? r.totalPay.toLocaleString() : '—',
      ].join('\t')),
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `oylik-hisobot-${from}-${to}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = [now.getFullYear() - 1, now.getFullYear()]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-700" />
          <h1 className="text-xl font-bold text-gray-800">Oylik hisobot</h1>
        </div>
        {searched && rows.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Yil</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Oy</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(year, m - 1, 1).toLocaleString('uz-UZ', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
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
          <div className="flex items-end">
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

      {/* Table */}
      {searched && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800">{getDeptName(selectedDept)}</span>
              <span className="text-gray-400 text-sm ml-2">— {monthName}</span>
            </div>
            <span className="text-sm text-gray-500">{rows.length} xodim</span>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Bu oy uchun ma'lumot topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Xodim</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Ish kunlari</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Soat</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Bajarilgan</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Kutilgan</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Foiz</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Davomat</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Maosh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={r.empId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalDays}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.totalQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{Math.round(r.totalExpected).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-center ${pctColor(r.pct)}`}>
                        {r.pct !== null ? `${r.pct}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.absentDays > 0
                          ? <span className="text-red-600 text-xs">{r.absentDays} kun kelmagan</span>
                          : <span className="text-green-600 text-xs">To'liq</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {r.totalPay > 0 ? `${r.totalPay.toLocaleString()} so'm` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 1 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Jami</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {rows.reduce((s, r) => s + r.totalQty, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {Math.round(rows.reduce((s, r) => s + r.totalExpected, 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {(() => {
                          const tq = rows.reduce((s, r) => s + r.totalQty, 0)
                          const te = rows.reduce((s, r) => s + r.totalExpected, 0)
                          return te > 0 ? `${Math.round((tq / te) * 100)}%` : '—'
                        })()}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {rows.reduce((s, r) => s + r.totalPay, 0) > 0
                          ? `${rows.reduce((s, r) => s + r.totalPay, 0).toLocaleString()} so'm`
                          : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
