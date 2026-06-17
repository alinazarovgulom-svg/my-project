import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { getUsers, saveUsers, getCurrentUser, setCurrentUser, hashPassword, generateId } from '../store/storage'
import { Package, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { setUser } = useApp()
  const { t, lang, changeLang } = useLang()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', fullName: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleLogin = () => {
    if (!form.username || !form.password) { setError(t('fillAll')); return }
    const users = getUsers()
    const u = users.find(u => u.username === form.username && u.passwordHash === hashPassword(form.password))
    if (!u) { setError(t('wrongCredentials')); return }
    setCurrentUser(u)
    setUser(u)
  }

  const handleRegister = () => {
    if (!form.username || !form.password || !form.fullName) { setError(t('fillAll')); return }
    if (form.password.length < 4) { setError(t('passwordShort')); return }
    const users = getUsers()
    if (users.find(u => u.username === form.username)) { setError(t('usernameTaken')); return }
    const newUser = { id: generateId(), username: form.username, fullName: form.fullName, passwordHash: hashPassword(form.password), createdAt: new Date().toISOString() }
    saveUsers([...users, newUser])
    setCurrentUser(newUser)
    setUser(newUser)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* Lang switcher */}
      <div className="absolute top-6 right-6 flex gap-1">
        {['uz','ru','en'].map(l => (
          <button key={l} onClick={() => changeLang(l)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${lang === l ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-500/20 mb-4">
            <Package size={40} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">OmborBek</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">{t('tagline')}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-800/60 rounded-2xl p-1 mb-6">
          {['login','register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === m ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-400'}`}>
              {t(m)}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === 'register' && (
            <input value={form.fullName} onChange={set('fullName')} placeholder={t('fullName')}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 text-sm" />
          )}
          <input value={form.username} onChange={set('username')} placeholder={t('username')} autoCapitalize="none"
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 text-sm" />
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={t('password')}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 text-sm" />
            <button onClick={() => setShowPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}

        <button onClick={mode === 'login' ? handleLogin : handleRegister}
          className="mt-5 w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all text-sm">
          {mode === 'login' ? t('enterBtn') : t('registerBtn')}
        </button>
      </div>
    </div>
  )
}
