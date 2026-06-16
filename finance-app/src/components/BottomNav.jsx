import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, Users, RefreshCw, BarChart2, Settings, UsersRound } from 'lucide-react'
import { useLang } from '../i18n/LangContext'

export default function BottomNav() {
  const { t } = useLang()

  const links = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/transactions', icon: ArrowLeftRight, label: t('incomeExpense') },
    { to: '/debts', icon: Users, label: t('debts') },
    { to: '/exchange', icon: RefreshCw, label: t('exchange') },
    { to: '/reports', icon: BarChart2, label: t('reports') },
    { to: '/family', icon: UsersRound, label: t('family') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-dark-800 border-t border-white/5 z-50">
      <div className="flex items-center justify-around px-1 py-2 pb-safe">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-colors min-w-0 ${
                isActive
                  ? (to === '/family' ? 'text-purple-400' : 'text-blue-400')
                  : 'text-gray-500'
              }`
            }
          >
            <Icon size={18} />
            <span className="text-[9px] leading-tight truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
