import { useState, useEffect } from 'react'

const FEATURES = [
  { icon: '💰', text: 'Kirim va chiqimlarni valyuta bo\'yicha yuritish' },
  { icon: '💳', text: 'Qarzlarni kuzatish va eslatmalar' },
  { icon: '💱', text: 'Valyuta konvertatsiyasi' },
  { icon: '📊', text: 'Hisobotlar va kunlik qoldiq' },
  { icon: '👨‍👩‍👧', text: 'Oilaviy rejim' },
  { icon: '🔐', text: 'PIN qulfi va xavfsizlik' },
]

// Phases:
// 0 → qora ekran
// 1 → "KAFTIMDA presents..." chiqadi
// 2 → "KAFTIMDA presents..." yo'qoladi
// 3 → logo zoom in portlaydi + vizual zarba
// 4 → "PulBek" shimmer bilan chiqadi
// 5 → tagline + features + button

export default function Onboarding({ onDone }) {
  const [phase, setPhase] = useState(0)
  const [showShockwave, setShowShockwave] = useState(false)
  const [visibleFeatures, setVisibleFeatures] = useState([])
  const [showBtn, setShowBtn] = useState(false)
  const [typedTitle, setTypedTitle] = useState('')
  const [typedTagline, setTypedTagline] = useState('')

  useEffect(() => {
    const T = (fn, ms) => setTimeout(fn, ms)
    const timers = []

    // Tagline typewriter — starts after KAFTIMDA appears
    let taglineIv = null
    timers.push(T(() => {
      const tagline = 'KAFTIMDA bilan biznesingiz kaftingizda'
      let i = 0
      taglineIv = setInterval(() => {
        i++
        setTypedTagline(tagline.slice(0, i))
        if (i >= tagline.length) clearInterval(taglineIv)
      }, 38)
    }, 700))

    timers.push(T(() => setPhase(1), 150))
    timers.push(T(() => setPhase(2), 2300))
    timers.push(T(() => {
      setPhase(3)
      setShowShockwave(true)
      setTimeout(() => setShowShockwave(false), 500)
    }, 2600))
    timers.push(T(() => setPhase(4), 2900))

    // Typewriter for PulBek title
    let typewriterIv = null
    timers.push(T(() => {
      const title = 'PulBek'
      let i = 0
      typewriterIv = setInterval(() => {
        i++
        setTypedTitle(title.slice(0, i))
        if (i >= title.length) clearInterval(typewriterIv)
      }, 50)
    }, 2950))

    timers.push(T(() => setPhase(5), 3500))

    FEATURES.forEach((_, idx) => {
      timers.push(T(() => {
        setVisibleFeatures(prev => [...prev, idx])
      }, 3600 + idx * 60))
    })

    timers.push(T(() => setShowBtn(true), 3600 + FEATURES.length * 60 + 80))

    return () => {
      timers.forEach(t => { clearTimeout(t); clearInterval(t) })
      if (typewriterIv) clearInterval(typewriterIv)
      if (taglineIv) clearInterval(taglineIv)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden flex flex-col"
      style={{ background: '#000' }}>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes shockwave {
          0% { transform: translate(-50%,-50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(6); opacity: 0; }
        }
        @keyframes shockwave2 {
          0% { transform: translate(-50%,-50%) scale(0); opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
        @keyframes filmFlicker {
          0%,100% { opacity:1; } 5% { opacity:0.85; } 10% { opacity:1; } 40% { opacity:0.95; } 45% { opacity:1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes logoPop {
          0% { transform: scale(0.01); opacity:0; filter: brightness(5); }
          60% { transform: scale(1.15); opacity:1; filter: brightness(1.5); }
          80% { transform: scale(0.95); filter: brightness(1); }
          100% { transform: scale(1); opacity:1; filter: brightness(1); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 30px rgba(59,130,246,0.5), 0 0 60px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 50px rgba(59,130,246,0.8), 0 0 100px rgba(124,58,237,0.5), 0 0 150px rgba(59,130,246,0.2); }
        }
        @keyframes btnShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(16px); }
          to { opacity:1; transform: translateY(0); }
        }
        @keyframes presentsIn {
          0% { opacity:0; letter-spacing: 0.8em; }
          100% { opacity:1; letter-spacing: 0.35em; }
        }
        @keyframes kaftimda-shine {
          0%   { background-position: -200% center; }
          50%  { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes starFloat {
          0% { transform: translateY(0) scale(1); opacity:0.8; }
          100% { transform: translateY(-60px) scale(0); opacity:0; }
        }
        .shimmer-title {
          background: linear-gradient(90deg, #93c5fd, #ffffff, #c4b5fd, #ffffff, #93c5fd);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
        }
      `}</style>

      {/* Film grain overlay */}
      {phase >= 1 && phase <= 2 && (
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
            animation: 'filmFlicker 0.1s infinite',
            opacity: 0.15,
          }} />
      )}

      {/* Scanline */}
      {phase >= 1 && phase <= 2 && (
        <div className="absolute left-0 right-0 h-8 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(transparent, rgba(255,255,255,0.03), transparent)',
            animation: 'scanline 2s linear infinite',
          }} />
      )}

      {/* ── PHASE 1-2: KAFTIMDA presents ── */}
      <div className="absolute inset-0 flex flex-col items-center z-20"
        style={{
          justifyContent: 'center',
          paddingBottom: '15vh',
          opacity: phase === 1 ? 1 : 0,
          transition: phase === 2 ? 'opacity 0.5s ease' : 'opacity 0.8s ease',
          pointerEvents: 'none',
        }}>
        <p style={{
          fontSize: '13px',
          fontWeight: 400,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: '#b8860b',
          marginBottom: '10px',
          animation: phase === 1 ? 'fadeUp 0.8s ease forwards' : 'none',
        }}>
          by
        </p>
        <p style={{
          fontSize: '32px',
          fontWeight: 900,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffe066, #ffd700, #b8860b)',
          backgroundSize: '300% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: phase === 1 ? 'presentsIn 1s cubic-bezier(0.16,1,0.3,1) forwards, kaftimda-shine 3s ease-in-out infinite' : 'none',
        }}>
          KAFTIMDA
        </p>
        {/* Tagline typewriter */}
        <div style={{
          marginTop: '20px',
          minHeight: '22px',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          {typedTagline}
          {typedTagline.length > 0 && typedTagline.length < 38 && (
            <span style={{
              display: 'inline-block',
              width: '1.5px',
              height: '13px',
              background: '#ffd700',
              marginLeft: '2px',
              verticalAlign: 'middle',
              animation: 'filmFlicker 0.5s infinite',
            }} />
          )}
        </div>
      </div>

      {/* ── SHOCKWAVE rings ── */}
      {showShockwave && (
        <div className="absolute pointer-events-none z-30" style={{ left: '50%', top: '28%' }}>
          <div style={{
            position: 'absolute',
            width: 120, height: 120,
            border: '2px solid rgba(59,130,246,0.8)',
            borderRadius: '50%',
            animation: 'shockwave 0.8s ease-out forwards',
          }} />
          <div style={{
            position: 'absolute',
            width: 120, height: 120,
            border: '1px solid rgba(124,58,237,0.6)',
            borderRadius: '50%',
            animation: 'shockwave2 0.9s 0.1s ease-out forwards',
          }} />
          <div style={{
            position: 'absolute',
            width: 120, height: 120,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '50%',
            animation: 'shockwave 0.6s ease-out forwards',
          }} />
        </div>
      )}

      {/* Stars burst on logo pop */}
      {phase >= 3 && [...Array(12)].map((_, i) => {
        const angle = (i / 12) * 360
        const dist = 80 + Math.random() * 40
        return (
          <div key={i}
            className="absolute pointer-events-none z-30"
            style={{
              left: `calc(50% + ${Math.cos(angle * Math.PI / 180) * dist}px)`,
              top: `calc(28% + ${Math.sin(angle * Math.PI / 180) * dist}px)`,
              width: 4, height: 4,
              background: i % 2 === 0 ? '#60a5fa' : '#a78bfa',
              borderRadius: '50%',
              animation: 'starFloat 0.8s ease-out forwards',
              boxShadow: `0 0 6px ${i % 2 === 0 ? '#60a5fa' : '#a78bfa'}`,
            }} />
        )
      })}

      {/* ── PHASE 3+: Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-20"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}>

        {/* Dark background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(29,78,216,0.15) 0%, transparent 70%)',
            opacity: phase >= 4 ? 1 : 0,
            transition: 'opacity 1.5s ease',
          }} />

        {/* Logo */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              animation: phase === 3 ? 'logoPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards, glowPulse 3s 0.8s ease-in-out infinite' : 'glowPulse 3s ease-in-out infinite',
            }}>
            <img src="/icon.svg" alt="PulBek" style={{ width: '80px', height: '80px' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center"
            style={{
              opacity: phase >= 4 ? 1 : 0,
              transform: phase >= 4 ? 'scale(1)' : 'scale(0)',
              transition: 'all 0.5s cubic-bezier(0.34,1.7,0.64,1) 0.3s',
              boxShadow: '0 0 12px rgba(74,222,128,0.7)',
            }}>
            <span className="text-sm font-bold" style={{ color: '#000' }}>✓</span>
          </div>
        </div>

        {/* by KAFTIMDA */}
        <p style={{
          fontSize: '10px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(147,197,253,0.7)',
          fontWeight: 700,
          opacity: phase >= 4 ? 1 : 0,
          transition: 'opacity 0.6s ease 0.2s',
        }}>by KAFTIMDA</p>

        {/* Title */}
        <h1 className="text-4xl font-black tracking-tight mb-1 mt-2 min-h-[52px] flex items-center">
          {phase >= 4 && (
            <>
              <span className="shimmer-title">{typedTitle}</span>
              {typedTitle.length < 6 && (
                <span className="inline-block w-0.5 h-9 bg-blue-400 ml-1 rounded-full"
                  style={{ animation: 'filmFlicker 0.6s infinite' }} />
              )}
            </>
          )}
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '13px',
          color: 'rgba(156,163,175,0.9)',
          textAlign: 'center',
          marginBottom: '24px',
          opacity: phase >= 5 ? 1 : 0,
          animation: phase >= 5 ? 'fadeUp 0.6s ease forwards' : 'none',
        }}>
          Shaxsiy moliyangizni oson boshqaring
        </p>

        {/* Features */}
        <div className="w-full grid grid-cols-2 gap-2 mb-6">
          {FEATURES.map((f, i) => (
            <div key={i}
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                opacity: visibleFeatures.includes(i) ? 1 : 0,
                transform: visibleFeatures.includes(i) ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.92)',
                transition: 'all 0.45s cubic-bezier(0.34,1.4,0.64,1)',
              }}>
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <p className="text-xs leading-snug" style={{ color: 'rgba(209,213,219,0.9)' }}>{f.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={onDone}
          className="w-full py-4 rounded-2xl font-bold text-white text-base relative overflow-hidden active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
            opacity: showBtn ? 1 : 0,
            transform: showBtn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            transition: 'all 0.6s cubic-bezier(0.34,1.4,0.64,1)',
            pointerEvents: showBtn ? 'auto' : 'none',
            boxShadow: showBtn ? '0 0 30px rgba(59,130,246,0.4), 0 0 60px rgba(124,58,237,0.2)' : 'none',
          }}>
          <span className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
              backgroundSize: '300% 100%',
              animation: showBtn ? 'btnShimmer 2s 0.3s linear infinite' : 'none',
            }} />
          <span className="relative">Boshlash →</span>
        </button>
      </div>
    </div>
  )
}
