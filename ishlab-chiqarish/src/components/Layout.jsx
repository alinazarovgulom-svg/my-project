import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentsContext'
import {
  LayoutDashboard, Settings, Users, ClipboardList, FileText,
  LogOut, Menu, X, ChevronDown, ChevronRight, Factory, Building2,
  CalendarCheck, AlarmClock, BarChart2,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/attendance', label: 'Davomat', icon: CalendarCheck },
  { to: '/operations', label: 'Operatsiyalar', icon: Settings },
  { to: '/employees', label: 'Xodimlar', icon: Users },
  { to: '/reports', label: 'Hisobotlar', icon: FileText },
  { to: '/monthly', label: 'Oylik hisobot', icon: BarChart2 },
  { to: '/shifts', label: 'Smena jadvali', icon: AlarmClock, adminOnly: true },
  { to: '/members', label: "A'zolar", icon: ClipboardList, adminOnly: true },
]

export default function Layout({ children }) {
  const { userDoc, signOut, can } = useAuth()
  const { departments } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(true)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-wide">KAFTIMDA</div>
            <div className="text-slate-400 text-xs">Ishlab chiqarish</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !can.manageMembers) return null
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 mx-2 py-2.5 rounded-lg text-sm transition-all mb-0.5 ${
                active
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Departments */}
        <button
          onClick={() => setDeptOpen(o => !o)}
          className="w-[calc(100%-16px)] flex items-center gap-3 px-4 mx-2 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all mt-1"
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Bo'limlar</span>
          {deptOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {deptOpen && can.manageMembers && (
          <Link
            to="/departments"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 pl-11 pr-4 mx-2 py-2 rounded-lg text-xs transition-all w-[calc(100%-16px)] ${
              location.pathname === '/departments'
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-slate-400 hover:bg-white/10 hover:text-slate-200 italic'
            }`}
          >
            + Boshqarish
          </Link>
        )}
        {deptOpen && visibleDepts.map(dept => {
          const active = location.pathname === `/department/${dept.id}`
          return (
            <Link
              key={dept.id}
              to={`/department/${dept.id}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 pl-11 pr-4 mx-2 py-2 rounded-lg text-xs transition-all w-[calc(100%-16px)] ${
                active
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {dept.name}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
            {userDoc?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{userDoc?.name}</div>
            <div className="text-slate-400 text-xs">{userDoc?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-xs transition-colors py-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          Chiqish
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-slate-900 flex-col flex-shrink-0 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile/tablet sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-900 flex flex-col z-50 shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile/tablet top bar */}
        <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shrink-0">
              <Factory className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm shrink-0">KAFTIMDA</span>
            {(() => {
              const p = location.pathname
              let title = ''
              if (p === '/attendance') title = 'Davomat'
              else if (p === '/operations') title = 'Operatsiyalar'
              else if (p === '/employees') title = 'Xodimlar'
              else if (p === '/reports') title = 'Hisobotlar'
              else if (p === '/monthly') title = 'Oylik hisobot'
              else if (p === '/shifts') title = 'Smena jadvali'
              else if (p === '/members') title = "A'zolar"
              else if (p === '/departments') title = "Bo'limlar"
              else if (p.startsWith('/department/')) {
                const dept = departments.find(d => d.id === p.split('/')[2])
                title = dept?.name || "Bo'lim"
              }
              if (!title) return null
              return (
                <>
                  <span className="text-slate-600 text-sm">·</span>
                  <span className="text-sm text-slate-400 truncate">{title}</span>
                </>
              )
            })()}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 shadow-lg">
          {[
            { to: '/', label: 'Bosh', icon: LayoutDashboard },
            { to: '/attendance', label: 'Davomat', icon: CalendarCheck },
            { to: '/reports', label: 'Hisobot', icon: FileText },
            { to: '/monthly', label: 'Oylik', icon: BarChart2 },
          ].map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
          <button
            onClick={() => {
              if (visibleDepts.length === 1) {
                navigate(`/department/${visibleDepts[0].id}`)
              } else {
                setSidebarOpen(true)
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
              location.pathname.startsWith('/department/') ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Bo'limlar
          </button>
        </nav>
      </div>
    </div>
  )
}
