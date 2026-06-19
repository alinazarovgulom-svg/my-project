import { useState, useRef } from 'react'
import { useApp } from '../store/AppContext'
import { useNavigate } from 'react-router-dom'
import { Camera, Lock, LogOut, ChevronRight, Download, Settings, Shield } from 'lucide-react'
import { format } from 'date-fns'

export default function Profile() {
  const { user, setUser, transactions, debts, workspace, myRole, updatePresence } = useApp()
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
    <div className="min-h-screen bg-[#08080f] text-white pb-24">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#11102a] to-[#08080f] px-5 pt-4 pb-6 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-5">
          <div className="text-white text-[15px] font-black">Profil</div>
          <button onClick={() => nav('/settings')} className="w-8 h-8 rounded-[10px] bg-white/5 border border-white/6 flex items-center justify-center">
            <Settings size={14} className="text-gray-500" />
          </button>
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

        <div className="text-white text-[18px] font-black mb-0.5">{user?.name}</div>
        <div className="text-gray-500 text-[11px] mb-2">@{user?.username} · {myRole ? (myRole === 'admin' ? 'Admin' : myRole === 'kassir' ? 'Kassir' : 'Rahbar') : 'Shaxsiy'}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{background: statusColors[status], boxShadow: `0 0 8px ${statusColors[status]}`}}></div>
          <span className="text-[11px] font-bold" style={{color: statusColors[status]}}>
            {status === 'online' ? `Onlayn · bugun ${format(now, 'HH:mm')} dan beri` : statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-3 flex rounded-2xl overflow-hidden border border-white/[0.05] bg-white/[0.02]">
        <div className="flex-1 py-3 flex flex-col items-center border-r border-white/[0.04]">
          <div className="text-white text-[15px] font-black">{transactions.length}</div>
          <div className="text-gray-600 text-[8px] font-bold mt-0.5">Tranzaksiya</div>
        </div>
        <div className="flex-1 py-3 flex flex-col items-center border-r border-white/[0.04]">
          <div className="text-white text-[15px] font-black">{debts.filter(d => d.remaining > 0).length}</div>
          <div className="text-gray-600 text-[8px] font-bold mt-0.5">Faol qarz</div>
        </div>
        <div className="flex-1 py-3 flex flex-col items-center">
          <div className="text-green-400 text-[15px] font-black">{workspace?.members?.length || 1}</div>
          <div className="text-gray-600 text-[8px] font-bold mt-0.5">A'zolar</div>
        </div>
      </div>

      {/* Status picker */}
      <div className="mx-4 mb-4 flex gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl p-1.5">
        {(['online', 'away', 'hidden']).map(s => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black transition-all ${
              status === s ? 'bg-indigo-500/15 border border-indigo-500/20' : ''
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{background: statusColors[s], boxShadow: status === s ? `0 0 5px ${statusColors[s]}` : 'none'}}></div>
            <span style={{color: status === s ? '#818cf8' : '#374151'}}>{statusLabels[s]}</span>
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="px-4 mb-1">
        <div className="text-[9px] font-bold tracking-widest text-gray-700 uppercase mb-2">Hisob</div>
        <div className="bg-white/[0.025] border border-white/[0.045] rounded-2xl overflow-hidden">
          {[
            { icon: Lock, iconColor: '#4ade80', bg: 'rgba(34,197,94,0.08)', label: "Parolni o'zgartirish", action: () => nav('/settings') },
            { icon: Shield, iconColor: '#fbbf24', bg: 'rgba(251,191,36,0.08)', label: 'PIN kod', val: '●●●● faol', action: () => nav('/settings') },
            { icon: Download, iconColor: '#22d3ee', bg: 'rgba(6,182,212,0.08)', label: 'Zahira nusxa', action: () => nav('/settings') },
          ].map(({ icon: Icon, iconColor, bg, label, val, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.035] last:border-0">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{background: bg}}>
                <Icon size={15} strokeWidth={2} style={{stroke: iconColor}} />
              </div>
              <span className="text-[#d1d5db] text-[12px] font-medium flex-1 text-left">{label}</span>
              {val && <span className="text-gray-600 text-[10px]">{val}</span>}
              <ChevronRight size={13} className="text-gray-700" />
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="bg-white/[0.025] border border-white/[0.045] rounded-2xl overflow-hidden">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{background: 'rgba(239,68,68,0.08)'}}>
              <LogOut size={15} strokeWidth={2} className="text-red-400" />
            </div>
            <span className="text-red-400 text-[12px] font-medium">Chiqish</span>
          </button>
        </div>
      </div>
    </div>
  )
}
