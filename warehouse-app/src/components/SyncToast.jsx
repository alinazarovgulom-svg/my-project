import { useEffect, useState } from 'react'
import { CheckCircle, RefreshCw } from 'lucide-react'

// phase: 'syncing' | 'done' | null
export default function SyncToast({ phase }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (phase === 'syncing' || phase === 'done') {
      setVisible(true)
    }
    if (phase === 'done') {
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
  }, [phase])

  if (!visible || !phase) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className={`mx-4 mt-3 flex items-center gap-2.5 backdrop-blur-md border rounded-2xl px-4 py-2.5 shadow-xl transition-all duration-300 ${
        phase === 'done'
          ? 'bg-primary-600/90 border-primary-500/60'
          : 'bg-slate-800/95 border-slate-600/60'
      }`}>
        {phase === 'syncing' ? (
          <>
            <RefreshCw size={15} className="text-primary-400 animate-spin flex-shrink-0" />
            <p className="text-white text-xs font-medium">Sinxronlanmoqda...</p>
          </>
        ) : (
          <>
            <CheckCircle size={15} className="text-white flex-shrink-0" />
            <p className="text-white text-xs font-medium">Sinxronlandi!</p>
          </>
        )}
      </div>
    </div>
  )
}
