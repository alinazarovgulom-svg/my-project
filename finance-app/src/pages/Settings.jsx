import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Lock, User, Eye, EyeOff, Info, Tag, Globe, KeyRound, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { getUsers, saveUsers, hashPassword, setCurrentUser } from '../store/storage'
import Modal from '../components/Modal'
import { useLang } from '../i18n/LangContext'

export default function Settings() {
  const { user, setUser, transactions: personalTx, familyTransactions, family, debts, userRole } = useApp()
  const transactions = family ? familyTransactions : personalTx
  const { t, lang, setLang } = useLang()
  const nav = useNavigate()
  // Only admin (or user not in a family) can access categories
  const isAdmin = !userRole || userRole === 'admin'
  const [passModal, setPassModal] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' })
  const [showPass, setShowPass] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const hasPin = user?.id ? !!localStorage.getItem(`finance_pin_${user.id}`) : false

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogout = () => {
    if (confirm('Chiqishni tasdiqlaysizmi?')) {
      setCurrentUser(null)
      setUser(null)
      nav('/login')
    }
  }

  const handleChangePass = () => {
    setError(''); setSuccess('')
    if (!form.current || !form.newPass || !form.confirm) return setError('Barcha maydonlarni to\'ldiring')
    if (form.newPass.length < 4) return setError('Yangi parol kamida 4 belgi bo\'lsin')
    if (form.newPass !== form.confirm) return setError('Parollar mos kelmaydi')

    const users = getUsers()
    const idx = users.findIndex(u => u.id === user.id)
    if (idx === -1 || users[idx].password !== hashPassword(form.current)) return setError('Joriy parol noto\'g\'ri')

    users[idx] = { ...users[idx], password: hashPassword(form.newPass) }
    saveUsers(users)
    setCurrentUser(users[idx])
    setSuccess('Parol muvaffaqiyatli o\'zgartirildi!')
    setForm({ current: '', newPass: '', confirm: '' })
    setTimeout(() => setPassModal(false), 1500)
  }

  const showField = (k) => setShowPass(s => ({ ...s, [k]: !s[k] }))

  const handleSetPin = () => {
    setPinError(''); setPinSuccess('')
    if (pinForm.pin.length !== 4 || !/^\d{4}$/.test(pinForm.pin)) return setPinError('PIN 4 raqamdan iborat bo\'lishi kerak')
    if (pinForm.pin !== pinForm.confirm) return setPinError('PIN lar mos kelmaydi')
    localStorage.setItem(`finance_pin_${user.id}`, pinForm.pin)
    setPinSuccess('PIN muvaffaqiyatli o\'rnatildi!')
    setPinForm({ pin: '', confirm: '' })
    setTimeout(() => setPinModal(false), 1200)
  }

  const handleRemovePin = () => {
    if (user?.id) {
      localStorage.removeItem(`finance_pin_${user.id}`)
      setPinModal(false)
    }
  }

  const stats = [
    { label: 'Jami operatsiyalar', value: transactions.length, color: 'blue' },
    { label: 'Jami qarzlar', value: debts.length, color: 'purple' },
    { label: 'Faol qarzlar', value: debts.filter(d => d.remaining > 0).length, color: 'orange' },
  ]

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4">
      <h1 className="text-xl font-bold text-white">Sozlamalar</h1>

      {/* Profile */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{user?.name}</p>
          <p className="text-gray-400 text-sm">@{user?.username}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card flex flex-col gap-0 p-0 overflow-hidden">
        {isAdmin && (
          <>
            <button onClick={() => nav('/categories')}
              className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Tag size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Kategoriyalar</p>
                <p className="text-gray-500 text-xs">Kategoriyalarni boshqarish</p>
              </div>
            </button>
            <div className="h-px bg-white/5 mx-4" />
          </>
        )}

        <button onClick={() => { setPassModal(true); setError(''); setSuccess(''); setForm({ current: '', newPass: '', confirm: '' }) }}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Lock size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Parolni o'zgartirish</p>
            <p className="text-gray-500 text-xs">Xavfsizlik uchun o'zgartiring</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={() => { setPinModal(true); setPinError(''); setPinSuccess(''); setPinForm({ pin: '', confirm: '' }) }}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <KeyRound size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">PIN qulfini {hasPin ? 'o\'zgartirish' : 'o\'rnatish'}</p>
            <p className="text-gray-500 text-xs">{hasPin ? 'PIN faol — ilovani qulflaydi' : 'Ilovani PIN bilan qulflash'}</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={() => nav('/trash')}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <Trash2 size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Arxiv</p>
            <p className="text-gray-500 text-xs">O'chirilgan tranzaksiyalar (30 kun)</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <LogOut size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-red-400 text-sm font-medium">Chiqish</p>
            <p className="text-gray-500 text-xs">Akkauntdan chiqish</p>
          </div>
        </button>
      </div>

      {/* Language selector */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-gray-500" />
          <h2 className="text-gray-400 text-sm">{t('language')}</h2>
        </div>
        <div className="flex gap-2">
          {[['uz','🇺🇿','O\'zbek'],['ru','🇷🇺','Русский'],['en','🇬🇧','English']].map(([l, flag, label]) => (
            <button key={l} onClick={() => setLang(l)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${lang === l ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-dark-600 text-gray-500'}`}>
              <span className="text-lg">{flag}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} className="text-gray-500" />
          <h2 className="text-gray-400 text-sm">{t('appInfo')}</h2>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          {t('appVersion')} — {t('tagline')}
        </p>
      </div>

      {/* PIN Modal */}
      <Modal open={pinModal} onClose={() => setPinModal(false)} title="PIN o'rnatish">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Yangi PIN (4 raqam)</label>
            <input className="input-field tracking-widest text-lg" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinForm.pin} onChange={e => setPinForm(f => ({ ...f, pin: e.target.value }))} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Tasdiqlash</label>
            <input className="input-field tracking-widest text-lg" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinForm.confirm} onChange={e => setPinForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          {pinError && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{pinError}</p>}
          {pinSuccess && <p className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{pinSuccess}</p>}
          <button onClick={handleSetPin} className="btn-primary">Saqlash</button>
          {hasPin && <button onClick={handleRemovePin} className="text-red-400 text-sm py-2">PIN ni o'chirish</button>}
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal open={passModal} onClose={() => setPassModal(false)} title="Parolni o'zgartirish">
        <div className="flex flex-col gap-3">
          {['current', 'newPass', 'confirm'].map((field, i) => (
            <div key={field} className="relative">
              <label className="text-gray-400 text-xs mb-1 block">
                {field === 'current' ? 'Joriy parol' : field === 'newPass' ? 'Yangi parol' : 'Yangi parolni tasdiqlang'}
              </label>
              <input
                className="input-field pr-12"
                type={showPass[field] ? 'text' : 'password'}
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                autoComplete="off"
              />
              <button type="button" onClick={() => showField(field)} className="absolute right-3 bottom-3 text-gray-500 p-0.5">
                {showPass[field] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          ))}
          {error && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{error}</p>}
          {success && <p className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{success}</p>}
          <button onClick={handleChangePass} className="btn-primary mt-2">O'zgartirish</button>
        </div>
      </Modal>
    </div>
  )
}
