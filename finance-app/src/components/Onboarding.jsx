import { useState, useEffect } from 'react'

const FEATURES = [
  { icon: '💰', text: 'Kirim va chiqimlarni valyuta bo\'yicha yuritish' },
  { icon: '💳', text: 'Qarzlarni kuzatish va eslatmalar' },
  { icon: '💱', text: 'Valyuta konvertatsiyasi' },
  { icon: '📊', text: 'Hisobotlar va kunlik qoldiq' },
  { icon: '👨‍👩‍👧', text: 'Oilaviy rejim' },
  { icon: '🔐', text: 'PIN qulfi va xavfsizlik' },
]

const TITLE = 'PulBek'

export default function Onboarding({ onDone }) {
  const [phase, setPhase] = useState(0)
  const [typedTitle, setTypedTitle] = useState('')
  const [visibleFeatures, setVisibleFeatures] = useState([])
  const [showBtn, setShowBtn] = useState(false)
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 6 + 3,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 2,
      color: i % 3 === 0 ? 'rgba(59,130,246,0.4)' : i % 3 === 1 ? 'rgba(124,58,237,0.4)' : 'rgba(16,185,129,0.3)',
    }))
  )

  useEffect(() => {
    const timers = []
    timers.push(setTimeout(() => setPhase(1), 300))
    timers.push(setTimeout(() => setPhase(2), 900))
    timers.push(setTimeout(() => setPhase(3), 1600))

    // Typewriter
    let i = 0
    const typeTimer = setTimeout(() => {
      const iv = setInterval(() => {
        i++
        setTypedTitle(TITLE.slice(0, i))
        if (i >= TITLE.length) clearInterval(iv)
      }, 100)
      timers.push(iv)
    }, 1600)
    timers.push(typeTimer)

    // Features
    FEATURES.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setVisibleFeatures(prev => [...prev, idx])
      }, 2600 + idx * 150))
    })

    timers.push(setTimeout(() => setShowBtn(true), 2600 + FEATURES.length * 150 + 300))

    return () => timers.forEach(t => { clearTimeout(t); clearInterval(t) })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#050510' }}>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0px) scale(1); opacity: 0.6; }
          100% { transform: translateY(-40px) scale(1.1); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #60a5fa, #ffffff, #a78bfa, #60a5fa);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2.5s linear infinite;
        }
        .cursor-blink {
          animation: blink 0.8s ease infinite;
        }
        .bg-animated {
          background: linear-gradient(135deg, #050510, #0a0520, #050510, #0a1525);
          background-size: 400% 400%;
          animation: gradient-shift 8s ease infinite;
        }
      `}</style>

      {/* Animated background */}
      <div className="absolute inset-0 bg-animated" />

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: phase >= 1 ? 0.07 : 0,
          transition: 'opacity 2s ease'
        }} />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(59,130,246,0.12) 0%, transparent 70%)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 1.5s ease'
        }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 40% 40% at 50% 40%, rgba(124,58,237,0.08) 0%, transparent 70%)',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 1.5s ease 0.5s'
        }} />

      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            opacity: phase >= 1 ? 1 : 0,
            animation: `floatUp ${p.duration}s ${p.delay}s ease-in infinite`,
            transition: 'opacity 1s ease'
          }} />
      ))}

      {/* Pulse rings behind logo */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '18%' }}>
        {[0, 1, 2].map(i => (
          <div key={i}
            className="absolute rounded-full border border-blue-500/20"
            style={{
              width: 120, height: 120,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: phase >= 2 ? 1 : 0,
              animation: phase >= 2 ? `pulse-ring 2.4s ${i * 0.8}s ease-out infinite` : 'none',
            }} />
        ))}
      </div>

      {/* Spinning ring */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: 'calc(18% - 12px)',
          width: 120, height: 120,
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.8s ease',
          animation: 'spin-slow 8s linear infinite'
        }}>
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="56" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="8 6" />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="120" y2="120">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">

        {/* Logo */}
        <div className="relative mb-5"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.2) translateY(30px)',
            transition: 'all 0.9s cubic-bezier(0.34, 1.6, 0.64, 1)',
          }}>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
              boxShadow: phase >= 2
                ? '0 0 0 1px rgba(124,58,237,0.3), 0 0 30px rgba(59,130,246,0.5), 0 0 60px rgba(124,58,237,0.3), 0 20px 40px rgba(0,0,0,0.5)'
                : '0 8px 30px rgba(59,130,246,0.3)',
              transition: 'box-shadow 1s ease 0.5s'
            }}>
            <span className="text-5xl font-black text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>₿</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-180deg)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.6, 0.64, 1) 0.7s',
              boxShadow: '0 0 12px rgba(74,222,128,0.6)'
            }}>
            <span className="text-sm font-bold text-dark-900">✓</span>
          </div>
        </div>

        {/* Branding */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.6s ease 0.3s'
        }}>
          <span className="text-xs font-bold tracking-[0.3em] uppercase"
            style={{ color: 'rgba(147,197,253,0.7)' }}>by KAFTIMDA</span>
        </div>

        {/* Typewriter title */}
        <h1 className="text-4xl font-black tracking-tight mb-1 mt-2 min-h-[52px] flex items-center">
          <span className="shimmer-text">{typedTitle}</span>
          {typedTitle.length < TITLE.length && (
            <span className="cursor-blink inline-block w-0.5 h-9 bg-blue-400 ml-1 rounded-full" />
          )}
        </h1>

        {/* Tagline */}
        <p className="text-sm text-center mb-6"
          style={{
            color: 'rgba(156,163,175,0.9)',
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.7s ease',
            letterSpacing: '0.01em'
          }}>
          Shaxsiy moliyangizni oson boshqaring
        </p>

        {/* Features grid */}
        <div className="w-full grid grid-cols-2 gap-2 mb-6">
          {FEATURES.map((f, i) => (
            <div key={i}
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(10px)',
                opacity: visibleFeatures.includes(i) ? 1 : 0,
                transform: visibleFeatures.includes(i)
                  ? 'translateY(0) scale(1)'
                  : 'translateY(24px) scale(0.9)',
                transition: 'all 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)',
                boxShadow: visibleFeatures.includes(i)
                  ? '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'none'
              }}>
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <p className="text-xs leading-snug" style={{ color: 'rgba(209,213,219,0.9)' }}>{f.text}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={onDone}
          className="w-full py-4 rounded-2xl font-bold text-white text-base relative overflow-hidden active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
            backgroundSize: '200% auto',
            opacity: showBtn ? 1 : 0,
            transform: showBtn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            transition: 'all 0.6s cubic-bezier(0.34, 1.4, 0.64, 1)',
            pointerEvents: showBtn ? 'auto' : 'none',
            boxShadow: showBtn
              ? '0 0 0 1px rgba(124,58,237,0.4), 0 8px 30px rgba(59,130,246,0.4), 0 20px 40px rgba(124,58,237,0.2)'
              : 'none',
          }}>
          {/* Shimmer sweep on button */}
          <span className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: showBtn ? 'shimmer 2s 0.5s linear infinite' : 'none'
            }} />
          <span className="relative">Boshlash →</span>
        </button>
      </div>
    </div>
  )
}
