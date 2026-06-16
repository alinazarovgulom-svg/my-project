import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[480px] bg-dark-800 rounded-t-3xl flex flex-col"
        style={{ maxHeight: '75dvh', marginBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-dark-600 text-gray-400 active:opacity-70">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 flex flex-col gap-3">
          {children}
        </div>
      </div>
    </div>
  )
}
