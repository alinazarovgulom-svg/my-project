import { useApp } from '../store/AppContext'
import { RotateCcw, Trash2, ArrowLeft } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { uz } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { fmtCur } from '../utils/format'

const fmt = (n, cur) => fmtCur(n, cur)

export default function Trash() {
  const { trash, restoreTransaction, permanentDelete } = useApp()
  const nav = useNavigate()

  const sorted = [...trash].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))

  const daysLeft = (deletedAt) => {
    const exp = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000
    const days = Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-2 rounded-xl bg-dark-700 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Arxiv</h1>
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <p className="text-5xl">🗑️</p>
          <p className="text-gray-400 text-sm">Arxiv bo'sh</p>
          <p className="text-gray-600 text-xs text-center">O'chirilgan tranzaksiyalar bu yerda 30 kun saqlanadi</p>
        </div>
      ) : (
        <div className="flex-1 px-4 flex flex-col gap-2">
          <p className="text-gray-500 text-xs px-1 mb-1">O'chirilgan tranzaksiyalar 30 kun ichida tiklanishi mumkin</p>
          {sorted.map(tx => {
            const days = daysLeft(tx.deletedAt)
            return (
              <div key={tx.id} className="card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 opacity-50 ${tx.type === 'income' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {tx.emoji || (tx.type === 'income' ? '💰' : '💸')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm font-medium truncate">{tx.category}</p>
                  <p className="text-gray-500 text-xs">{tx.note ? `${tx.note} · ` : ''}{format(new Date(tx.date), 'dd.MM.yyyy')}</p>
                  <p className="text-orange-400/70 text-xs">{days} kun qoldi</p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 opacity-60 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, tx.currency || 'UZS')} {tx.currency || 'UZS'}
                </p>
                <div className="flex flex-col gap-1">
                  <button onClick={() => restoreTransaction(tx.id)} className="p-2 text-blue-400 active:opacity-70">
                    <RotateCcw size={16} />
                  </button>
                  <button onClick={() => permanentDelete(tx.id)} className="p-2 text-gray-600 active:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
