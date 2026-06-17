import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { createTeam, joinTeam, leaveTeam, updateMemberRole, removeMember } from '../store/family'
import { Users, Plus, LogIn, Copy, LogOut, Shield, Eye, UserCheck, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'

const ROLES = ['admin', 'manager', 'viewer']

export default function Family() {
  const { user, team, teamId, userRole, refreshTeam } = useApp()
  const { t } = useLang()
  const [createModal, setCreateModal] = useState(false)
  const [joinModal, setJoinModal] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!teamName.trim()) return
    setLoading(true)
    await createTeam(user.id, user.username, user.fullName, teamName)
    refreshTeam()
    setLoading(false)
    setCreateModal(false)
    setTeamName('')
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')
    const res = await joinTeam(joinCode.trim(), user.id, user.username, user.fullName)
    if (res.error) { setError(res.error); setLoading(false); return }
    refreshTeam()
    setLoading(false)
    setJoinModal(false)
    setJoinCode('')
  }

  const handleLeave = async () => {
    if (!confirm(t('leaveTeam') + '?')) return
    await leaveTeam(teamId, user.id)
    refreshTeam()
  }

  const handleRoleChange = async (targetId, role) => {
    await updateMemberRole(teamId, targetId, role, user.id)
  }

  const handleRemove = async (targetId) => {
    if (!confirm(t('removeBtn') + '?')) return
    await removeMember(teamId, targetId, user.id)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(teamId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roleIcon = (role) => {
    if (role === 'admin') return <Shield size={14} className="text-primary-400" />
    if (role === 'viewer') return <Eye size={14} className="text-slate-400" />
    if (role === 'manager') return <UserCheck size={14} className="text-blue-400" />
    return <UserCheck size={14} className="text-blue-400" />
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <div className="bg-slate-900 px-5 pt-14 pb-6">
          <h1 className="text-white text-xl font-bold">{t('teamMode')}</h1>
        </div>
        <div className="px-4 pt-8 space-y-4">
          <div className="bg-slate-800/40 rounded-3xl p-8 flex flex-col items-center text-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Users size={32} className="text-primary-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">{t('teamMode')}</h2>
            <p className="text-slate-400 text-sm">Bir necha omborchi bilan real vaqtda ishlang</p>
          </div>

          <button onClick={() => setCreateModal(true)}
            className="w-full flex items-center gap-3 bg-primary-500/10 border border-primary-500/20 rounded-2xl p-5 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Plus size={20} className="text-primary-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">{t('createTeam')}</p>
              <p className="text-slate-400 text-xs">Yangi jamoa yaratib, a'zolarni qo'shing</p>
            </div>
          </button>

          <button onClick={() => setJoinModal(true)}
            className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-2xl p-5 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center">
              <LogIn size={20} className="text-slate-300" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">{t('joinTeam')}</p>
              <p className="text-slate-400 text-xs">Taklif kodi orqali jamoaga kirish</p>
            </div>
          </button>
        </div>

        <Modal open={createModal} onClose={() => setCreateModal(false)} title={t('createTeam')}>
          <div className="space-y-3 pb-4">
            <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder={t('teamName')}
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
            <button onClick={handleCreate} disabled={loading}
              className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Yuklanmoqda...' : t('createTeam')}
            </button>
          </div>
        </Modal>

        <Modal open={joinModal} onClose={() => setJoinModal(false)} title={t('joinTeam')}>
          <div className="space-y-3 pb-4">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="WH-123456"
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleJoin} disabled={loading}
              className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Tekshirilmoqda...' : t('joinTeam')}
            </button>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <h1 className="text-white text-xl font-bold">{t('teamMode')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Team card */}
        <div className="bg-gradient-to-br from-primary-600/20 to-emerald-600/10 border border-primary-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-bold text-lg">{team.name}</p>
              <p className="text-slate-400 text-sm">{team.members?.length || 0} a'zo</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Users size={24} className="text-primary-400" />
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">{t('inviteCode')}</p>
              <p className="text-white font-mono font-bold tracking-wider">{teamId}</p>
            </div>
            <button onClick={copyCode} className="flex items-center gap-1.5 bg-primary-500/20 px-3 py-2 rounded-xl text-primary-400 text-xs">
              <Copy size={14} />
              {copied ? t('copied') : 'Nusxa'}
            </button>
          </div>
        </div>

        {/* Members */}
        <div>
          <h2 className="text-white font-semibold mb-3">{t('members')}</h2>
          <div className="space-y-2">
            {team.members?.map(m => (
              <div key={m.userId} className="bg-slate-800/60 rounded-xl px-4 py-3.5 border border-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
                      {(m.fullName || m.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{m.fullName || m.username}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {roleIcon(m.role)}
                        <span className="text-slate-400 text-xs">{t(m.role)}</span>
                        {m.userId === user.id && <span className="text-primary-400 text-xs">(Siz)</span>}
                      </div>
                    </div>
                  </div>

                  {userRole === 'admin' && m.userId !== user.id && (
                    <div className="flex gap-2">
                      <select value={m.role} onChange={e => handleRoleChange(m.userId, e.target.value)}
                        className="bg-slate-700 border border-slate-600/50 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none">
                        {ROLES.map(r => <option key={r} value={r}>{t(r)}</option>)}
                      </select>
                      <button onClick={() => handleRemove(m.userId)} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave */}
        <button onClick={handleLeave}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl py-4 text-red-400 text-sm font-medium active:scale-95 transition-all">
          <LogOut size={16} />
          {t('leaveTeam')}
        </button>
      </div>
    </div>
  )
}
