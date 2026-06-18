import { NavLink } from 'react-router-dom'
import { Home, PackagePlus, PackageMinus, Boxes, BarChart3, Settings, Truck } from 'lucide-react'
import { useLang } from '../i18n/LangContext'

const navItems = [
  { to: '/', icon: Home, key: 'home', exact: true },
  { to: '/stock-in', icon: PackagePlus, key: 'stockIn' },
  { to: '/stock-out', icon: PackageMinus, key: 'stockOut' },
  { to: '/inventory', icon: Boxes, key: 'inventory' },
  { to: '/suppliers', icon: Truck, key: 'suppliers' },
  { to: '/reports', icon: BarChart3, key: 'reports' },
  { to: '/settings', icon: Settings, key: 'settings' },
]

export default function BottomNav() {
  const { t } = useLang()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around px-1 pt-2 pb-1 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, key, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all duration-200 min-w-0 ${
                isActive
                  ? 'text-primary-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-primary-500/20' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium truncate">{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
