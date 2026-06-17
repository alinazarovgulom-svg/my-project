import { useRef, useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'

export default function SwipeableRow({ children, onDelete, onEdit }) {
  const startX = useRef(null)
  const [offset, setOffset] = useState(0)
  const [active, setActive] = useState(false)
  const THRESHOLD = 60

  const onStart = (clientX) => { startX.current = clientX; setActive(false) }
  const onMove = (clientX) => {
    if (startX.current === null) return
    const dx = startX.current - clientX
    if (dx > 0) setOffset(Math.min(dx, 120))
  }
  const onEnd = () => {
    if (offset >= THRESHOLD) { setOffset(120); setActive(true) }
    else { setOffset(0); setActive(false) }
    startX.current = null
  }
  const reset = () => { setOffset(0); setActive(false) }

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 px-3 bg-slate-800">
        {onEdit && (
          <button onClick={() => { onEdit(); reset() }}
            className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Pencil size={16} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => { onDelete(); reset() }}
            className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div
        style={{ transform: `translateX(-${offset}px)`, transition: active ? 'none' : 'transform 0.25s cubic-bezier(.4,0,.2,1)' }}
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
      >
        {children}
      </div>
    </div>
  )
}
