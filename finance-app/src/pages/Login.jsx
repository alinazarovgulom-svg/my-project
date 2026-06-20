import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, Mail, Phone, Send, Loader, ArrowLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { loginUser, registerUser, migrateLocalUsers, resetPasswordByUsername } from '../store/auth'

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  dur: 4 + Math.random() * 6,
  delay: Math.random() * 4,
  color: i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#a855f7' : '#22d3ee',
}))

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
  const [focused, setFocused] = useState(null)
  const [shake, setShake] = useState(false)

  useEffect(() => { migrateLocalUsers() }, [])
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await loginUser(form.username, form.password)
        if (res.error) { setError(res.error); setShake(true); setTimeout(() => setShake(false), 500); return }
        setUser(res.user); nav('/')
      } else if (mode === 'register') {
        if (!form.name || !form.username || !form.password) { setError(t('fillAll')); setShake(true); setTimeout(() => setShake(false), 500); return }
        if (form.password.length < 4) { setError(t('passwordShort')); setShake(true); setTimeout(() => setShake(false), 500); return }
        const res = await registerUser(form.name, form.username, form.password)
        if (res.error) { setError(res.error); setShake(true); setTimeout(() => setShake(false), 500); return }
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

  const fade = (delay = 0, extra = {}) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.95)',
    transition: `opacity 0.55s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms, transform 0.55s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
    ...extra,
  })

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: '#000' }}>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px,-30px) scale(1.2); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-30px,40px) scale(1.15); }
        }
        @keyframes logoIn {
          0% { transform: scale(0.4) rotate(-15deg); opacity: 0; filter: brightness(3); }
          60% { transform: scale(1.1) rotate(4deg); opacity: 1; filter: brightness(1.4); }
          80% { transform: scale(0.97) rotate(-1deg); filter: brightness(1); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 50px rgba(99,102,241,0.8), 0 0 100px rgba(139,92,246,0.4); }
        }
        @keyframes shine {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(10px); }
          45% { transform: translateX(-7px); }
          60% { transform: translateX(7px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
        @keyframes badgePop {
          0% { transform: scale(0) rotate(20deg); opacity: 0; }
          70% { transform: scale(1.2) rotate(-5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes scanH {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .input-glow:focus-within {
          box-shadow: 0 0 0 2px rgba(99,102,241,0.4), 0 4px 20px rgba(99,102,241,0.15);
        }
      `}</style>

      {/* Background: floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `floatUp ${p.dur}s ${p.delay}s linear infinite`,
            opacity: 0,
          }} />
        ))}

        {/* Big orbs */}
        <div style={{
          position: 'absolute', top: '-120px', left: '-100px',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          animation: 'orb1 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-80px',
          width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          animation: 'orb2 13s ease-in-out infinite',
        }} />

        {/* Horizontal scan line */}
        {mounted && (
          <div style={{
            position: 'absolute', left: 0, right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)',
            animation: 'scanH 3s 0.5s ease-in-out forwards',
          }} />
        )}
      </div>

      {/* Top: KAFTIMDA brand */}
      <div className="pt-10 pb-1 flex flex-col items-center relative z-10" style={fade(0)}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: 1, height: 18, background: 'rgba(99,102,241,0.4)' }} />
          <span style={{
            fontSize: 11, fontWeight: 900, letterSpacing: '0.35em',
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #818cf8, #c4b5fd, #67e8f9, #818cf8)',
            backgroundSize: '300% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shine 4s linear infinite',
          }}>KAFTIMDA</span>
          <div style={{ width: 1, height: 18, background: 'rgba(99,102,241,0.4)' }} />
        </div>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
          KAFTIMDA bilan biznesingiz kaftingizda
        </p>
        {/* Lang */}
        <div className="flex gap-1.5 mt-3">
          {[['uz','🇺🇿'],['ru','🇷🇺'],['en','🇬🇧']].map(([l, flag]) => (
            <button key={l} onClick={() => setLang(l)}
              className="text-sm px-2 py-0.5 rounded-lg transition-all"
              style={lang === l
                ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                : { color: '#374151', border: '1px solid transparent' }}>
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Logo + Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6" style={fade(100)}>
            <div className="relative mb-4">
              <div className="w-[88px] h-[88px] rounded-[28px] flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #4338ca 100%)',
                  animation: mounted
                    ? 'logoIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards, glowPulse 3s 0.8s ease-in-out infinite'
                    : 'none',
                }}>
                <img src="/icon.svg" alt="PulBek" style={{ width: 70, height: 70 }} />
              </div>
              {/* Green badge */}
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 26, height: 26,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                borderRadius: '50%',
                border: '2.5px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 14px rgba(34,197,94,0.7)',
                animation: mounted ? 'badgePop 0.5s 0.6s cubic-bezier(0.34,1.7,0.64,1) both' : 'none',
                opacity: mounted ? 1 : 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#000' }}>✓</span>
              </div>
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>PulBek</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{t('tagline')}</p>
          </div>

          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="flex p-1 mb-5 rounded-2xl" style={{
              ...fade(180),
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setResetDone(false) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
                  style={mode === m ? {
                    background: 'linear-gradient(135deg, #312e81, #4c1d95)',
                    color: '#e0e7ff',
                    boxShadow: '0 2px 16px rgba(99,102,241,0.35)',
                  } : { color: 'rgba(255,255,255,0.25)' }}>
                  {mode === m && (
                    <span className="absolute inset-0 rounded-xl pointer-events-none" style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                      backgroundSize: '300% 100%',
                      animation: 'shine 2s linear infinite',
                    }} />
                  )}
                  <span className="relative">{m === 'login' ? t('login') : t('register')}</span>
                </button>
              ))}
            </div>
          )}

          {/* Reset mode header */}
          {mode === 'reset' && (
            <div className="mb-5" style={fade(0)}>
              <button onClick={() => { setMode('login'); setError(''); setResetDone(false); setForm({ name: '', username: '', password: '' }) }}
                className="flex items-center gap-1.5 text-sm mb-4 active:opacity-60"
                style={{ color: '#818cf8' }}>
                <ArrowLeft size={14} /> Orqaga
              </button>
              <h2 className="font-black text-lg mb-1" style={{ color: '#fff' }}>Parolni tiklash</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Login nomingizni kiriting va yangi parol o'rnating</p>
            </div>
          )}

          {/* Success */}
          {resetDone ? (
            <div className="flex flex-col items-center gap-4 py-6" style={fade(0)}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)',
                border: '2px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(34,197,94,0.25)',
                fontSize: 32,
              }}>✓</div>
              <p className="font-bold text-center" style={{ color: '#4ade80' }}>Parol muvaffaqiyatli yangilandi!</p>
              <button onClick={() => { setMode('login'); setResetDone(false); setForm({ name: '', username: form.username, password: '' }); setError('') }}
                className="btn-primary">Kirish</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3" style={{ animation: shake ? 'shake 0.45s ease' : 'none' }}>

              {/* Name field (register only) */}
              {mode === 'register' && (
                <div className="relative rounded-2xl input-glow transition-all" style={{
                  ...fade(220),
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${focused === 'name' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.55s cubic-bezier(0.34,1.2,0.64,1) 220ms, transform 0.55s cubic-bezier(0.34,1.2,0.64,1) 220ms',
                }}>
                  <User className="absolute left-4 top-1/2 -translate-y-1/2" size={15} style={{ color: focused === 'name' ? '#818cf8' : '#374151' }} />
                  <input className="w-full bg-transparent pl-11 pr-4 py-3.5 outline-none text-sm"
                    style={{ color: '#fff' }}
                    placeholder={t('fullName')}
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    autoCorrect="off" />
                </div>
              )}

              {/* Username */}
              <div className="relative rounded-2xl input-glow transition-all" style={{
                ...fade(mode === 'register' ? 260 : 220),
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${focused === 'username' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.55s cubic-bezier(0.34,1.2,0.64,1) 260ms, transform 0.55s cubic-bezier(0.34,1.2,0.64,1) 260ms',
              }}>
                <User className="absolute left-4 top-1/2 -translate-y-1/2" size={15} style={{ color: focused === 'username' ? '#818cf8' : '#374151' }} />
                <input className="w-full bg-transparent pl-11 pr-4 py-3.5 outline-none text-sm"
                  style={{ color: '#fff', fontSize: 16 }}
                  placeholder={t('username')}
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
              </div>

              {/* Password */}
              <div className="relative rounded-2xl input-glow transition-all" style={{
                ...fade(mode === 'register' ? 300 : 260),
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${focused === 'password' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.55s cubic-bezier(0.34,1.2,0.64,1) 300ms, transform 0.55s cubic-bezier(0.34,1.2,0.64,1) 300ms',
              }}>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={15} style={{ color: focused === 'password' ? '#818cf8' : '#374151' }} />
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

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
                  style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-base relative overflow-hidden active:scale-[0.97] disabled:opacity-60"
                style={{
                  ...fade(mode === 'register' ? 340 : 300),
                  marginTop: 4,
                  background: 'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #4338ca 100%)',
                  backgroundSize: '200% auto',
                  color: '#e0e7ff',
                  boxShadow: '0 4px 30px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
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
                    : <>
                        {mode === 'login' ? t('enterBtn') : mode === 'reset' ? 'Parolni yangilash' : t('registerBtn')}
                        <ChevronRight size={16} />
                      </>
                  }
                </span>
              </button>

              {mode === 'login' && (
                <button type="button"
                  onClick={() => { setMode('reset'); setError(''); setForm(f => ({ ...f, password: '' })) }}
                  className="text-center text-xs py-1 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Parolni unutdim?
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-5 flex flex-col items-center gap-3 relative z-10" style={fade(440)}>
        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex flex-col items-center gap-1" style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>
          <div className="flex items-center gap-1.5">
            <Mail size={9} style={{ color: '#6366f1' }} />
            <span>kaftimda@gmail.com</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <Phone size={9} style={{ color: '#6366f1' }} />
            <span>+998 91 760 66 66</span>
          </div>
        </div>
      </div>
    </div>
  )
}
