import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { createWorkspace, joinWorkspace, leaveWorkspace, addMemberByUsername, updateMemberRole, removeMember } from '../store/workspace'
import { Building2, UserPlus, LogOut, Users, Copy, Check } from 'lucide-react'

const ROLE_LABELS = { admin: 'Admin', kassir: 'Kassir', rahbar: 'Rahbar' }
const SECTION_LABELS = { transactions: 'Kirim/Chiqim', debts: 'Qarzlar', hamkorlar: 'Hamkorlar', reports: 'Hisobot', exchange: 'Valyuta' }
const PERM_LABELS = { edit: 'Tahrirlash', view: "Ko'rish", none: "Yo'q" }

export default function Korxona() {
  const { user, workspace, workspaceId, setWorkspace, setWorkspaceId, myRole } = useApp()
  const [mode, setMode] = useState(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [addRole, setAddRole] = useState('kassir')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!workspaceName.trim()) return setError('Korxona nomini kiriting')
    setLoading(true); setError('')
    try {
      const result = await createWorkspace(user.id, user.username, user.name, workspaceName.trim())
      if (result.error) setError(result.error)
      else { setWorkspace(result.workspace); setWorkspaceId(result.workspace.id) }
    } catch (e) { setError(e.message || 'Xatolik yuz berdi') }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return setError('Korxona kodini kiriting')
    setLoading(true); setError('')
    try {
      const result = await joinWorkspace(user.id, user.username, user.name, joinCode.trim().toUpperCase())
      if (result.error) setError(result.error)
      else { setWorkspace(result.workspace); setWorkspaceId(result.workspace.id) }
    } catch (e) { setError(e.message || 'Xatolik yuz berdi') }
    setLoading(false)
  }

  const handleLeave = async () => {
    if (!window.confirm('Korxonadan chiqmoqchimisiz?')) return
    setLoading(true)
    await leaveWorkspace(user.id, workspaceId)
    setWorkspace(null); setWorkspaceId(null)
    setLoading(false)
  }

  const handleAddMember = async () => {
    if (!addUsername.trim()) return setError('Username kiriting')
    setLoading(true); setError('')
    try {
      const result = await addMemberByUsername(workspaceId, addUsername.trim(), addRole)
      if (result.error) setError(result.error)
      else setAddUsername('')
    } catch (e) { setError(e.message || 'Xatolik yuz berdi') }
    setLoading(false)
  }

  const handleRoleChange = async (memberId, newRole, members) => {
    setLoading(true)
    await updateMemberRole(workspaceId, memberId, newRole, members)
    setLoading(false)
  }

  const handleRemove = async (memberId, members) => {
    if (!window.confirm("Bu a'zoni o'chirmoqchimisiz?")) return
    setLoading(true)
    await removeMember(workspaceId, memberId, members)
    setLoading(false)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(workspaceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!workspace) {
    return (
      <div className="min-h-screen text-white p-4 pb-24" style={{ background: '#08080f' }}>
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Building2 size={20} /> Korxona
        </h1>
        {!mode ? (
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode('create')} className="bg-blue-600 hover:bg-blue-700 rounded-xl p-4 text-left transition-colors">
              <div className="font-semibold">Korxona yaratish</div>
              <div className="text-sm text-blue-200 mt-1">Yangi ish joyi yarating va a'zolarni qo'shing</div>
            </button>
            <button onClick={() => setMode('join')} className="border border-white/10 rounded-xl p-4 text-left transition-colors" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="font-semibold">Korxonaga qo'shilish</div>
              <div className="text-sm text-gray-400 mt-1">Mavjud korxona kodini kiriting</div>
            </button>
          </div>
        ) : mode === 'create' ? (
          <div className="flex flex-col gap-3">
            <button onClick={() => { setMode(null); setError('') }} className="text-gray-400 text-sm text-left">← Orqaga</button>
            <input
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="Korxona nomi"
              className="input-field"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-semibold disabled:opacity-50 transition-colors">
              {loading ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={() => { setMode(null); setError('') }} className="text-gray-400 text-sm text-left">← Orqaga</button>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Korxona kodi (KASSA-XXXXXX)"
              className="input-field uppercase"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleJoin} disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-semibold disabled:opacity-50 transition-colors">
              {loading ? "Qo'shilmoqda..." : "Qo'shilish"}
            </button>
          </div>
        )}
      </div>
    )
  }

  const members = workspace.members || []
  const isAdmin = myRole === 'admin'

  return (
    <div className="min-h-screen text-white p-4 pb-24" style={{ background: '#08080f' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 size={20} /> {workspace.name}
        </h1>
        {!isAdmin && (
          <button onClick={handleLeave} disabled={loading} className="flex items-center gap-1 text-red-400 text-sm hover:text-red-300">
            <LogOut size={14} /> Chiqish
          </button>
        )}
      </div>

      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-xs text-gray-400 mb-1">Korxona kodi</div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-blue-400 text-lg">{workspaceId}</span>
          <button onClick={copyCode} className="text-gray-400 hover:text-white ml-1">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">Bu kodni a'zolarga bering</div>
      </div>

      {isAdmin && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UserPlus size={14} /> A'zo qo'shish
          </div>
          <div className="flex gap-2 mb-2">
            <input
              value={addUsername}
              onChange={e => setAddUsername(e.target.value)}
              placeholder="Username"
              className="input-field text-sm py-2 flex-1"
            />
            <select
              value={addRole}
              onChange={e => setAddRole(e.target.value)}
              className="input-field text-sm py-2 px-2"
            >
              <option value="kassir">Kassir</option>
              <option value="rahbar">Rahbar</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button onClick={handleAddMember} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-2 text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users size={14} /> A'zolar ({members.length})
        </div>
        <div className="flex flex-col gap-3">
          {members.map(m => (
            <div key={m.userId} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm">{m.fullName || m.username}</span>
                  <span className="text-gray-400 text-xs ml-2">@{m.username}</span>
                </div>
                {isAdmin && m.userId !== user.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.userId, e.target.value, members)}
                      disabled={loading}
                      className="input-field text-xs py-1 px-2"
                    >
                      <option value="kassir">Kassir</option>
                      <option value="rahbar">Rahbar</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => handleRemove(m.userId, members)} className="text-red-400 text-xs hover:text-red-300">
                      O'chirish
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    m.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' :
                    m.role === 'kassir' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(m.permissions || {}).map(([section, perm]) => (
                  <span key={section} className={`text-[10px] px-1.5 py-0.5 rounded ${
                    perm === 'edit' ? 'bg-green-500/20 text-green-400' :
                    perm === 'view' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {SECTION_LABELS[section]}: {PERM_LABELS[perm]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
