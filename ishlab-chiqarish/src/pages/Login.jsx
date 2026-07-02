import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Factory, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn, signUp, error, setError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      navigate('/')
    } catch (err) {
      if (isRegister) {
        if (err.code === 'auth/email-already-in-use') {
          setError('Bu email allaqachon ro\'yxatdan o\'tgan')
        } else if (err.code === 'auth/weak-password') {
          setError('Parol kamida 6 belgidan iborat bo\'lishi kerak')
        } else {
          setError('Xatolik yuz berdi. Qayta urinib ko\'ring')
        }
      } else {
        setError('Email yoki parol noto\'g\'ri')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-800/20 rounded-full blur-3xl" />
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KAFTIMDA</h1>
          <p className="text-gray-500 text-sm mt-1">Biznesingiz kaftingizda</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
              placeholder="email@misol.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-60 mt-2 shadow-sm hover:shadow-md"
          >
            {loading ? '...' : isRegister ? 'Ro\'yxatdan o\'tish' : 'Kirish'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(r => !r); setError('') }}
            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
          >
            {isRegister ? 'Hisobim bor — Kirish' : 'Yangi hisob — Ro\'yxatdan o\'tish'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          kaftimda@gmail.com · +998 91 760 66 66
        </p>
      </div>
    </div>
  )
}
