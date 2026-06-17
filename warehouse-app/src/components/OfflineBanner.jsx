import { WifiOff, Clock } from 'lucide-react'

export default function OfflineBanner({ pendingCount }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-4 mt-3 flex items-center gap-2.5 bg-slate-800/95 backdrop-blur-md border border-slate-600/60 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-auto">
        <WifiOff size={15} className="text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-white text-xs font-medium">Oflayn rejim</p>
          <p className="text-slate-400 text-[11px]">
            {pendingCount > 0
              ? `${pendingCount} ta o'zgarish — internet qaytganda yuboriladi`
              : 'Internet yo\'q — ma\'lumotlar lokal saqlanmoqda'}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="ml-auto flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
            <Clock size={11} className="text-amber-400" />
            <span className="text-amber-400 text-xs font-bold">{pendingCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}
