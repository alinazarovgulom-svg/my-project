import { useRef, useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'

const THRESHOLD = 72

export default function SwipeableRow({ onDelete, onEdit, children }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(null)
  const diffX = useRef(0)
  const triggered = useRef(false)

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    diffX.current = 0
    triggered.current = false
    setDragging(true)
  }

  const onTouchMove = (e) => {
    if (startX.current === null) return
    const diff = e.touches[0].clientX - startX.current
    diffX.current = diff
    setOffset(Math.max(-90, Math.min(90, diff)))
  }

  const onTouchEnd = () => {
    setDragging(false)
    const d = diffX.current

    if (d < -THRESHOLD && onDelete && !triggered.current) {
      triggered.current = true
      setOffset(0)
      setTimeout(() => onDelete(), 50)
    } else if (d > THRESHOLD && onEdit && !triggered.current) {
      triggered.current = true
      setOffset(0)
      setTimeout(() => onEdit(), 50)
    } else {
      setOffset(0)
    }

    startX.current = null
    diffX.current = 0
  }

  const editOpacity = offset > 0 ? Math.min(1, offset / 60) : 0
  const deleteOpacity = offset < 0 ? Math.min(1, Math.abs(offset) / 60) : 0

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Edit bg */}
      <div className="absolute inset-0 flex items-center justify-start pl-5 rounded-2xl"
        style={{ background: 'var(--swipe-edit-bg, rgba(59,130,246,0.15))', opacity: editOpacity }}>
        <div className="flex items-center gap-1.5">
          <Pencil size={17} style={{ color: 'var(--swipe-edit-color, #60a5fa)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--swipe-edit-color, #60a5fa)' }}>Tahrirlash</span>
        </div>
      </div>

      {/* Delete bg */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl"
        style={{ background: 'var(--swipe-delete-bg, rgba(239,68,68,0.15))', opacity: deleteOpacity }}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--swipe-delete-color, #f87171)' }}>O'chirish</span>
          <Trash2 size={17} style={{ color: 'var(--swipe-delete-color, #f87171)' }} />
        </div>
      </div>

      {/* Content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
          position: 'relative',
          zIndex: 1,
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
