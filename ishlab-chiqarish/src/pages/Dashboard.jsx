import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { DEPARTMENTS } from '../data/departments'
import { format } from 'date-fns'
import { Users, Settings, TrendingUp, ChevronRight } from 'lucide-react'

const today = format(new Date(), 'yyyy-MM-dd')

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

      const empCount = empSnap.size
      const opCount = opSnap.size

      // Today's entries per dept
      const entriesSnap = await getDocs(
        query(collection(db, 'factory_work_entries'), where('date', '==', today))
      )

      const deptData = {}
      DEPARTMENTS.forEach(d => { deptData[d.id] = { entries: 0, employees: 0 } })

      // Count employees per dept
      empSnap.forEach(doc => {
        const deptId = doc.data().departmentId
        if (deptData[deptId]) deptData[deptId].employees++
      })

      // Count entries per dept
      const seenEmp = {}
      entriesSnap.forEach(doc => {
        const d = doc.data()
        const key = `${d.departmentId}_${d.employeeId}`
        if (!seenEmp[key]) {
          seenEmp[key] = true
          if (deptData[d.departmentId]) deptData[d.departmentId].entries++
        }
      })

      setStats({ employees: empCount, operations: opCount })
      setDeptStats(deptData)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
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
              <Settings className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{loading ? '—' : stats.operations}</div>
              <div className="text-xs text-gray-500">Operatsiyalar</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{format(new Date(), 'dd.MM.yyyy')}</div>
              <div className="text-xs text-gray-500">Bugun</div>
            </div>
          </div>
        </div>
      </div>

      {/* Departments grid */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Bo'limlar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEPARTMENTS.map(dept => {
          const ds = deptStats[dept.id] || { entries: 0, employees: 0 }
          const covered = ds.employees ? Math.round((ds.entries / ds.employees) * 100) : 0
          return (
            <Link
              key={dept.id}
              to={`/department/${dept.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  {ds.employees} xodim
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-sm font-medium text-gray-800 mb-3">{dept.name}</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(covered, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Bugun: {ds.entries}/{ds.employees} kishi
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
