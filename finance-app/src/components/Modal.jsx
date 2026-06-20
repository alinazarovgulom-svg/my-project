import { X, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Modal({ open, onClose, title, children, loading }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const t = setTimeout(() => { document.body.style.overflow = '' }, 300)
      return () => clearTimeout(t)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open && !visible) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center"
      onClick={onClose}
      style={{
        transition: 'opacity 0.28s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[480px] rounded-t-3xl flex flex-col"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          maxHeight: '82dvh',
          marginBottom: 0,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.34,1.1,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-input)' }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <h2 className="text-[16px] font-black" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-card2)', color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 flex flex-col gap-3" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 16px))' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div style={{
                width: 36, height: 36,
                border: '3px solid var(--border-input)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Yuklanmoqda...</p>
            </div>
          ) : children}
        </div>
      </div>
    </div>
  )
}
