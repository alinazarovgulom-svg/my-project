import { useState, useRef } from 'react'
import { useApp } from '../store/AppContext'
import { useNavigate } from 'react-router-dom'
import { Camera, Lock, LogOut, ChevronRight, Download, Settings, Shield, Sun, Moon } from 'lucide-react'
import { format } from 'date-fns'

export default function Profile() {
  const { user, setUser, transactions, debts, workspace, myRole, updatePresence, theme, toggleTheme } = useApp()
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

  const handleStatusChange = (s) => {
    setStatus(s)
    if (updatePresence) updatePresence(s === 'hidden' ? 'offline' : s)
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
  const now = new Date()

  return (
    <div className="min-h-screen pb-24 page-bg" style={{ color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div className="px-5 pt-4 pb-6 flex flex-col items-center" style={{ background: 'var(--bg-card2)', borderBottom: '1px solid var(--border-card)' }}>
        <div className="w-full flex items-center justify-between mb-5">
          <div className="text-[15px] font-black" style={{ color: 'var(--text-primary)' }}>Profil</div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-input)' }}
            >
              {theme === 'light'
                ? <Moon size={14} style={{ color: '#818cf8' }} />
                : <Sun size={14} style={{ color: '#fbbf24' }} />
              }
            </button>
            <button onClick={() => nav('/settings')} className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-input)' }}>
              <Settings size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div className="relative mb-3">
          <div
            className="w-[84px] h-[84px] rounded-full overflow-hidden flex items-center justify-center text-3xl font-black text-white"
            style={{background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#f97316,#ef4444)', boxShadow: '0 8px 28px rgba(249,115,22,0.4)'}}
          >
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : initials}
          </div>
          {/* Ring */}
          <div className="absolute inset-[-3px] rounded-full border-2 border-indigo-500/50 pointer-events-none"></div>
          {/* Camera btn */}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-indigo-600 border-2 border-[#08080f] flex items-center justify-center shadow-lg"
          >
            <Camera size={13} className="text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{user?.name}</span>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, filter: 'drop-shadow(0 0 5px rgba(99,102,241,0.8))' }}>
            <path d="M8 0.5L9.79 2.71L12.55 2.05L13.21 4.81L15.42 6.6L14.18 9.13L15.42 11.66L13.21 13.45L12.55 16.21L9.79 15.55L8 17.76L6.21 15.55L3.45 16.21L2.79 13.45L0.58 11.66L1.82 9.13L0.58 6.6L2.79 4.81L3.45 2.05L6.21 2.71L8 0.5Z" fill="url(#vg3)" />
            <path d="M5 8.5L7 10.5L11 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="vg3" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>@{user?.username} · {myRole ? (myRole === 'admin' ? 'Admin' : myRole === 'kassir' ? 'Kassir' : 'Rahbar') : 'Shaxsiy'}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{background: statusColors[status], boxShadow: `0 0 8px ${statusColors[status]}`}}></div>
          <span className="text-[11px] font-bold" style={{color: statusColors[status]}}>
            {status === 'online' ? `Onlayn · bugun ${format(now, 'HH:mm')} dan beri` : statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-3 flex rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}>
        <div className="flex-1 py-3 flex flex-col items-center" style={{ borderRight: '1px solid var(--border-soft)' }}>
          <div className="text-[15px] font-black" style={{ color: 'var(--text-primary)' }}>{transactions.length}</div>
          <div className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Tranzaksiya</div>
        </div>
        <div className="flex-1 py-3 flex flex-col items-center" style={{ borderRight: '1px solid var(--border-soft)' }}>
          <div className="text-[15px] font-black" style={{ color: 'var(--text-primary)' }}>{debts.filter(d => d.remaining > 0).length}</div>
          <div className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Faol qarz</div>
        </div>
        <div className="flex-1 py-3 flex flex-col items-center">
          <div className="text-green-500 text-[15px] font-black">{workspace?.members?.length || 1}</div>
          <div className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>A'zolar</div>
        </div>
      </div>

      {/* Status picker */}
      <div className="mx-4 mb-4 flex gap-1.5 rounded-2xl p-1.5" style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}>
        {(['online', 'away', 'hidden']).map(s => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black transition-all"
            style={{ background: status === s ? 'rgba(99,102,241,0.15)' : 'transparent', border: status === s ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[s], boxShadow: status === s ? `0 0 5px ${statusColors[s]}` : 'none' }}></div>
            <span style={{ color: status === s ? '#818cf8' : 'var(--text-secondary)' }}>{statusLabels[s]}</span>
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="px-4 mb-1">
        <div className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Hisob</div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}>
          {[
            { icon: Lock, iconColor: '#4ade80', bg: 'rgba(34,197,94,0.1)', label: "Parolni o'zgartirish", action: () => nav('/settings') },
            { icon: Shield, iconColor: '#fbbf24', bg: 'rgba(251,191,36,0.1)', label: 'PIN kod', val: '●●●● faol', action: () => nav('/settings') },
            { icon: Download, iconColor: '#22d3ee', bg: 'rgba(6,182,212,0.1)', label: 'Zahira nusxa', action: () => nav('/settings') },
          ].map(({ icon: Icon, iconColor, bg, label, val, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-3 last:border-0" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={15} strokeWidth={2} style={{ stroke: iconColor }} />
              </div>
              <span className="text-[12px] font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>{label}</span>
              {val && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{val}</span>}
              <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <LogOut size={15} strokeWidth={2} className="text-red-400" />
            </div>
            <span className="text-red-400 text-[12px] font-medium">Chiqish</span>
          </button>
        </div>
      </div>
    </div>
  )
}
