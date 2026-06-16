import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Mail, Phone, Send } from 'lucide-react'
import { getUsers, saveUsers, hashPassword, setCurrentUser, generateId } from '../store/storage'
import { useApp } from '../store/AppContext'

export default function Login() {
  const { setUser } = useApp()
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
      const u = users.find(u => u.username === form.username && u.password === hashPassword(form.password))
      if (!u) return setError('Login yoki parol noto\'g\'ri')
      setCurrentUser(u)
      setUser(u)
      nav('/')
    } else {
      if (!form.name || !form.username || !form.password)
        return setError('Barcha maydonlarni to\'ldiring')
      if (form.password.length < 4)
        return setError('Parol kamida 4 ta belgidan iborat bo\'lsin')
      if (users.find(u => u.username === form.username))
        return setError('Bu login band, boshqa tanlang')
      const newUser = { id: generateId(), name: form.name, username: form.username, password: hashPassword(form.password) }
      saveUsers([...users, newUser])
      setCurrentUser(newUser)
      setUser(newUser)
      nav('/')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-dark-900 relative overflow-hidden">

      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-56 h-56 bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header branding */}
      <div className="pt-12 pb-2 flex flex-col items-center">
        <span className="text-xs font-semibold tracking-[0.25em] text-blue-400/70 uppercase mb-1">by</span>
        <span className="text-lg font-black tracking-[0.15em] text-white uppercase"
          style={{ textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>
          KAFTIMDA
        </span>
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
            <p className="text-gray-400 text-sm mt-1 text-center">Shaxsiy va biznes moliyangizni boshqaring</p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-dark-700/80 rounded-2xl p-1 mb-5 border border-white/5">
            <button onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'login' ? 'text-white shadow-lg' : 'text-gray-500'}`}
              style={mode === 'login' ? { background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' } : {}}>
              Kirish
            </button>
            <button onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'register' ? 'text-white shadow-lg' : 'text-gray-500'}`}
              style={mode === 'register' ? { background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' } : {}}>
              Ro'yxatdan o'tish
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" size={17} />
                <input className="input-field pl-11" placeholder="Ismingiz" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" size={17} />
              <input className="input-field pl-11" placeholder="Login" value={form.username} onChange={e => set('username', e.target.value)} autoComplete="username" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" size={17} />
              <input
                className="input-field pl-11 pr-12"
                type={showPass ? 'text' : 'password'}
                placeholder="Parol"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 p-1">
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 py-2.5 px-4 rounded-xl border border-red-500/20">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className="w-full py-3.5 rounded-2xl font-bold text-white text-base mt-1 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
              {mode === 'login' ? 'Kirish →' : 'Ro\'yxatdan o\'tish →'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer contact info */}
      <div className="pb-8 px-5 flex flex-col items-center gap-3">
        <div className="w-16 h-px bg-white/10" />
        <div className="flex flex-col items-center gap-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <Mail size={11} className="text-blue-400/50" />
            <span>kaftimda@gmail.com</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone size={11} className="text-blue-400/50" />
            <span>+998 91 760 6666</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1">
              <span className="text-pink-400/50">◎</span>
              <span>kaftimda</span>
            </div>
            <div className="flex items-center gap-1">
              <Send size={10} className="text-blue-400/50" />
              <span>Kaftimda_ERP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
