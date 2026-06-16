import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Wallet } from 'lucide-react'
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
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 bg-dark-900">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3">
            <Wallet className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Moliya Ilovasi</h1>
          <p className="text-gray-400 text-sm mt-1">Shaxsiy va biznes moliyangizni boshqaring</p>
        </div>

        <div className="flex bg-dark-700 rounded-xl p-1 mb-6">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>
            Kirish
          </button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'register' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>
            Ro'yxatdan o'tish
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input className="input-field pl-10" placeholder="Ismingiz" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          )}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input className="input-field pl-10" placeholder="Login" value={form.username} onChange={e => set('username', e.target.value)} autoComplete="username" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              className="input-field pl-10 pr-12"
              type={showPass ? 'text' : 'password'}
              placeholder="Parol"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-3 rounded-lg">{error}</p>}
          <button type="submit" className="btn-primary mt-2">
            {mode === 'login' ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
          </button>
        </form>
      </div>
    </div>
  )
}
