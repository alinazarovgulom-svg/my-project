import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import {
  LayoutDashboard, Users, Calculator, CreditCard,
  TrendingDown, Receipt, BarChart3, Settings, LogOut, User
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','buxgalter','xodim'] },
  { to: '/xodimlar', label: 'Xodimlar', icon: Users, roles: ['admin','buxgalter'] },
  { to: '/oylik', label: 'Oylik hisob', icon: Calculator, roles: ['admin','buxgalter'] },
  { to: '/tolovlar', label: "To'lovlar", icon: CreditCard, roles: ['admin','buxgalter'] },
  { to: '/chiqimlar', label: 'Chiqimlar', icon: TrendingDown, roles: ['admin','buxgalter'] },
  { to: '/chek', label: 'Chek', icon: Receipt, roles: ['admin','buxgalter'] },
  { to: '/hisobot', label: 'Hisobot', icon: BarChart3, roles: ['admin','buxgalter'] },
  { to: '/sozlamalar', label: 'Sozlamalar', icon: Settings, roles: ['admin'] },
]

export default function Layout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const rol = profile?.rol || 'xodim'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-slate-700">
          <h1 className="text-lg font-bold text-emerald-400">Maosh Tizimi</h1>
          <p className="text-xs text-slate-400 mt-0.5">2026</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.filter(n => n.roles.includes(rol)).map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <n.icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <button
            onClick={() => navigate('/profil')}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded"
          >
            <User size={14} />
            <div className="text-left">
              <div className="font-medium truncate">{profile?.ism || 'Foydalanuvchi'}</div>
              <div className="text-xs text-slate-500 capitalize">{rol}</div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-sm text-red-400 hover:bg-slate-800 rounded"
          >
            <LogOut size={14} /> Chiqish
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
