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
// 1 → yumruq ✊ paydo bo'ladi
// 2 → kaft ochiladi ✋
// 3 → "KAFTIMDA" yozuvi chiqadi
// 4 → ikkalasi logoga aylanadi (morph)
// 5 → PulBek title + features

export default function Onboarding({ onDone }) {
  const [phase, setPhase] = useState(0)
  const [handEmoji, setHandEmoji] = useState('✊')
  const [showText, setShowText] = useState(false)
  const [morphing, setMorphing] = useState(false)
  const [showLogo, setShowLogo] = useState(false)
  const [visibleFeatures, setVisibleFeatures] = useState([])
  const [showContent, setShowContent] = useState(false)
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    const T = (fn, ms) => setTimeout(fn, ms)
    const timers = []

    // Phase 1 — yumruq chiqadi
    timers.push(T(() => setPhase(1), 400))

    // Phase 2 — kaft ochiladi
    timers.push(T(() => {
      setPhase(2)
      setHandEmoji('🤚')
    }, 1400))

    // Phase 3 — KAFTIMDA yozuvi chiqadi
    timers.push(T(() => {
      setPhase(3)
      setShowText(true)
    }, 2200))

    // Phase 4 — morph logoga
    timers.push(T(() => {
      setPhase(4)
      setMorphing(true)
    }, 3600))

    // Logo paydo bo'ladi
    timers.push(T(() => {
      setShowLogo(true)
    }, 4100))

    // Phase 5 — content
    timers.push(T(() => {
      setPhase(5)
      setShowContent(true)
    }, 4800))

    FEATURES.forEach((_, idx) => {
      timers.push(T(() => {
        setVisibleFeatures(prev => [...prev, idx])
      }, 5000 + idx * 130))
    })

    timers.push(T(() => setShowBtn(true), 5000 + FEATURES.length * 130 + 200))

    return () => timers.forEach(t => clearTimeout(t))
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col"
      style={{ background: '#000' }}>

      <style>{`
        @keyframes fistIn {
          0% { transform: scale(0.3) translateY(60px); opacity: 0; }
          60% { transform: scale(1.1) translateY(-8px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes handOpen {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.08) rotate(-8deg); }
          60% { transform: scale(1.12) rotate(5deg); }
          100% { transform: scale(1.05) rotate(0deg); }
        }
        @keyframes textReveal {
          0% { opacity:0; letter-spacing: 0.6em; transform: translateY(6px); }
          100% { opacity:1; letter-spacing: 0.22em; transform: translateY(0); }
        }
        @keyframes morphOut {
          0% { transform: scale(1.05); opacity: 1; filter: blur(0px); }
          40% { transform: scale(1.3); opacity: 0.6; filter: blur(2px); }
          100% { transform: scale(0.2); opacity: 0; filter: blur(8px); }
        }
        @keyframes logoIn {
          0% { transform: scale(0.1); opacity: 0; filter: brightness(3) blur(4px); }
          50% { transform: scale(1.18); opacity: 1; filter: brightness(1.5) blur(0px); }
          75% { transform: scale(0.93); }
          100% { transform: scale(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 30px rgba(59,130,246,0.5), 0 0 60px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 50px rgba(59,130,246,0.8), 0 0 100px rgba(124,58,237,0.5); }
        }
        @keyframes shimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(14px); }
          to { opacity:1; transform: translateY(0); }
        }
        @keyframes shockwave {
          0% { transform: translate(-50%,-50%) scale(0); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(5); opacity: 0; }
        }
        @keyframes starPop {
          0% { transform: translate(-50%,-50%) scale(0); opacity:1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity:0; }
        }
        @keyframes btnShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-title {
          background: linear-gradient(90deg, #93c5fd, #fff, #c4b5fd, #fff, #93c5fd);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2s linear infinite;
        }
      `}</style>

      {/* Background glow — faqat phase 5+ da */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(29,78,216,0.13) 0%, transparent 70%)',
          opacity: phase >= 5 ? 1 : 0,
          transition: 'opacity 1.5s ease',
        }} />

      {/* ── HAND + TEXT (phase 1-3) ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">

        {/* Hand emoji */}
        <div style={{
          fontSize: '110px',
          lineHeight: 1,
          opacity: phase >= 1 && !morphing ? 1 : 0,
          animation: phase === 1
            ? 'fistIn 0.8s cubic-bezier(0.34,1.5,0.64,1) forwards'
            : phase === 2
            ? 'handOpen 0.6s cubic-bezier(0.34,1.3,0.64,1) forwards'
            : morphing
            ? 'morphOut 0.6s ease-in forwards'
            : 'none',
          filter: phase >= 2 ? 'drop-shadow(0 0 20px rgba(255,200,100,0.3))' : 'none',
          transition: 'filter 0.5s ease, opacity 0.3s ease',
          userSelect: 'none',
        }}>
          {handEmoji}
        </div>

        {/* KAFTIMDA text on palm */}
        <div style={{
          marginTop: '16px',
          opacity: showText && !morphing ? 1 : 0,
          animation: showText && !morphing ? 'textReveal 0.7s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          pointerEvents: 'none',
        }}>
          <p style={{
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.4)',
          }}>KAFTIMDA</p>
        </div>
      </div>

      {/* ── SHOCKWAVE on morph ── */}
      {morphing && (
        <div className="absolute pointer-events-none z-30"
          style={{ left: '50%', top: '45%' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: 100, height: 100,
              border: `${i === 0 ? 2 : 1}px solid ${i === 1 ? 'rgba(124,58,237,0.6)' : 'rgba(59,130,246,0.7)'}`,
              borderRadius: '50%',
              animation: `shockwave ${0.7 + i * 0.1}s ${i * 0.1}s ease-out forwards`,
            }} />
          ))}
          {/* Star sparks */}
          {[...Array(10)].map((_, i) => {
            const angle = (i / 10) * 360
            const d = 60 + i * 8
            return (
              <div key={`s${i}`} style={{
                position: 'absolute',
                width: 5, height: 5,
                left: `calc(50% + ${Math.cos(angle * Math.PI / 180) * d}px)`,
                top: `calc(50% + ${Math.sin(angle * Math.PI / 180) * d}px)`,
                background: i % 2 === 0 ? '#60a5fa' : '#a78bfa',
                borderRadius: '50%',
                animation: 'starPop 0.6s ease-out forwards',
                boxShadow: `0 0 8px ${i % 2 === 0 ? '#60a5fa' : '#a78bfa'}`,
              }} />
            )
          })}
        </div>
      )}

      {/* ── LOGO (phase 4+) ── */}
      {showLogo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
          style={{ paddingBottom: showContent ? '0' : '0' }}>
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
                animation: 'logoIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards, glowPulse 3s 0.8s ease-in-out infinite',
              }}>
              <span className="text-5xl font-black text-white"
                style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>₿</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center"
              style={{
                opacity: phase >= 5 ? 1 : 0,
                transform: phase >= 5 ? 'scale(1)' : 'scale(0)',
                transition: 'all 0.5s cubic-bezier(0.34,1.7,0.64,1) 0.2s',
                boxShadow: '0 0 12px rgba(74,222,128,0.7)',
              }}>
              <span className="text-sm font-bold" style={{ color: '#000' }}>✓</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT (phase 5) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-20"
        style={{
          opacity: showContent ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: showContent ? 'auto' : 'none',
        }}>

        {/* Logo placeholder space */}
        <div style={{ height: 96, marginBottom: 20 }} />

        {/* by KAFTIMDA */}
        <p style={{
          fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'rgba(147,197,253,0.7)', fontWeight: 700,
          animation: showContent ? 'fadeUp 0.6s ease forwards' : 'none',
        }}>by KAFTIMDA</p>

        {/* PulBek */}
        <h1 className="text-4xl font-black tracking-tight mb-1 mt-2">
          <span className="shimmer-title">PulBek</span>
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '13px', color: 'rgba(156,163,175,0.9)',
          textAlign: 'center', marginBottom: '22px',
          animation: showContent ? 'fadeUp 0.7s 0.1s ease both' : 'none',
        }}>
          Shaxsiy moliyangizni oson boshqaring
        </p>

        {/* Features */}
        <div className="w-full grid grid-cols-2 gap-2 mb-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
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
