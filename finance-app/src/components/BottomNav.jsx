import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, Users, RefreshCw, BarChart2, Settings } from 'lucide-react'

const links = [
  { to: '/', icon: Home, label: 'Bosh' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Kirim/Chiqim' },
  { to: '/debts', icon: Users, label: 'Qarzlar' },
  { to: '/exchange', icon: RefreshCw, label: 'Valyuta' },
  { to: '/reports', icon: BarChart2, label: 'Hisobot' },
  { to: '/settings', icon: Settings, label: 'Sozlama' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-dark-800 border-t border-white/5 z-50">
      <div className="flex items-center justify-around px-1 py-2 pb-safe">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-0 ${
                isActive ? 'text-blue-400' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] leading-tight truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
