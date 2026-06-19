import { useRef, useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'

const THRESHOLD = 60

export default function SwipeableRow({ onDelete, onEdit, children }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(null)
  const currentX = useRef(0)

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    setDragging(true)
  }

  const onTouchMove = (e) => {
    if (startX.current === null) return
    const diff = e.touches[0].clientX - startX.current
    currentX.current = diff
    // Limit swipe range
    const clamped = Math.max(-90, Math.min(90, diff))
    setOffset(clamped)
  }

  const onTouchEnd = () => {
    setDragging(false)
    if (currentX.current < -THRESHOLD) {
      // Snap to show delete
      setOffset(-80)
    } else if (currentX.current > THRESHOLD) {
      // Snap to show edit
      setOffset(80)
    } else {
      setOffset(0)
    }
    startX.current = null
    currentX.current = 0
  }

  const handleDelete = () => {
    setOffset(0)
    onDelete?.()
  }

  const handleEdit = () => {
    setOffset(0)
    onEdit?.()
  }

  const reset = () => setOffset(0)

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete bg (right side) */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 rounded-2xl"
        style={{ background: 'rgba(239,68,68,0.15)', opacity: offset < 0 ? Math.min(1, Math.abs(offset) / 60) : 0 }}>
        <div className="flex items-center gap-1.5">
          <Trash2 size={18} className="text-red-400" />
          <span className="text-red-400 text-xs font-semibold">O'chirish</span>
        </div>
      </div>

      {/* Edit bg (left side) */}
      <div className="absolute inset-0 flex items-center justify-start pl-4 rounded-2xl"
        style={{ background: 'rgba(59,130,246,0.15)', opacity: offset > 0 ? Math.min(1, offset / 60) : 0 }}>
        <div className="flex items-center gap-1.5">
          <Pencil size={18} className="text-blue-400" />
          <span className="text-blue-400 text-xs font-semibold">Tahrirlash</span>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (offset !== 0) reset() }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          position: 'relative',
          zIndex: 1,
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>

      {/* Tap action zones when swiped */}
      {offset <= -60 && (
        <button onClick={handleDelete}
          className="absolute right-0 top-0 bottom-0 w-20 z-10"
          style={{ background: 'transparent' }} />
      )}
      {offset >= 60 && (
        <button onClick={handleEdit}
          className="absolute left-0 top-0 bottom-0 w-20 z-10"
          style={{ background: 'transparent' }} />
      )}
    </div>
  )
}
