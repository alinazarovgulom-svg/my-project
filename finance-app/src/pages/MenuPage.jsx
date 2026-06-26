import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { ArrowLeftRight, Users, BarChart2, RefreshCw, Handshake, Building2, Search, Car } from 'lucide-react'
import VerifiedBadge from '../components/VerifiedBadge'
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
    { to: '/haydovchilar', icon: Car, label: 'Haydovchilar', sub: 'Davomat · Ish haqi', accent: '#f59e0b' },
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
            <VerifiedBadge size={13} />
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
