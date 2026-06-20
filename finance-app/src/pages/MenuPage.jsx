import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ArrowLeftRight, Users, BarChart2, RefreshCw, Handshake, Building2, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function MenuPage() {
  const { user, workspace, myRole, onlineMembers } = useApp()
  const nav = useNavigate()

  const sections = [
    { to: '/transactions', icon: ArrowLeftRight, label: 'Kirim / Chiqim', sub: 'Barcha to\'lovlar', accent: '#6366f1' },
    { to: '/debts', icon: Users, label: 'Qarzlar', sub: 'Bergan va olgan', accent: '#22c55e' },
    { to: '/hamkorlar', icon: Handshake, label: 'Hamkorlar', sub: 'Mijozlar', accent: '#f97316' },
    { to: '/reports', icon: BarChart2, label: 'Hisobot', sub: 'Grafik va tahlil', accent: '#a855f7' },
    { to: '/exchange', icon: RefreshCw, label: 'Valyuta', sub: 'USD · EUR · RUB', accent: '#06b6d4' },
    { to: '/korxona', icon: Building2, label: 'Korxona', sub: workspace ? `${workspace.members?.length || 0} a'zo` : 'Jamoa', accent: '#e879f9' },
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
            <div className="flex items-center gap-1 leading-tight">
            <span className="text-white text-[13px] font-bold">{user?.name}</span>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0, filter: 'drop-shadow(0 0 3px rgba(99,102,241,0.7))' }}>
              <path d="M8 0.5L9.79 2.71L12.55 2.05L13.21 4.81L15.42 6.6L14.18 9.13L15.42 11.66L13.21 13.45L12.55 16.21L9.79 15.55L8 17.76L6.21 15.55L3.45 16.21L2.79 13.45L0.58 11.66L1.82 9.13L0.58 6.6L2.79 4.81L3.45 2.05L6.21 2.71L8 0.5Z" fill="url(#vg2)" />
              <path d="M5 8.5L7 10.5L11 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="vg2" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-white/50 text-[13px] font-bold">· {myRole ? (myRole === 'admin' ? 'Admin' : myRole === 'kassir' ? 'Kassir' : 'Rahbar') : 'Shaxsiy'}</span>
          </div>
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
      <div className="grid grid-cols-2 gap-2.5 px-4 stagger">
        {sections.map(({ to, icon: Icon, label, sub, accent }) => (
          <button
            key={to}
            onClick={() => nav(to)}
            className="relative overflow-hidden rounded-[22px] p-4 text-left min-h-[120px] flex flex-col"
            style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}
          >
            {/* subtle accent glow */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20" style={{ background: accent }} />
            {/* icon */}
            <div className="w-10 h-10 rounded-[13px] flex items-center justify-center mb-3 relative z-10" style={{ background: `${accent}22` }}>
              <Icon size={18} strokeWidth={2} style={{ color: accent }} />
            </div>
            <div className="text-[12px] font-black relative z-10 leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="text-[9px] mt-1 relative z-10" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            <div className="absolute bottom-3 right-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
