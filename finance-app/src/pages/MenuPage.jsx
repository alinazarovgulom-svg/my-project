import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ArrowLeftRight, Users, BarChart2, RefreshCw, Handshake, Building2, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function MenuPage() {
  const { user, workspace, myRole } = useApp()
  const nav = useNavigate()
  const now = new Date()

  const avatarUrl = (() => { try { return localStorage.getItem(`finance_avatar_${user?.id}`) } catch { return null } })()
  const initials = user?.name?.[0]?.toUpperCase() || 'U'
  const roleLabel = myRole === 'admin' ? 'Admin' : myRole === 'kassir' ? 'Kassir' : myRole === 'rahbar' ? 'Rahbar' : 'Shaxsiy'

  const sections = [
    { to: '/transactions', icon: ArrowLeftRight, label: 'Kirim / Chiqim', sub: "Barcha to'lovlar", grad: 'linear-gradient(145deg,#1e1b4b,#312e81)', glow: '#6366f1' },
    { to: '/debts',        icon: Users,          label: 'Qarzlar',         sub: 'Bergan va olgan', grad: 'linear-gradient(145deg,#052e16,#14532d)', glow: '#22c55e' },
    { to: '/hamkorlar',    icon: Handshake,       label: 'Hamkorlar',       sub: 'Mijozlar',        grad: 'linear-gradient(145deg,#431407,#7c2d12)', glow: '#f97316' },
    { to: '/reports',      icon: BarChart2,        label: 'Hisobot',         sub: 'Grafik va tahlil',grad: 'linear-gradient(145deg,#2e1065,#4c1d95)', glow: '#a855f7' },
    { to: '/exchange',     icon: RefreshCw,        label: 'Valyuta',         sub: 'USD · EUR · RUB', grad: 'linear-gradient(145deg,#083344,#164e63)', glow: '#06b6d4' },
    { to: '/korxona',      icon: Building2,        label: 'Korxona',         sub: workspace ? `${workspace.members?.length || 0} a'zo` : 'Jamoa', grad: 'linear-gradient(145deg,#4a044e,#7e1d7e)', glow: '#e879f9' },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ background: '#08080f' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[14px] font-black text-white"
              style={{
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#f97316,#ef4444)',
                boxShadow: '0 0 0 2px #22c55e, 0 0 0 4px #08080f',
              }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2" style={{ borderColor: '#08080f' }}></div>
          </div>
          <div>
            <div className="text-white text-[13px] font-bold leading-tight">{user?.name} · {roleLabel}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 5px rgba(34,197,94,0.8)' }}></div>
              <span className="text-green-400 text-[9px] font-semibold">Onlayn · {format(now, 'HH:mm')} dan beri</span>
            </div>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={15} className="text-gray-500" />
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#2a2a3a' }}>Bo'limlar</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5 px-4">
        {sections.map(({ to, icon: Icon, label, sub, grad, glow }) => (
          <button
            key={to}
            onClick={() => nav(to)}
            className="relative overflow-hidden text-left flex flex-col"
            style={{
              background: grad,
              borderRadius: 22,
              padding: '16px 14px',
              border: '1px solid rgba(255,255,255,0.035)',
              minHeight: 120,
            }}
          >
            {/* glow blob */}
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full blur-xl" style={{ background: glow, opacity: 0.6 }}></div>
            {/* icon */}
            <div className="relative z-10 w-10 h-10 rounded-[13px] flex items-center justify-center mb-2.5" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <Icon size={18} className="text-white" strokeWidth={2} />
            </div>
            <div className="relative z-10 text-white text-[12px] font-black leading-tight">{label}</div>
            <div className="relative z-10 mt-1 text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</div>
            {/* arrow */}
            <div className="absolute bottom-3 right-3 z-10" style={{ opacity: 0.2 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
