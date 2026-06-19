import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Mail, Phone, Send, Loader } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { loginUser, registerUser, migrateLocalUsers, resetPasswordByUsername } from '../store/auth'

export default function Login() {
  const { setUser } = useApp()
  const { t, lang, setLang } = useLang()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [resetDone, setResetDone] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { migrateLocalUsers() }, [])
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await loginUser(form.username, form.password)
        if (res.error) return setError(res.error)
        setUser(res.user)
        nav('/')
      } else if (mode === 'register') {
        if (!form.name || !form.username || !form.password) return setError(t('fillAll'))
        if (form.password.length < 4) return setError(t('passwordShort'))
        const res = await registerUser(form.name, form.username, form.password)
        if (res.error) return setError(res.error)
        setUser(res.user)
        nav('/')
      } else if (mode === 'reset') {
        if (!form.username) return setError('Login nomini kiriting')
        if (!form.password || form.password.length < 4) return setError('Yangi parol kamida 4 ta belgidan iborat bo\'lsin')
        const res = await resetPasswordByUsername(form.username, form.password)
        if (res.error) return setError(res.error)
        setResetDone(true)
      }
    } catch {
      setError('Tarmoq xatosi. Internet aloqasini tekshiring.')
    } finally {
      setLoading(false)
    }
  }

  const anim = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
    transition: `opacity 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms, transform 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
  })

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: '#08080f' }}>

      <style>{`
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(30px,-20px) scale(1.15); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-20px,30px) scale(1.1); }
        }
        @keyframes orb3 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(15px,15px) scale(1.08); }
          66% { transform: translate(-10px,-20px) scale(0.95); }
        }
        @keyframes logoGlow {
          0%,100% { box-shadow: 0 0 30px rgba(99,102,241,0.4), 0 8px 32px rgba(99,102,241,0.2); }
          50% { box-shadow: 0 0 50px rgba(99,102,241,0.7), 0 8px 40px rgba(139,92,246,0.4); }
        }
        @keyframes logoBounce {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.12) rotate(3deg); opacity: 1; }
          80% { transform: scale(0.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shimmerBtn {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes errorShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .error-shake { animation: errorShake 0.4s ease; }
      `}</style>

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          animation: 'orb1 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '-60px',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          animation: 'orb2 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '20%',
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          animation: 'orb3 12s ease-in-out infinite',
        }} />
      </div>

      {/* Header branding */}
      <div className="pt-10 pb-2 flex flex-col items-center relative z-10" style={anim(0)}>
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: 'rgba(99,102,241,0.6)' }}>by</span>
        <span className="text-base font-black tracking-[0.2em] uppercase" style={{
          background: 'linear-gradient(90deg, #818cf8, #c4b5fd, #818cf8)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'shimmerBtn 3s linear infinite',
        }}>KAFTIMDA</span>
        <div className="flex gap-2 mt-3">
          {[['uz','🇺🇿'],['ru','🇷🇺'],['en','🇬🇧']].map(([l, flag]) => (
            <button key={l} onClick={() => setLang(l)}
              className="text-sm px-2 py-0.5 rounded-lg transition-all"
              style={lang === l ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8' } : { color: '#374151' }}>
              {flag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-7" style={anim(80)}>
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
                  animation: mounted ? 'logoBounce 0.7s cubic-bezier(0.34,1.4,0.64,1) forwards, logoGlow 3s 0.8s ease-in-out infinite' : 'none',
                }}>
                <span className="text-4xl font-black text-white">₿</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: '#22c55e',
                  boxShadow: '0 0 12px rgba(34,197,94,0.7)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'scale(1)' : 'scale(0)',
                  transition: 'all 0.4s cubic-bezier(0.34,1.7,0.64,1) 0.5s',
                }}>
                <span className="text-xs font-bold text-black">✓</span>
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>PulBek</h1>
            <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>{t('tagline')}</p>
          </div>

          {/* Mode toggle */}
          {mode !== 'reset' && (
            <div className="flex p-1 mb-5 rounded-2xl" style={{ ...anim(160), background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {['login', 'register'].map((m, i) => (
                <button key={m} onClick={() => { setMode(m); setError(''); setResetDone(false) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={mode === m ? {
                    background: 'linear-gradient(135deg, #4338ca, #6d28d9)',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                  } : { color: 'var(--text-muted)' }}>
                  {m === 'login' ? t('login') : t('register')}
                </button>
              ))}
            </div>
          )}

          {/* Reset mode header */}
          {mode === 'reset' && (
            <div className="mb-5" style={anim(0)}>
              <button onClick={() => { setMode('login'); setError(''); setResetDone(false); setForm({ name: '', username: '', password: '' }) }}
                className="text-sm mb-4 flex items-center gap-1" style={{ color: '#818cf8' }}>
                ← Orqaga
              </button>
              <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Parolni tiklash</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Login nomingizni kiriting va yangi parol o'rnating</p>
            </div>
          )}

          {/* Form */}
          {resetDone ? (
            <div className="flex flex-col items-center gap-4 py-4" style={anim(0)}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', boxShadow: '0 0 30px rgba(34,197,94,0.3)' }}>
                <span className="text-3xl">✓</span>
              </div>
              <p className="font-semibold text-center text-green-400">Parol muvaffaqiyatli yangilandi!</p>
              <button onClick={() => { setMode('login'); setResetDone(false); setForm({ name: '', username: form.username, password: '' }); setError('') }}
                className="btn-primary">Kirish</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {mode === 'register' && (
                <div className="relative" style={anim(200)}>
                  <User className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: '#6366f1' }} />
                  <input className="input-field pl-11" placeholder={t('fullName')} value={form.name} onChange={e => set('name', e.target.value)} autoCorrect="off" />
                </div>
              )}
              {mode === 'reset' && (
                <p className="text-xs -mb-1" style={{ color: 'var(--text-muted)' }}>Login nomingiz (ro'yxatdan o'tganingizda kiritgansiz)</p>
              )}
              <div className="relative" style={anim(mode === 'register' ? 240 : 200)}>
                <User className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: '#6366f1' }} />
                <input className="input-field pl-11" placeholder={t('username')} value={form.username}
                  onChange={e => set('username', e.target.value)}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
              </div>
              <div className="relative" style={anim(mode === 'register' ? 280 : 240)}>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: '#6366f1' }} />
                <input
                  className="input-field pl-11 pr-12"
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'reset' ? 'Yangi parol (kamida 4 ta belgi)' : t('password')}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  autoCapitalize="none" autoCorrect="off" spellCheck="false"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl error-shake"
                  style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-white text-base relative overflow-hidden disabled:opacity-60"
                style={{
                  ...anim(mode === 'register' ? 320 : 280),
                  marginTop: 4,
                  background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
                  boxShadow: '0 4px 24px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
                }}>
                <span className="absolute inset-0 pointer-events-none rounded-2xl" style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                  backgroundSize: '300% 100%',
                  animation: 'shimmerBtn 2s linear infinite',
                }} />
                <span className="relative flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader size={18} className="animate-spin" /> Tekshirilmoqda...</>
                    : mode === 'login' ? t('enterBtn')
                    : mode === 'reset' ? 'Parolni yangilash'
                    : t('registerBtn')
                  }
                </span>
              </button>

              {mode === 'login' && (
                <button type="button"
                  onClick={() => { setMode('reset'); setError(''); setForm(f => ({ ...f, password: '' })) }}
                  className="text-center text-sm py-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  Parolni unutdim?
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-5 flex flex-col items-center gap-3 relative z-10" style={anim(400)}>
        <div className="w-16 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="flex flex-col items-center gap-1.5 text-xs" style={{ color: '#2d2d45' }}>
          <div className="flex items-center gap-1.5"><Mail size={11} style={{ color: '#6366f1' }} /><span>kaftimda@gmail.com</span></div>
          <div className="flex items-center gap-1.5"><Phone size={11} style={{ color: '#6366f1' }} /><span>+998 91 760 6666</span></div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1"><span style={{ color: '#6366f1' }}>◎</span><span>kaftimda</span></div>
            <div className="flex items-center gap-1"><Send size={10} style={{ color: '#6366f1' }} /><span>Kaftimda_ERP</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
