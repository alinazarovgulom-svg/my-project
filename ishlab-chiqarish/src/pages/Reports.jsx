import { useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { exportPDF } from '../utils/pdf'
import { exportExcel } from '../utils/excel'
import { format } from 'date-fns'
import { Search, FileText, Download } from 'lucide-react'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function statusClass(qty, expected) {
  if (qty > expected) return 'bg-green-100 text-green-800'
  if (qty === expected) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

const today = format(new Date(), 'yyyy-MM-dd')

export default function Reports() {
  const { can } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [filterType, setFilterType] = useState('dept') // 'dept' | 'employee'
  const [selectedDept, setSelectedDept] = useState('')
  const [empSearch, setEmpSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [reportError, setReportError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const searchEmployees = async (val) => {
    setEmpSearch(val)
    const snap = await getDocs(collection(db, 'factory_employees'))
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setEmployees(
      val.length === 0
        ? all
        : all.filter(e => `${e.lastName} ${e.firstName}`.toLowerCase().includes(val.toLowerCase()))
    )
  }

  const loadReport = async () => {
    setLoading(true)
    setSearched(true)
    setReportError('')
    try {
      const constraints = [
        where('date', '>=', dateFrom),
        where('date', '<=', dateTo),
      ]

      const entriesSnap = await getDocs(query(collection(db, 'factory_work_entries'), ...constraints))

      const [empSnap, opSnap] = await Promise.all([
        getDocs(collection(db, 'factory_employees')),
        getDocs(collection(db, 'factory_operations')),
      ])
      const empMap = {}
      empSnap.forEach(d => { empMap[d.id] = d.data() })
      const opMap = {}
      opSnap.forEach(d => { opMap[d.id] = d.data() })

      const result = []
      entriesSnap.forEach(d => {
        const entry = d.data()
        // Filter by dept/employee in JS
        if (filterType === 'dept' && entry.departmentId !== selectedDept) return
        if (filterType === 'employee' && selectedEmp && entry.employeeId !== selectedEmp.id) return
        // Filter by time range in JS (inclusive range)
        if (startTime && entry.startTime < startTime) return
        if (endTime && entry.endTime > endTime) return
        const emp = empMap[entry.employeeId]
        if (!emp) return
        const hours = calcHours(entry.startTime, entry.endTime)
        const ops = entry.operations || {}
        Object.entries(ops).forEach(([opId, data]) => {
          const op = opMap[opId]
          if (!op) return
          const expected = op.norm * hours
          result.push({
            empName: `${emp.lastName} ${emp.firstName}`,
            deptName: getDeptName(emp.departmentId),
            opName: op.name,
            norm: op.norm,
            quantity: Number(data.quantity ?? 0),
            expected,
            note: data.note || '',
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })
        })
      })

      result.sort((a, b) =>
        a.empName.localeCompare(b.empName) ||
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.opName.localeCompare(b.opName)
      )
      setRows(result)
    } catch (e) {
      console.error(e)
      setReportError('Xatolik yuz berdi: ' + (e.message || e.code || 'Qayta urinib ko\'ring'))
    } finally {
      setLoading(false)
    }
  }

  const filterLabel = filterType === 'dept'
    ? getDeptName(selectedDept)
    : selectedEmp ? `${selectedEmp.lastName} ${selectedEmp.firstName}` : ''
  const filtersStr = `${dateFrom} — ${dateTo} · ${startTime}-${endTime}`

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Hisobotlar</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sanadan</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sanagacha</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Soatdan</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Soatgacha</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Filter type */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setFilterType('dept'); setSelectedEmp(null) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === 'dept' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Bo'lim bo'yicha
          </button>
          <button
            onClick={() => setFilterType('employee')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === 'employee' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Xodim bo'yicha
          </button>
        </div>

        {filterType === 'dept' ? (
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : (
          <div className="relative md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={selectedEmp ? `${selectedEmp.lastName} ${selectedEmp.firstName}` : empSearch}
              onChange={e => { setSelectedEmp(null); searchEmployees(e.target.value) }}
              onFocus={() => { if (!selectedEmp) searchEmployees(empSearch) }}
              onBlur={() => setTimeout(() => setEmployees([]), 200)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Xodim qidirish yoki bosing..."
            />
            {employees.length > 0 && !selectedEmp && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmp(emp); setEmployees([]) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <div>{emp.lastName} {emp.firstName}</div>
                    <div className="text-xs text-gray-400">{getDeptName(emp.departmentId)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={loadReport}
            disabled={loading || (filterType === 'employee' && !selectedEmp)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Yuklanmoqda...' : 'Hisobotni ko\'rish'}
          </button>
        </div>
      </div>

      {/* Error */}
      {reportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {reportError}
        </div>
      )}

      {/* Results */}
      {searched && (
        <>
          {/* Download buttons */}
          {can.downloadReports && rows.length > 0 && (
            <div className="flex gap-3 mb-4">
              <button
                onClick={async () => {
                  setPdfLoading(true)
                  try {
                    await exportPDF(rows, filtersStr, filterLabel)
                  } catch (e) {
                    console.error(e)
                    setReportError('PDF xatolik: ' + (e.message || 'Qayta urinib ko\'ring'))
                  } finally {
                    setPdfLoading(false)
                  }
                }}
                disabled={pdfLoading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <FileText className="w-4 h-4" /> {pdfLoading ? 'Yuklanmoqda...' : 'PDF'}
              </button>
              <button
                onClick={() => exportExcel(rows, filtersStr, filterLabel)}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Excel
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-3 mb-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
              Normadan yuqori
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
              Normaga teng
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
              Normadan past
            </span>
          </div>

          {/* Pivot Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {rows.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Tanlangan davr uchun ma'lumot topilmadi
              </div>
            ) : (() => {
              // Unique time slots sorted
              const slots = [...new Set(rows.map(r => `${r.date}|${r.startTime}–${r.endTime}`))].sort()
              const multiDate = new Set(rows.map(r => r.date)).size > 1

              // Group by employee + dept + operation
              const grouped = {}
              rows.forEach(r => {
                const key = `${r.empName}|||${r.deptName}|||${r.opName}`
                if (!grouped[key]) {
                  grouped[key] = { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, slots: {} }
                }
                grouped[key].slots[`${r.date}|${r.startTime}–${r.endTime}`] = {
                  quantity: r.quantity, expected: r.expected, note: r.note,
                }
              })
              // Efficiency per employee for ranking
              const empEff = {}
              rows.forEach(r => {
                if (!empEff[r.empName]) empEff[r.empName] = { done: 0, exp: 0 }
                empEff[r.empName].done += Number(r.quantity || 0)
                empEff[r.empName].exp  += Number(r.expected  || 0)
              })
              const getEff = name => empEff[name]?.exp > 0
                ? Math.round((empEff[name].done / empEff[name].exp) * 100) : 0

              const gRows = Object.values(grouped).sort((a, b) =>
                getEff(b.empName) - getEff(a.empName) ||
                a.empName.localeCompare(b.empName) ||
                a.opName.localeCompare(b.opName)
              )

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">#</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Xodim</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Bo'lim</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Operatsiya</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Norma</th>
                        {slots.map(s => {
                          const [date, time] = s.split('|')
                          return (
                            <th key={s} className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap min-w-[90px]">
                              {multiDate && <div className="text-xs text-gray-400 font-normal">{date}</div>}
                              <div className="font-mono text-xs">{time}</div>
                            </th>
                          )
                        })}
                        <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gRows.map((r, i) => {
                        const isNewEmp = i === 0 || gRows[i - 1].empName !== r.empName
                        const totalDone = slots.reduce((s, k) => s + (r.slots[k]?.quantity || 0), 0)
                        const totalExp = slots.reduce((s, k) => s + (r.slots[k]?.expected || 0), 0)
                        return (
                          <tr key={i} className={`hover:bg-gray-50 ${isNewEmp && i > 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-100'}`}>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                              {isNewEmp ? (
                                <span className="flex items-center gap-2">
                                  {r.empName}
                                  {(() => {
                                    const e = getEff(r.empName)
                                    const cls = e >= 100 ? 'bg-green-100 text-green-700' : e >= 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                    return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{e}%</span>
                                  })()}
                                </span>
                              ) : ''}
                            </td>
                            <td className="px-4 py-2.5">
                              {isNewEmp && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">{r.deptName}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{r.opName}</td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{r.norm} dona/soat</td>
                            {slots.map(k => {
                              const d = r.slots[k]
                              if (!d) return (
                                <td key={k} className="px-3 py-2.5 text-center text-gray-200 text-xs">—</td>
                              )
                              const cls = statusClass(d.quantity, d.expected)
                              return (
                                <td key={k} className="px-3 py-2.5 text-center">
                                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${cls}`}>{d.quantity}</span>
                                  <div className="text-xs text-gray-400 mt-0.5">{d.expected.toFixed(0)}</div>
                                </td>
                              )
                            })}
                            <td className="px-4 py-2.5 text-center">
                              <span className={`font-bold px-2 py-0.5 rounded text-xs ${statusClass(totalDone, totalExp)}`}>{totalDone}</span>
                              <div className="text-xs text-gray-400 mt-0.5">{totalExp.toFixed(0)}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
