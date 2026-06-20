export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon || '📭'}</div>
      <p className="font-bold text-[15px] mb-1" style={{ color: 'var(--text-primary)' }}>{title || "Ma'lumot yo'q"}</p>
      {subtitle && <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
    </div>
  )
}
