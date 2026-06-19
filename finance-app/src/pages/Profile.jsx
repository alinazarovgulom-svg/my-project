import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Camera, Lock, LogOut, ChevronRight, Download, Settings, Shield } from 'lucide-react'
import { format } from 'date-fns'

export default function Profile() {
  const { user, setUser, transactions, debts, workspace, myRole } = useApp()
  const nav = useNavigate()
  const [status, setStatus] = useState('online')
  const [avatarUrl, setAvatarUrl] = useState(() => {
    try { return localStorage.getItem(`finance_avatar_${user?.id}`) || null } catch { return null }
  })
  const fileRef = useRef()

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target.result
      setAvatarUrl(url)
      try { localStorage.setItem(`finance_avatar_${user?.id}`, url) } catch {}
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    if (!window.confirm('Chiqmoqchimisiz?')) return
    localStorage.removeItem('fin_current_user')
    setUser(null)
    nav('/login')
  }

  const statusColors = { online: '#22c55e', away: '#f59e0b', hidden: '#374151' }
  const statusLabels = { online: 'Onlayn', away: 'Band', hidden: "Ko'rinmas" }
  const initials = user?.name?.[0]?.toUpperCase() || 'U'
  const roleLabel = myRole === 'admin' ? 'Admin' : myRole === 'kassir' ? 'Kassir' : myRole === 'rahbar' ? 'Rahbar' : 'Shaxsiy'
  const now = new Date()

  return (
    <div className="min-h-screen pb-24" style={{ background: '#08080f', color: '#fff' }}>
      {/* Hero */}
      <div className="flex flex-col items-center px-5 pt-4 pb-5" style={{ background: 'linear-gradient(180deg,#11102a,#08080f)' }}>
        <div className="w-full flex items-center justify-between mb-5">
          <div className="text-white text-[15px] font-black">Profil</div>
          <button onClick={() => nav('/settings')} className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Settings size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Avatar */}
        <div className="relative mb-3">
          <div
            className="w-[84px] h-[84px] rounded-full overflow-hidden flex items-center justify-center text-[30px] font-black text-white"
            style={{
              background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#f97316,#ef4444)',
              boxShadow: '0 8px 28px rgba(249,115,22,0.4)',
            }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="absolute inset-[-3px] rounded-full pointer-events-none" style={{ border: '2.5px solid rgba(99,102,241,0.5)' }}></div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#6366f1', border: '2.5px solid #08080f', boxShadow: '0 2px 8px rgba(99,102,241,0.5)' }}
          >
            <Camera size={13} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="text-white text-[18px] font-black mb-0.5">{user?.name}</div>
        <div className="text-[11px] mb-2" style={{ color: '#4b5563' }}>@{user?.username} · {roleLabel}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: statusColors[status], boxShadow: `0 0 8px ${statusColors[status]}` }}></div>
          <span className="text-[11px] font-bold" style={{ color: statusColors[status] }}>
            {status === 'online' ? `Onlayn · bugun ${format(now, 'HH:mm')} dan beri` : statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-3 flex rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { val: transactions.length, label: 'Tranzaksiya' },
          { val: debts.filter(d => d.remaining > 0).length, label: 'Faol qarz', color: null },
          { val: workspace?.members?.length || 1, label: "A'zolar", color: '#4ade80' },
        ].map(({ val, label, color }, i) => (
          <div key={label} className="flex-1 py-3 flex flex-col items-center gap-0.5" style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div className="text-[15px] font-black" style={{ color: color || '#fff' }}>{val}</div>
            <div className="text-[8px] font-bold" style={{ color: '#374151' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Status picker */}
      <div className="mx-4 mb-4 flex gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {Object.entries(statusLabels).map(([s, lbl]) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all text-[9px] font-black"
            style={{
              background: status === s ? 'rgba(99,102,241,0.14)' : 'transparent',
              border: status === s ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              color: status === s ? '#818cf8' : '#374151',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[s], boxShadow: status === s ? `0 0 5px ${statusColors[s]}` : 'none' }}></div>
            {lbl}
          </button>
        ))}
      </div>

      {/* Settings rows */}
      <div className="px-4 mb-1">
        <div className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: '#2a2a3a' }}>Hisob</div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.045)' }}>
          {[
            { icon: Lock,     bg: 'rgba(34,197,94,0.08)',   stroke: '#4ade80',  label: "Parolni o'zgartirish", val: null },
            { icon: Shield,   bg: 'rgba(251,191,36,0.08)',  stroke: '#fbbf24',  label: 'PIN kod',               val: '●●●● faol' },
            { icon: Download, bg: 'rgba(6,182,212,0.08)',   stroke: '#22d3ee',  label: 'Zahira nusxa',          val: null },
          ].map(({ icon: Icon, bg, stroke, label, val }) => (
            <button key={label} onClick={() => nav('/settings')} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.035)' }}>
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={15} strokeWidth={2} style={{ stroke }} />
              </div>
              <span className="flex-1 text-[12px] font-medium" style={{ color: '#d1d5db' }}>{label}</span>
              {val && <span className="text-[10px]" style={{ color: '#374151' }}>{val}</span>}
              <ChevronRight size={13} style={{ stroke: '#2a2a3a' }} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.045)' }}>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <LogOut size={15} strokeWidth={2} className="text-red-400" />
            </div>
            <span className="text-red-400 text-[12px] font-medium">Chiqish</span>
          </button>
        </div>
      </div>
    </div>
  )
}
