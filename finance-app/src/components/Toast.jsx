import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', icon: '#22c55e' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  icon: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: '#f59e0b' },
  info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', icon: '#818cf8' },
}

function ToastItem({ id, message, type = 'success', onRemove }) {
  const [visible, setVisible] = useState(false)
  const Icon = ICONS[type]
  const color = COLORS[type]

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(id), 300)
    }, 3000)
    return () => clearTimeout(t)
  }, [id, onRemove])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 16,
        background: color.bg,
        border: `1px solid ${color.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(0.34,1.4,0.64,1), opacity 0.28s ease',
        minWidth: 220,
        maxWidth: 340,
        pointerEvents: 'auto',
      }}
    >
      <Icon size={17} style={{ color: color.icon, flexShrink: 0 }} strokeWidth={2.5} />
      <span style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.3 }}>
        {message}
      </span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(id), 300) }}
        style={{ color: '#4b5563', padding: 2, flexShrink: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 440,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: '0 16px',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  )
}
