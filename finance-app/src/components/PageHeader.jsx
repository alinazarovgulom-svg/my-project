export default function PageHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ color: 'var(--text-primary)' }}>
      <h1 className="text-[18px] font-black">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
