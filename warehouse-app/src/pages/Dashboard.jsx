import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum, fmtDate } from '../utils/format'
import { Package, PackagePlus, PackageMinus, Boxes, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Users } from 'lucide-react'

export default function Dashboard() {
  const { user, products, movements, team, teamMovements, syncing, getInventory } = useApp()
  const { t } = useLang()
  const navigate = useNavigate()

  const isTeamMode = !!team
  const activeMovements = isTeamMode ? teamMovements : movements
  const activeProducts = products

  const today = new Date().toISOString().slice(0, 10)
  const todayMvs = activeMovements.filter(m => m.date?.startsWith(today))
  const todayIn = todayMvs.filter(m => m.type === 'kirim').reduce((s, m) => s + m.total, 0)
  const todayOut = todayMvs.filter(m => m.type === 'chiqim').reduce((s, m) => s + m.total, 0)

  const inventory = getInventory(activeMovements)
  const totalValue = inventory.reduce((s, i) => {
    const prod = products.find(p => p.id === i.productId)
    return s + (i.quantity * (prod?.purchasePrice || 0))
  }, 0)

  const lowStockItems = inventory.filter(i => {
    const prod = products.find(p => p.id === i.productId)
    return prod?.minStock && i.quantity < prod.minStock && i.quantity >= 0
  })

  const recent = [...activeMovements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950 px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('hello')}</p>
            <h1 className="text-slate-900 dark:text-white text-xl font-bold">{user?.fullName || user?.username}</h1>
          </div>
          <div className="flex items-center gap-2">
            {syncing && <RefreshCw size={16} className="text-primary-400 animate-spin" />}
            {isTeamMode && (
              <div className="flex items-center gap-1 bg-primary-500/20 px-2.5 py-1 rounded-full">
                <Users size={12} className="text-primary-400" />
                <span className="text-primary-400 text-xs font-medium">{team?.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Package size={16} className="text-blue-400" />
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">{t('totalProducts')}</span>
            </div>
            <p className="text-slate-900 dark:text-white text-2xl font-bold">{activeProducts.length}</p>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={16} className="text-amber-400" />
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">{t('lowStock')}</span>
            </div>
            <p className="text-amber-400 text-2xl font-bold">{lowStockItems.length}</p>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-primary-400" />
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">{t('todayIn')}</span>
            </div>
            <p className="text-primary-400 text-xl font-bold">{fmtNum(todayIn)}</p>
            <p className="text-slate-600 dark:text-slate-500 text-xs">so'm</p>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">{t('todayOut')}</span>
            </div>
            <p className="text-red-400 text-xl font-bold">{fmtNum(todayOut)}</p>
            <p className="text-slate-600 dark:text-slate-500 text-xs">so'm</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary-600/20 to-emerald-600/20 rounded-2xl p-5 border border-primary-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Boxes size={18} className="text-primary-400" />
            <span className="text-slate-500 dark:text-slate-400 text-sm">{t('totalValue')}</span>
          </div>
          <p className="text-slate-900 dark:text-white text-3xl font-bold">{fmtNum(totalValue)}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">so'm</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate('/stock-in')}
            className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all">
            <PackagePlus size={24} className="text-primary-400" />
            <span className="text-primary-400 text-xs font-medium">{t('stockIn')}</span>
          </button>
          <button onClick={() => navigate('/stock-out')}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all">
            <PackageMinus size={24} className="text-red-400" />
            <span className="text-red-400 text-xs font-medium">{t('stockOut')}</span>
          </button>
          <button onClick={() => navigate('/products')}
            className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all">
            <Package size={24} className="text-blue-400" />
            <span className="text-blue-400 text-xs font-medium">{t('products')}</span>
          </button>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">{t('lowStock')}</span>
            </div>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map(item => {
                const prod = products.find(p => p.id === item.productId)
                return (
                  <div key={item.productId} className="flex justify-between items-center">
                    <span className="text-slate-900 dark:text-white text-sm">{prod?.name || item.productName}</span>
                    <span className="text-amber-400 text-sm font-medium">{fmtNum(item.quantity)} {prod?.unit || item.unit}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900 dark:text-white font-semibold">{t('recentMovements')}</h2>
            <button onClick={() => navigate('/inventory')} className="text-primary-400 text-sm">{t('all')} →</button>
          </div>

          {recent.length === 0 ? (
            <div className="bg-slate-100 dark:bg-slate-800/40 rounded-2xl p-8 text-center">
              <Boxes size={32} className="text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">{t('noMovements')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(mv => (
                <div key={mv.id} className="bg-slate-100 dark:bg-slate-800/60 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-200 dark:border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mv.type === 'kirim' ? 'bg-primary-500/15' : 'bg-red-500/15'}`}>
                      {mv.type === 'kirim' ? <PackagePlus size={18} className="text-primary-400" /> : <PackageMinus size={18} className="text-red-400" />}
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white text-sm font-medium">{mv.productName}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{fmtDate(mv.date)} · {mv.quantity} {mv.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${mv.type === 'kirim' ? 'text-primary-400' : 'text-red-400'}`}>
                      {mv.type === 'kirim' ? '+' : '-'}{fmtNum(mv.total)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-500 text-xs">so'm</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
