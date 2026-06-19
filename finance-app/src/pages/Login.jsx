import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Mail, Phone, Send } from 'lucide-react'
import { getUsers, saveUsers, hashPassword, setCurrentUser, generateId } from '../store/storage'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'

export default function Login() {
  const { setUser } = useApp()
  const { t, lang, setLang } = useLang()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const users = getUsers()

    if (mode === 'login') {
      const byUsername = users.find(u => u.username === form.username)
      if (!byUsername) return setError(`"${form.username}" foydalanuvchisi topilmadi. Ro'yxatdan o'ting.`)
      const u = users.find(u => u.username === form.username && u.password === hashPassword(form.password))
      if (!u) return setError('Parol noto\'g\'ri. Qayta urinib ko\'ring.')
      setCurrentUser(u)
      setUser(u)
      nav('/')
    } else {
      if (!form.name || !form.username || !form.password) return setError(t('fillAll'))
      if (form.password.length < 4) return setError(t('passwordShort'))
      if (users.find(u => u.username === form.username)) return setError(t('usernameTaken'))
      const newUser = { id: generateId(), name: form.name, username: form.username, password: hashPassword(form.password) }
      saveUsers([...users, newUser])
      setCurrentUser(newUser)
      setUser(newUser)
      nav('/')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-dark-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-56 h-56 bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 pointer-events-none" />

      {/* Header branding */}
      <div className="pt-10 pb-2 flex flex-col items-center">
        <span className="text-xs font-semibold tracking-[0.25em] text-blue-400/70 uppercase mb-1">by</span>
        <span className="text-lg font-black tracking-[0.15em] text-white uppercase"
          style={{ textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>
          KAFTIMDA
        </span>
        {/* Language switcher */}
        <div className="flex gap-2 mt-3">
          {[['uz','🇺🇿'],['ru','🇷🇺'],['en','🇬🇧']].map(([l, flag]) => (
            <button key={l} onClick={() => setLang(l)}
              className={`text-sm px-2 py-0.5 rounded-lg transition-all ${lang === l ? 'bg-blue-500/30 text-blue-300' : 'text-gray-600'}`}>
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', boxShadow: '0 8px 32px rgba(59,130,246,0.35)' }}>
                <span className="text-4xl font-black text-white">₿</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-dark-900">✓</span>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">PulBek</h1>
            <p className="text-gray-400 text-sm mt-1 text-center">{t('tagline')}</p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-dark-700/80 rounded-2xl p-1 mb-5 border border-white/5">
            <button onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'login' ? 'text-white shadow-lg' : 'text-gray-500'}`}
              style={mode === 'login' ? { background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' } : {}}>
              {t('login')}
            </button>
            <button onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'register' ? 'text-white shadow-lg' : 'text-gray-500'}`}
              style={mode === 'register' ? { background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' } : {}}>
              {t('register')}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" size={17} />
                <input className="input-field pl-11" placeholder={t('fullName')} value={form.name} onChange={e => set('name', e.target.value)} autoCorrect="off" />
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" size={17} />
              <input className="input-field pl-11" placeholder={t('username')} value={form.username} onChange={e => set('username', e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" size={17} />
              <input
                className="input-field pl-11 pr-12"
                type={showPass ? 'text' : 'password'}
                placeholder={t('password')}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                autoCapitalize="none" autoCorrect="off" spellCheck="false"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 p-1">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 py-2.5 px-4 rounded-xl border border-red-500/20">
                ⚠ {error}
              </div>
            )}
            <button type="submit" className="w-full py-3.5 rounded-2xl font-bold text-white text-base mt-1 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
              {mode === 'login' ? t('enterBtn') : t('registerBtn')}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-5 flex flex-col items-center gap-3">
        <div className="w-16 h-px bg-white/10" />
        <div className="flex flex-col items-center gap-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-1.5"><Mail size={11} className="text-blue-400/50" /><span>kaftimda@gmail.com</span></div>
          <div className="flex items-center gap-1.5"><Phone size={11} className="text-blue-400/50" /><span>+998 91 760 6666</span></div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1"><span className="text-pink-400/50">◎</span><span>kaftimda</span></div>
            <div className="flex items-center gap-1"><Send size={10} className="text-blue-400/50" /><span>Kaftimda_ERP</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
