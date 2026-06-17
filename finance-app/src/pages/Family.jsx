import { useState } from 'react'
import { Users, Plus, LogIn, Copy, Check, LogOut, UserX, ChevronDown } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import {
  createFamily,
  joinFamily,
  leaveFamily,
  updateMemberRole,
  removeMember
} from '../store/family'

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Math.abs(Math.round(n)))

const ROLE_LABELS = { admin: 'Admin', member: 'A\'zo', viewer: 'Kuzatuvchi' }
const ROLE_COLORS = {
  admin: 'bg-blue-500/20 text-blue-400',
  member: 'bg-green-500/20 text-green-400',
  viewer: 'bg-gray-500/20 text-gray-400'
}

export default function Family() {
  const { user, family, userRole, familyMembers, refreshFamily, transactions, debts } = useApp()
  const [createModal, setCreateModal] = useState(false)
  const [joinModal, setJoinModal] = useState(false)
  const [roleModal, setRoleModal] = useState(null) // { member }
  const [familyName, setFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!familyName.trim()) return setError('Guruh nomini kiriting')
    await createFamily(user.id, user.username, user.name, familyName.trim(), transactions, debts)
    refreshFamily()
    setCreateModal(false)
    setFamilyName('')
    setError('')
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return setError('Kodni kiriting')
    const result = await joinFamily(code, user.id, user.username, user.name)
    if (result.error) return setError(result.error)
    refreshFamily()
    setJoinModal(false)
    setJoinCode('')
    setError('')
  }

  const handleLeave = async () => {
    if (!confirm('Guruhdan chiqishni tasdiqlaysizmi?')) return
    await leaveFamily(family.id, user.id)
    refreshFamily()
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(family.id).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRoleChange = async (targetUserId, newRole) => {
    await updateMemberRole(family.id, targetUserId, newRole, user.id)
    refreshFamily()
    setRoleModal(null)
  }

  const handleRemoveMember = async (targetUserId) => {
    if (!confirm('Bu a\'zoni guruhdan chiqarishni tasdiqlaysizmi?')) return
    await removeMember(family.id, targetUserId, user.id)
    refreshFamily()
    setRoleModal(null)
  }

  if (!family) {
    return (
      <div className="flex flex-col px-4 pt-4 pb-24 gap-4">
        <h1 className="text-xl font-bold text-white">Oilaviy rejim</h1>

        <div className="card text-center py-12 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-blue-500/15 flex items-center justify-center">
            <Users size={36} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">Guruh yo'q</p>
            <p className="text-gray-500 text-sm">Oilaviy guruh yarating yoki mavjud guruhga qo'shiling</p>
          </div>
          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={() => { setCreateModal(true); setError('') }}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Guruh yaratish
            </button>
            <button
              onClick={() => { setJoinModal(true); setError('') }}
              className="py-3 rounded-xl bg-dark-600 text-white font-medium flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
            >
              <LogIn size={18} />
              Guruhga qo'shilish
            </button>
          </div>
        </div>

        {/* Create Modal */}
        <Modal open={createModal} onClose={() => setCreateModal(false)} title="Guruh yaratish">
          <div className="flex flex-col gap-3 pb-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Guruh nomi</label>
              <input
                className="input-field"
                placeholder="Guruh nomini kiriting"
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{error}</p>}
            <button onClick={handleCreate} className="btn-primary mt-2">Yaratish</button>
          </div>
        </Modal>

        {/* Join Modal */}
        <Modal open={joinModal} onClose={() => setJoinModal(false)} title="Guruhga qo'shilish">
          <div className="flex flex-col gap-3 pb-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Taklif kodi (masalan: FAM-483921)</label>
              <input
                className="input-field"
                placeholder="FAM-XXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{error}</p>}
            <button onClick={handleJoin} className="btn-primary mt-2">Qo'shilish</button>
          </div>
        </Modal>
      </div>
    )
  }

  // User is in a family
  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Oilaviy rejim</h1>
        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${ROLE_COLORS[userRole]}`}>
          {ROLE_LABELS[userRole]}
        </span>
      </div>

      {/* Family Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-purple-900 p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <p className="text-purple-200 text-sm mb-1">Oila nomi</p>
          <p className="text-white text-2xl font-bold mb-4">{family.name}</p>
          <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-purple-200 text-xs mb-0.5">Taklif kodi</p>
              <p className="text-white font-mono font-bold text-lg tracking-wider">{family.id}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center active:opacity-70 transition-opacity"
            >
              {copied ? <Check size={18} className="text-green-300" /> : <Copy size={18} className="text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <h2 className="font-semibold text-white mb-3">A'zolar ({familyMembers.length})</h2>
        <div className="flex flex-col gap-2">
          {familyMembers.map(member => (
            <div key={member.userId} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 font-bold text-sm">
                  {(member.fullName || member.username || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{member.fullName}</p>
                <p className="text-gray-500 text-xs">@{member.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${ROLE_COLORS[member.role]}`}>
                  {ROLE_LABELS[member.role]}
                </span>
                {userRole === 'admin' && member.userId !== user.id && (
                  <button
                    onClick={() => setRoleModal({ member })}
                    className="p-1.5 rounded-lg bg-dark-600 text-gray-400 active:text-white transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Group */}
      <button
        onClick={handleLeave}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium active:opacity-70 transition-opacity"
      >
        <LogOut size={18} />
        Guruhdan chiqish
      </button>

      {/* Role Change Modal */}
      <Modal
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title={`${roleModal?.member?.fullName} — rol o'zgartirish`}
      >
        <div className="flex flex-col gap-3 pb-4">
          {['admin', 'member', 'viewer'].map(role => (
            <button
              key={role}
              onClick={() => handleRoleChange(roleModal.member.userId, role)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                roleModal?.member?.role === role
                  ? 'bg-blue-500/20 border border-blue-500/40'
                  : 'bg-dark-600 active:bg-dark-500'
              }`}
            >
              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
              <span className="text-gray-300 text-sm">
                {role === 'admin' && 'To\'liq huquq — hammasini boshqaradi'}
                {role === 'member' && 'O\'z tranzaksiyalarini qo\'sha oladi'}
                {role === 'viewer' && 'Faqat ko\'ra oladi'}
              </span>
            </button>
          ))}
          <div className="h-px bg-white/5 my-1" />
          <button
            onClick={() => handleRemoveMember(roleModal?.member?.userId)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium active:opacity-70"
          >
            <UserX size={16} />
            Guruhdan chiqarish
          </button>
        </div>
      </Modal>
    </div>
  )
}
