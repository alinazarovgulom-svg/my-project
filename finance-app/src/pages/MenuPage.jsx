import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ArrowLeftRight, Users, BarChart2, RefreshCw, Handshake, Building2, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function MenuPage() {
  const { user, workspace, myRole, onlineMembers } = useApp()
  const nav = useNavigate()

  const sections = [
    { to: '/transactions', icon: ArrowLeftRight, label: 'Kirim / Chiqim', sub: 'Barcha to\'lovlar', color: 'from-[#1e1b4b] to-[#312e81]', glow: '#6366f1', badge: null },
    { to: '/debts', icon: Users, label: 'Qarzlar', sub: 'Bergan va olgan', color: 'from-[#052e16] to-[#14532d]', glow: '#22c55e', badge: null },
    { to: '/hamkorlar', icon: Handshake, label: 'Hamkorlar', sub: 'Mijozlar', color: 'from-[#431407] to-[#7c2d12]', glow: '#f97316', badge: null },
    { to: '/reports', icon: BarChart2, label: 'Hisobot', sub: 'Grafik va tahlil', color: 'from-[#2e1065] to-[#4c1d95]', glow: '#a855f7', badge: null },
    { to: '/exchange', icon: RefreshCw, label: 'Valyuta', sub: 'USD · EUR · RUB', color: 'from-[#083344] to-[#164e63]', glow: '#06b6d4', badge: null },
    { to: '/korxona', icon: Building2, label: 'Korxona', sub: workspace ? `${workspace.members?.length || 0} a'zo` : 'Jamoa', color: 'from-[#4a044e] to-[#7e1d7e]', glow: '#e879f9', badge: null },
  ]

  const now = new Date()
  const hour = now.getHours()
  const timeLabel = hour < 12 ? 'Xayrli tong' : hour < 17 ? 'Xayrli kun' : 'Xayrli kech'

  return (
    <div className="min-h-screen pb-24 page-bg" style={{ color: 'var(--text-primary)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          {/* Avatar with online ring */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-sm font-black text-white ring-2 ring-green-500 ring-offset-1 ring-offset-[#08080f]">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#08080f]"></div>
          </div>
          <div>
            <div className="text-white text-[13px] font-bold leading-tight">{user?.name} · {myRole ? (myRole === 'admin' ? 'Admin' : myRole === 'kassir' ? 'Kassir' : 'Rahbar') : 'Shaxsiy'}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{boxShadow:'0 0 5px rgba(34,197,94,0.8)'}}></div>
              <span className="text-green-400 text-[10px] font-semibold">Onlayn · {format(now, 'HH:mm')} dan beri</span>
            </div>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/6 flex items-center justify-center">
          <Search size={15} className="text-gray-500" />
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="text-[10px] font-bold tracking-widest text-gray-700 uppercase">Bo'limlar</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5 px-4">
        {sections.map(({ to, icon: Icon, label, sub, color, glow, badge }) => (
          <button
            key={to}
            onClick={() => nav(to)}
            className={`relative overflow-hidden rounded-[22px] p-4 text-left bg-gradient-to-br ${color} border border-white/[0.035] min-h-[120px] flex flex-col`}
            style={{ '--glow': glow }}
          >
            {/* glow */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl opacity-60" style={{background: glow}}></div>
            {/* icon */}
            <div className="w-10 h-10 rounded-[13px] bg-white/[0.14] flex items-center justify-center mb-3 relative z-10">
              <Icon size={18} className="text-white" strokeWidth={2} />
            </div>
            <div className="text-white text-[12px] font-black relative z-10 leading-tight">{label}</div>
            <div className="text-white/40 text-[9px] mt-1 relative z-10">{sub}</div>
            {badge && (
              <div className="absolute top-3 right-3 bg-white/[0.16] text-white text-[9px] font-black px-2 py-0.5 rounded-full">{badge}</div>
            )}
            <div className="absolute bottom-3 right-3 opacity-20">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
