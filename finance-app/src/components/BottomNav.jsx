import { NavLink, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Bell, User } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()

  const links = [
    { to: '/', icon: Home, label: 'Asosiy', exact: true },
    { to: '/menu', icon: LayoutGrid, label: 'Menyu', exact: false },
    { to: '/notifications', icon: Bell, label: 'Xabar', exact: false },
    { to: '/profile', icon: User, label: 'Profil', exact: false },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50"
      style={{background:'var(--nav-bg)', backdropFilter:'blur(30px)', borderTop:'1px solid var(--nav-border)'}}>
      <div className="flex items-center justify-around px-2 pt-2 pb-3" style={{paddingBottom:'max(12px,env(safe-area-inset-bottom))'}}>
        {links.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all relative"
              style={{background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent'}}>
              <Icon size={21} strokeWidth={2} style={{stroke: isActive ? '#818cf8' : '#2d2d3d', fill:'none'}} />
              <span className="text-[9px] font-bold" style={{color: isActive ? '#818cf8' : '#2d2d3d'}}>{label}</span>
              {isActive && <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-indigo-500"></div>}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
