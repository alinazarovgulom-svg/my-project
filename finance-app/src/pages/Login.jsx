import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Mail, Phone, Loader, ArrowLeft, ChevronRight } from 'lucide-react'
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
  const [focused, setFocused] = useState(null)
  const [shake, setShake] = useState(false)
  const [mounted, setMounted] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { migrateLocalUsers() }, [])
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true))) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await loginUser(form.username, form.password)
        if (res.error) { setError(res.error); trigShake(); return }
        setUser(res.user); nav('/')
      } else if (mode === 'register') {
        if (!form.name || !form.username || !form.password) { setError(t('fillAll')); trigShake(); return }
        if (form.password.length < 4) { setError(t('passwordShort')); trigShake(); return }
        const res = await registerUser(form.name, form.username, form.password)
        if (res.error) { setError(res.error); trigShake(); return }
        setUser(res.user); nav('/')
      } else if (mode === 'reset') {
        if (!form.username) { setError('Login nomini kiriting'); return }
        if (!form.password || form.password.length < 4) { setError("Yangi parol kamida 4 ta belgidan iborat bo'lsin"); return }
        const res = await resetPasswordByUsername(form.username, form.password)
        if (res.error) { setError(res.error); return }
        setResetDone(true)
      }
    } catch {
      setError('Tarmoq xatosi. Internet aloqasini tekshiring.')
    } finally {
      setLoading(false)
    }
  }

  const trigShake = () => { setShake(true); setTimeout(() => setShake(false), 500) }

  const fade = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
  })

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: '#000' }}>

      <style>{`
        @keyframes logoFloat {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-6px); }
        }
        @keyframes logoPulse {
          0%,100% { box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.15); }
          50%     { box-shadow: 0 0 60px rgba(99,102,241,0.8), 0 0 120px rgba(139,92,246,0.3); }
        }
        @keyframes shine {
          from { background-position: -300% center; }
          to   { background-position: 300% center; }
        }
        @keyframes ringPulse {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%     { opacity: 1; transform: scale(1.04); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-9px); }
          30%     { transform: translateX(9px); }
          45%     { transform: translateX(-6px); }
          60%     { transform: translateX(6px); }
          80%     { transform: translateX(-3px); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0) rotate(20deg); opacity: 0; }
          70%  { transform: scale(1.25) rotate(-5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0,0); }
          33%     { transform: translate(20px,-15px); }
          66%     { transform: translate(-10px,20px); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0,0); }
          33%     { transform: translate(-25px,10px); }
          66%     { transform: translate(15px,-25px); }
        }
        .input-wrap:focus-within {
          border-color: rgba(99,102,241,0.7) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12), 0 4px 20px rgba(99,102,241,0.1);
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-100px', left: '-80px',
          width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          animation: 'orbFloat1 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-60px',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          animation: 'orbFloat2 15s ease-in-out infinite',
        }} />
        <div className="absolute inset-0" style={{ opacity: 0.025 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i / 6) * 100}%`, width: 1, background: '#6366f1' }} />
          ))}
        </div>
      </div>

      {/* Brand top */}
      <div className="pt-9 pb-1 flex flex-col items-center relative z-10" style={fade(0)}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 24, height: 1, background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.5))' }} />
          <span style={{
            fontSize: 10, fontWeight: 900, letterSpacing: '0.35em',
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #818cf8, #c4b5fd, #67e8f9, #818cf8)',
            backgroundSize: '300% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'shine 4s linear infinite',
          }}>KAFTIMDA</span>
          <div style={{ width: 24, height: 1, background: 'linear-gradient(to left, transparent, rgba(99,102,241,0.5))' }} />
        </div>
        <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em', marginTop: 3 }}>
          KAFTIMDA bilan biznesingiz kaftingizda
        </p>
        <div className="flex gap-1.5 mt-2.5">
          {[['uz','🇺🇿'],['ru','🇷🇺'],['en','🇬🇧']].map(([l, flag]) => (
            <button key={l} onClick={() => setLang(l)}
              className="text-sm px-2 py-0.5 rounded-lg"
              style={lang === l
                ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                : { color: '#374151', border: '1px solid transparent' }}>
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6" style={fade(80)}>
            <div className="relative mb-4" style={{ animation: 'logoFloat 4s ease-in-out infinite' }}>
              <div style={{
                position: 'absolute', inset: -10,
                borderRadius: '36px',
                border: '1px solid rgba(99,102,241,0.2)',
                animation: 'ringPulse 2.5s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -20,
                borderRadius: '44px',
                border: '1px solid rgba(99,102,241,0.08)',
                animation: 'ringPulse 2.5s 0.3s ease-in-out infinite',
              }} />
              <div className="w-[86px] h-[86px] rounded-[26px] flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e3a8a 60%, #4338ca)',
                  animation: 'logoPulse 3s ease-in-out infinite',
                }}>
                <img src="/icon.svg" alt="PulBek" style={{ width: 68, height: 68 }} />
              </div>
              <div style={{
                position: 'absolute', bottom: -5, right: -5,
                width: 26, height: 26,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                borderRadius: '50%',
                border: '2.5px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(34,197,94,0.7)',
                animation: 'badgePop 0.5s cubic-bezier(0.34,1.7,0.64,1) both',
              }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#000' }}>✓</span>
              </div>
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #ffffff 30%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>PulBek</h1>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{t('tagline')}</p>
          </div>

          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="flex p-1 mb-4 rounded-2xl" style={{
              ...fade(160),
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setResetDone(false) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
                  style={mode === m ? {
                    background: 'linear-gradient(135deg, #312e81, #4c1d95)',
                    color: '#e0e7ff',
                    boxShadow: '0 2px 16px rgba(99,102,241,0.4)',
                  } : { color: 'rgba(255,255,255,0.22)' }}>
                  {mode === m && (
                    <span className="absolute inset-0 rounded-xl pointer-events-none" style={{
                      background: 'linear-gradient(105deg,transparent 25%,rgba(255,255,255,0.1) 50%,transparent 75%)',
                      backgroundSize: '300% 100%',
                      animation: 'shine 2.5s linear infinite',
                    }} />
                  )}
                  <span className="relative">{m === 'login' ? t('login') : t('register')}</span>
                </button>
              ))}
            </div>
          )}

          {/* Reset header */}
          {mode === 'reset' && (
            <div className="mb-4" style={fade(0)}>
              <button onClick={() => { setMode('login'); setError(''); setResetDone(false); setForm({ name: '', username: '', password: '' }) }}
                className="flex items-center gap-1.5 text-sm mb-3 active:opacity-60"
                style={{ color: '#818cf8' }}>
                <ArrowLeft size={14} /> Orqaga
              </button>
              <h2 className="font-black text-lg mb-0.5" style={{ color: '#fff' }}>Parolni tiklash</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Login va yangi parolni kiriting</p>
            </div>
          )}

          {resetDone ? (
            <div className="flex flex-col items-center gap-4 py-6" style={fade(0)}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)',
                border: '2px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(34,197,94,0.25)', fontSize: 32,
              }}>✓</div>
              <p className="font-bold text-center" style={{ color: '#4ade80' }}>Parol muvaffaqiyatli yangilandi!</p>
              <button onClick={() => { setMode('login'); setResetDone(false); setForm({ name: '', username: form.username, password: '' }); setError('') }}
                className="btn-primary">Kirish</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3"
              style={{ animation: shake ? 'shake 0.45s ease' : 'none' }}>

              {mode === 'register' && (
                <div className="input-wrap relative rounded-2xl transition-all" style={{
                  ...fade(220),
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <User className="absolute left-4 top-1/2 -translate-y-1/2" size={15}
                    style={{ color: focused === 'name' ? '#818cf8' : '#374151' }} />
                  <input className="w-full bg-transparent pl-11 pr-4 py-3.5 outline-none text-sm"
                    style={{ color: '#fff', fontSize: 16 }}
                    placeholder={t('fullName')}
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    autoCorrect="off" />
                </div>
              )}

              <div className="input-wrap relative rounded-2xl transition-all" style={{
                ...fade(mode === 'register' ? 260 : 220),
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <User className="absolute left-4 top-1/2 -translate-y-1/2" size={15}
                  style={{ color: focused === 'username' ? '#818cf8' : '#374151' }} />
                <input className="w-full bg-transparent pl-11 pr-4 py-3.5 outline-none text-sm"
                  style={{ color: '#fff', fontSize: 16 }}
                  placeholder={t('username')}
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
              </div>

              <div className="input-wrap relative rounded-2xl transition-all" style={{
                ...fade(mode === 'register' ? 300 : 260),
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={15}
                  style={{ color: focused === 'password' ? '#818cf8' : '#374151' }} />
                <input
                  className="w-full bg-transparent pl-11 pr-12 py-3.5 outline-none text-sm"
                  style={{ color: '#fff', fontSize: 16 }}
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'reset' ? 'Yangi parol (kamida 4 ta belgi)' : t('password')}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  autoCapitalize="none" autoCorrect="off" spellCheck="false"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: '#374151' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
                  style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-base relative overflow-hidden active:scale-[0.97] disabled:opacity-60"
                style={{
                  ...fade(mode === 'register' ? 340 : 300),
                  marginTop: 4,
                  background: 'linear-gradient(135deg, #312e81, #4c1d95 50%, #4338ca)',
                  color: '#e0e7ff',
                  boxShadow: '0 4px 30px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                  border: '1px solid rgba(99,102,241,0.3)',
                }}>
                <span className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                  background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.12) 50%, transparent 75%)',
                  backgroundSize: '300% 100%',
                  animation: 'shine 2.5s linear infinite',
                }} />
                <span className="relative flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader size={17} className="animate-spin" /> Tekshirilmoqda...</>
                    : <>{mode === 'login' ? t('enterBtn') : mode === 'reset' ? 'Yangilash' : t('registerBtn')}<ChevronRight size={16} /></>
                  }
                </span>
              </button>

              {mode === 'login' && (
                <button type="button"
                  onClick={() => { setMode('reset'); setError(''); setForm(f => ({ ...f, password: '' })) }}
                  className="text-center text-xs py-1"
                  style={{ color: 'rgba(255,255,255,0.18)' }}>
                  Parolni unutdim?
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-7 px-5 flex flex-col items-center gap-2 relative z-10" style={fade(440)}>
        <div style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.14)', fontSize: 10 }}>
          <div className="flex items-center gap-1">
            <Mail size={9} style={{ color: '#6366f1' }} />
            <span>kaftimda@gmail.com</span>
          </div>
          <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center gap-1">
            <Phone size={9} style={{ color: '#6366f1' }} />
            <span>+998 91 760 66 66</span>
          </div>
        </div>
      </div>
    </div>
  )
}
