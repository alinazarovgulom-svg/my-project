import { useState } from 'react'

const FEATURES = [
  { icon: '💰', text: 'Kirim va chiqimlarni valyuta bo\'yicha yuritish' },
  { icon: '💳', text: 'Qarzlarni kuzatish va eslatmalar' },
  { icon: '💱', text: 'Valyuta konvertatsiyasi va kurs tarixi' },
  { icon: '📊', text: 'Hisobotlar va kunlik qoldiq' },
  { icon: '👨‍👩‍👧', text: 'Oilaviy rejim — birgalikda moliya' },
  { icon: '🔐', text: 'PIN qulfi va xavfsizlik' },
]

export default function Onboarding({ onDone }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-900 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* Logo */}
        <div className="relative mb-5">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', boxShadow: '0 12px 40px rgba(59,130,246,0.4)' }}>
            <span className="text-5xl font-black text-white">₿</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold text-dark-900">✓</span>
          </div>
        </div>

        <div className="text-center mb-2">
          <span className="text-xs font-bold tracking-[0.25em] text-blue-400/70 uppercase">by KAFTIMDA</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">PulBek</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Shaxsiy moliyangizni oson va qulay boshqaring</p>

        {/* Features grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-dark-700/60 border border-white/5 rounded-2xl px-3 py-2.5">
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <p className="text-gray-300 text-xs leading-snug">{f.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onDone}
          className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}
        >
          Boshlash →
        </button>
      </div>
    </div>
  )
}
