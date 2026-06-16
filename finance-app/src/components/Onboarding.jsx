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
  const [step, setStep] = useState(0)
  const [typedTitle, setTypedTitle] = useState('')
  const [visibleFeatures, setVisibleFeatures] = useState([])
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    // Step 0 → 1: logo fades in (600ms)
    const t1 = setTimeout(() => setStep(1), 600)
    // Step 1 → 2: tagline appears (1200ms)
    const t2 = setTimeout(() => setStep(2), 1200)
    // Step 2: typewriter for title (1500ms start)
    let charIndex = 0
    const typeInterval = setInterval(() => {
      charIndex++
      setTypedTitle(TITLE.slice(0, charIndex))
      if (charIndex >= TITLE.length) clearInterval(typeInterval)
    }, 120)
    const t3 = setTimeout(() => {}, 1500)
    // Step 3: features appear one by one (2800ms+)
    FEATURES.forEach((_, i) => {
      setTimeout(() => {
        setVisibleFeatures(prev => [...prev, i])
      }, 2800 + i * 200)
    })
    // Show button after all features
    const t4 = setTimeout(() => setShowBtn(true), 2800 + FEATURES.length * 200 + 200)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      clearInterval(typeInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-900 overflow-hidden">
      {/* Animated background */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(29,78,216,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.15) 0%, transparent 60%)',
          opacity: step >= 1 ? 1 : 0
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i}
          className="absolute rounded-full"
          style={{
            width: `${[8,12,6,10,8,14][i]}px`,
            height: `${[8,12,6,10,8,14][i]}px`,
            background: i % 2 === 0 ? 'rgba(59,130,246,0.3)' : 'rgba(124,58,237,0.3)',
            left: `${[15,75,40,85,25,60][i]}%`,
            top: `${[20,15,70,50,80,35][i]}%`,
            opacity: step >= 1 ? 1 : 0,
            transition: `opacity 1s ease ${i * 0.2}s`,
            animation: `float${i % 3} ${3 + i * 0.5}s ease-in-out infinite alternate`
          }}
        />
      ))}

      <style>{`
        @keyframes float0 { from { transform: translateY(0px); } to { transform: translateY(-12px); } }
        @keyframes float1 { from { transform: translateY(0px) translateX(0px); } to { transform: translateY(-8px) translateX(6px); } }
        @keyframes float2 { from { transform: translateY(0px); } to { transform: translateY(-16px); } }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">

        {/* Logo */}
        <div
          className="relative mb-4"
          style={{
            opacity: step >= 0 ? 1 : 0,
            transform: step >= 1 ? 'scale(1) translateY(0)' : 'scale(0.4) translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
              boxShadow: step >= 1 ? '0 0 40px rgba(59,130,246,0.5), 0 12px 40px rgba(59,130,246,0.3)' : 'none',
              transition: 'box-shadow 1s ease 0.5s'
            }}>
            <span className="text-5xl font-black text-white">₿</span>
          </div>
          <div
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center shadow-lg"
            style={{
              opacity: step >= 1 ? 1 : 0,
              transform: step >= 1 ? 'scale(1)' : 'scale(0)',
              transition: 'all 0.4s ease 0.8s'
            }}
          >
            <span className="text-sm font-bold text-dark-900">✓</span>
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.6s ease 0.3s'
          }}
        >
          <span className="text-xs font-bold tracking-[0.25em] text-blue-400/70 uppercase">by KAFTIMDA</span>
        </div>

        {/* Typewriter title */}
        <h1 className="text-4xl font-black text-white tracking-tight mb-1 mt-1 min-h-[48px]">
          {typedTitle}
          <span
            className="inline-block w-0.5 h-8 bg-blue-400 ml-0.5 align-middle"
            style={{
              opacity: typedTitle.length < TITLE.length ? 1 : 0,
              transition: 'opacity 0.1s'
            }}
          />
        </h1>

        {/* Tagline */}
        <p
          className="text-gray-400 text-sm text-center mb-7"
          style={{
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.6s ease'
          }}
        >
          Shaxsiy moliyangizni oson boshqaring
        </p>

        {/* Features */}
        <div className="w-full grid grid-cols-2 gap-2 mb-7">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 bg-dark-700/60 border border-white/5 rounded-2xl px-3 py-2.5"
              style={{
                opacity: visibleFeatures.includes(i) ? 1 : 0,
                transform: visibleFeatures.includes(i) ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.3, 0.64, 1)'
              }}
            >
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <p className="text-gray-300 text-xs leading-snug">{f.text}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={onDone}
          className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
            boxShadow: showBtn ? '0 4px 24px rgba(59,130,246,0.4)' : 'none',
            opacity: showBtn ? 1 : 0,
            transform: showBtn ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.3, 0.64, 1)',
            pointerEvents: showBtn ? 'auto' : 'none'
          }}
        >
          Boshlash →
        </button>
      </div>
    </div>
  )
}
