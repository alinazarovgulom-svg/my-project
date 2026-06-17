import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum } from '../utils/format'
import { Boxes, Search, Users, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

export default function Inventory() {
  const { products, movements, team, teamMovements, getInventory } = useApp()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [teamMode, setTeamMode] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [filterLow, setFilterLow] = useState(false)

  const isTeam = teamMode && !!team
  const activeMovements = isTeam ? teamMovements : movements
  const inventory = getInventory(activeMovements)

  const enriched = inventory.map(item => {
    const prod = products.find(p => p.id === item.productId)
    const avgCost = item.quantity > 0 ? item.totalCost / (item.totalCost > 0 ? (activeMovements.filter(m => m.productId === item.productId && m.type === 'kirim').reduce((s, m) => s + m.quantity, 0)) : 1) : 0
    const inQty = activeMovements.filter(m => m.productId === item.productId && m.type === 'kirim').reduce((s, m) => s + m.quantity, 0)
    const outQty = activeMovements.filter(m => m.productId === item.productId && m.type === 'chiqim').reduce((s, m) => s + m.quantity, 0)
    const isLow = prod?.minStock && item.quantity < prod.minStock
    const stockValue = item.quantity * (prod?.purchasePrice || 0)
    return { ...item, prod, inQty, outQty, isLow, stockValue, avgCostCalc: prod?.purchasePrice || 0 }
  })

  const totalValue = enriched.reduce((s, i) => s + i.stockValue, 0)

  let filtered = enriched
    .filter(i => !search || i.productName?.toLowerCase().includes(search.toLowerCase()) || i.prod?.category?.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !filterLow || i.isLow)
    .sort((a, b) => b.stockValue - a.stockValue)

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">{t('inventory')}</h1>
          <div className="bg-primary-500/20 px-3 py-1.5 rounded-xl">
            <span className="text-primary-400 text-sm font-semibold">{fmtNum(totalValue)} so'm</span>
          </div>
        </div>

        {team && (
          <div className="flex bg-slate-800/60 rounded-xl p-1 mb-2">
            <button onClick={() => setTeamMode(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              Shaxsiy
            </button>
            <button onClick={() => setTeamMode(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              <Users size={12} /> {team.name}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
        </div>

        <button onClick={() => setFilterLow(f => !f)}
          className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${filterLow ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-slate-800/60 border-slate-700/40 text-slate-400'}`}>
          <AlertTriangle size={13} />
          {t('lowStock')} ({enriched.filter(i => i.isLow).length})
        </button>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Boxes size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{search || filterLow ? t('notFound') : t('noStock')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <div key={item.productId}>
                <button
                  onClick={() => setExpanded(expanded === item.productId ? null : item.productId)}
                  className={`w-full bg-slate-800/60 rounded-xl px-4 py-3.5 border text-left transition-all ${item.isLow ? 'border-amber-500/30' : 'border-slate-700/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{item.productName}</p>
                        {item.isLow && <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{item.prod?.category || ''}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`font-bold text-base ${item.quantity <= 0 ? 'text-red-400' : item.isLow ? 'text-amber-400' : 'text-white'}`}>
                        {fmtNum(item.quantity)} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                      </p>
                      <p className="text-slate-400 text-xs">{fmtNum(item.stockValue)} so'm</p>
                    </div>
                    <div className="ml-2 text-slate-500">
                      {expanded === item.productId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </button>

                {expanded === item.productId && (
                  <div className="bg-slate-800/30 rounded-xl mx-1 mb-1 px-4 py-3 border border-slate-700/20 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp size={13} className="text-primary-400" />
                          <span className="text-slate-400 text-xs">Jami kirim</span>
                        </div>
                        <p className="text-primary-400 font-semibold text-sm">{fmtNum(item.inQty)} {item.unit}</p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingDown size={13} className="text-red-400" />
                          <span className="text-slate-400 text-xs">Jami chiqim</span>
                        </div>
                        <p className="text-red-400 font-semibold text-sm">{fmtNum(item.outQty)} {item.unit}</p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-1">{t('purchasePrice')}</p>
                        <p className="text-white font-semibold text-sm">{fmtNum(item.avgCostCalc)} so'm</p>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-1">{t('salePrice')}</p>
                        <p className="text-white font-semibold text-sm">{fmtNum(item.prod?.salePrice || 0)} so'm</p>
                      </div>
                    </div>
                    {item.prod?.minStock > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{t('minStock')}</span>
                        <span className={item.isLow ? 'text-amber-400' : 'text-slate-400'}>{item.prod.minStock} {item.unit}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
