import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { createWorkspace, joinWorkspace, leaveWorkspace, deleteWorkspace, addMemberByUsername, updateMemberPermissions, removeMember } from '../store/workspace'
import { loadFromCloud, syncToCloud } from '../store/sync'
import { Building2, UserPlus, LogOut, Users, Copy, Check, ChevronDown, ChevronUp, Save } from 'lucide-react'
import ElektrHisoblagich from '../components/ElektrHisoblagich'

const SECTIONS = [
  { key: 'transactions', label: 'Kirim/Chiqim' },
  { key: 'debts', label: 'Qarzlar' },
  { key: 'hamkorlar', label: 'Hamkorlar' },
  { key: 'reports', label: 'Hisobot' },
  { key: 'exchange', label: 'Valyuta' },
]
const PERMS = ['edit', 'view', 'none']
const PERM_LABELS = { edit: 'Tahrirlash', view: "Ko'rish", none: "Yo'q" }
const PERM_COLORS = {
  edit: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  view: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  none: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', border: 'rgba(107,114,128,0.2)' },
}

function MemberEditor({ m, userId, workspaceId, members, onRemove }) {
  const [open, setOpen] = useState(false)
  const [roleName, setRoleName] = useState(m.role || '')
  const [perms, setPerms] = useState(m.permissions || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const setPerm = (section, perm) => setPerms(p => ({ ...p, [section]: perm }))

  const handleSave = async () => {
    setSaving(true)
    await updateMemberPermissions(workspaceId, m.userId, roleName.trim() || 'Xodim', perms, members)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {m.fullName || m.username}
          </span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>@{m.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            {m.role || 'Xodim'}
          </span>
          <button onClick={() => setOpen(v => !v)} className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Permissions preview */}
      {!open && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {SECTIONS.map(({ key, label }) => {
            const p = perms[key] || 'none'
            const c = PERM_COLORS[p]
            return (
              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: c.bg, color: c.color }}>
                {label}: {PERM_LABELS[p]}
              </span>
            )
          })}
        </div>
      )}

      {/* Editor */}
      {open && (
        <div className="mt-3 rounded-xl p-3 flex flex-col gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Rol nomi */}
          <div>
            <div className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Rol nomi</div>
            <input
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              placeholder="Masalan: Buxgalter, Menejer, Kuzatuvchi..."
              className="input-field text-sm py-2"
            />
          </div>

          {/* Bo'limlar ruxsati */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Bo'limlar ruxsati</div>
            <div className="flex flex-col gap-2">
              {SECTIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <div className="flex gap-1">
                    {PERMS.map(p => {
                      const active = (perms[key] || 'none') === p
                      const c = PERM_COLORS[p]
                      return (
                        <button key={p} onClick={() => setPerm(key, p)}
                          className="text-[11px] px-2 py-1 rounded-lg font-medium transition-all"
                          style={active
                            ? { background: c.bg, color: c.color, border: `1px solid ${c.border}` }
                            : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid transparent' }
                          }>
                          {PERM_LABELS[p]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
              {saved ? <><Check size={14} /> Saqlandi</> : saving ? 'Saqlanmoqda...' : <><Save size={14} /> Saqlash</>}
            </button>
            <button onClick={() => onRemove(m.userId, members)}
              className="px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              O'chirish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Korxona() {
  const { user, workspace, workspaceId, setWorkspace, setWorkspaceId, myRole, transactions, debts, saveTransactions, saveDebts } = useApp()
  const [mode, setMode] = useState(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [addRole, setAddRole] = useState('Xodim')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!workspaceName.trim()) return setError('Korxona nomini kiriting')
    setLoading(true); setError('')
    try {
      const result = await createWorkspace(user.id, user.username, user.name, workspaceName.trim())
      if (result.error) { setError(result.error); setLoading(false); return }
      const wid = result.workspace.id
      if (transactions.length > 0) saveTransactions(transactions)
      if (debts.length > 0) saveDebts(debts)
      const HAMKOR_KEYS = ['hamkorlar_sections', 'hamkorlar', 'hamkorlar_archive']
      await Promise.all(HAMKOR_KEYS.map(async (key) => {
        const data = await loadFromCloud(user.id, key, 'users')
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          await syncToCloud(wid, key, data, 'workspaces')
        }
      }))
      setWorkspace(result.workspace)
      setWorkspaceId(wid)
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

  const handleDeleteWorkspace = async () => {
    if (!window.confirm(`"${workspace.name}" korxonasini butunlay o'chirasizmi?`)) return
    setLoading(true)
    await deleteWorkspace(user.id, workspaceId)
    setWorkspace(null); setWorkspaceId(null)
    setLoading(false)
  }

  const handleAddMember = async () => {
    if (!addUsername.trim()) return setError('Username kiriting')
    setLoading(true); setError('')
    try {
      const result = await addMemberByUsername(workspaceId, addUsername.trim(), addRole.trim() || 'Xodim')
      if (result.error) setError(result.error)
      else setAddUsername('')
    } catch (e) { setError(e.message || 'Xatolik yuz berdi') }
    setLoading(false)
  }

  const handleRemove = async (memberId, members) => {
    if (!window.confirm("Bu a'zoni o'chirmoqchimisiz?")) return
    await removeMember(workspaceId, memberId, members)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(workspaceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!workspace) {
    return (
      <div className="min-h-screen p-4 pb-24" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Building2 size={20} /> Korxona
        </h1>
        {!mode ? (
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode('create')} className="bg-blue-600 hover:bg-blue-700 rounded-xl p-4 text-left transition-colors">
              <div className="font-semibold text-white">Korxona yaratish</div>
              <div className="text-sm text-blue-200 mt-1">Yangi ish joyi yarating va a'zolarni qo'shing</div>
            </button>
            <button onClick={() => setMode('join')} className="border border-white/10 rounded-xl p-4 text-left transition-colors" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="font-semibold">Korxonaga qo'shilish</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Mavjud korxona kodini kiriting</div>
            </button>
          </div>
        ) : mode === 'create' ? (
          <div className="flex flex-col gap-3">
            <button onClick={() => { setMode(null); setError('') }} className="text-sm text-left" style={{ color: 'var(--text-muted)' }}>← Orqaga</button>
            <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="Korxona nomi" className="input-field" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-semibold text-white disabled:opacity-50 transition-colors">
              {loading ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={() => { setMode(null); setError('') }} className="text-sm text-left" style={{ color: 'var(--text-muted)' }}>← Orqaga</button>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Korxona kodi (KASSA-XXXXXX)" className="input-field uppercase" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleJoin} disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-semibold text-white disabled:opacity-50 transition-colors">
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
    <div className="min-h-screen p-4 pb-24" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 size={20} /> {workspace.name}
        </h1>
        {!isAdmin ? (
          <button onClick={handleLeave} disabled={loading} className="flex items-center gap-1 text-red-400 text-sm">
            <LogOut size={14} /> Chiqish
          </button>
        ) : (
          <button onClick={handleDeleteWorkspace} disabled={loading} className="flex items-center gap-1 text-red-400 text-sm">
            <LogOut size={14} /> O'chirish
          </button>
        )}
      </div>

      {/* Korxona kodi */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Korxona kodi</div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-blue-400 text-lg">{workspaceId}</span>
          <button onClick={copyCode} style={{ color: 'var(--text-muted)' }}>
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bu kodni a'zolarga bering</div>
      </div>

      {/* A'zo qo'shish */}
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
            <input
              value={addRole}
              onChange={e => setAddRole(e.target.value)}
              placeholder="Rol nomi"
              className="input-field text-sm py-2 w-28"
            />
          </div>
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button onClick={handleAddMember} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors">
            {loading ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        </div>
      )}

      <ElektrHisoblagich workspaceId={workspaceId} isAdmin={isAdmin} />

      {/* A'zolar ro'yxati */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users size={14} /> A'zolar ({members.length})
        </div>
        <div className="flex flex-col gap-3">
          {members.map(m => (
            m.userId === user.id ? (
              // O'zini ko'rsatish (tahrirlash yo'q)
              <div key={m.userId} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.fullName || m.username}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>@{m.username}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15', border: '1px solid rgba(234,179,8,0.25)' }}>
                    {m.role} (siz)
                  </span>
                </div>
              </div>
            ) : isAdmin ? (
              <MemberEditor
                key={m.userId}
                m={m}
                userId={user.id}
                workspaceId={workspaceId}
                members={members}
                onRemove={handleRemove}
              />
            ) : (
              // Admin emas — faqat ko'rish
              <div key={m.userId} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.fullName || m.username}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>@{m.username}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    {m.role}
                  </span>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
