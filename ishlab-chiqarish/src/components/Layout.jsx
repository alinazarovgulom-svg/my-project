import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentsContext'
import {
  LayoutDashboard, Settings, Users, ClipboardList, FileText,
  LogOut, Menu, X, ChevronDown, ChevronRight, Factory, Building2,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/operations', label: 'Operatsiyalar', icon: Settings },
  { to: '/employees', label: 'Xodimlar', icon: Users },
  { to: '/reports', label: 'Hisobotlar', icon: FileText },
  { to: '/members', label: "A'zolar", icon: ClipboardList, adminOnly: true },
]

export default function Layout({ children }) {
  const { userDoc, signOut, can } = useAuth()
  const { departments } = useDepartments()
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
      <div className="p-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <Factory className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">KAFTIMDA</div>
            <div className="text-blue-300 text-xs">Ishlab chiqarish</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !can.manageMembers) return null
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                active
                  ? 'bg-blue-700 text-white font-medium'
                  : 'text-blue-100 hover:bg-blue-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}

        {/* Departments */}
        <button
          onClick={() => setDeptOpen(o => !o)}
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-blue-100 hover:bg-blue-700/50 transition-colors"
        >
          <Building2 className="w-4 h-4" />
          <span className="flex-1 text-left">Bo'limlar</span>
          {deptOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {deptOpen && can.manageMembers && (
          <Link
            to="/departments"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 pl-11 pr-5 py-2.5 text-xs transition-colors ${
              location.pathname === '/departments'
                ? 'bg-blue-700 text-white font-medium'
                : 'text-blue-300 hover:bg-blue-700/40 italic'
            }`}
          >
            + Boshqarish
          </Link>
        )}
        {deptOpen && departments.map(dept => {
          const active = location.pathname === `/department/${dept.id}`
          return (
            <Link
              key={dept.id}
              to={`/department/${dept.id}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 pl-11 pr-5 py-2.5 text-xs transition-colors ${
                active
                  ? 'bg-blue-700 text-white font-medium'
                  : 'text-blue-200 hover:bg-blue-700/40'
              }`}
            >
              {dept.name}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {userDoc?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{userDoc?.name}</div>
            <div className="text-blue-300 text-xs">{userDoc?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-blue-200 hover:text-white text-xs transition-colors py-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          Chiqish
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-blue-800 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-blue-800 flex flex-col z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden bg-blue-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">KAFTIMDA</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
