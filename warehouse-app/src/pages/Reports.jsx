import { useState, useMemo } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { fmtNum, fmtDate } from '../utils/format'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, FileText, FileSpreadsheet, Users, Package } from 'lucide-react'
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns'

const PERIODS = ['thisMonth', 'lastMonth', 'last3', 'thisYear', 'allTime']

export default function Reports() {
  const { products, movements, team, teamMovements, getInventory } = useApp()
  const { t } = useLang()
  const [period, setPeriod] = useState('thisMonth')
  const [teamMode, setTeamMode] = useState(false)

  const isTeam = teamMode && !!team
  const activeMovements = isTeam ? teamMovements : movements

  const getRange = () => {
    const now = new Date()
    if (period === 'thisMonth') return { start: startOfMonth(now), end: endOfMonth(now) }
    if (period === 'lastMonth') { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) } }
    if (period === 'last3') return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    if (period === 'thisYear') return { start: startOfYear(now), end: endOfYear(now) }
    return null
  }

  const range = getRange()

  const filtered = useMemo(() => {
    if (!range) return activeMovements
    return activeMovements.filter(mv => {
      if (!mv.date) return false
      try {
        return isWithinInterval(parseISO(mv.date), range)
      } catch { return false }
    })
  }, [activeMovements, period, range])

  const totalIn = filtered.filter(m => m.type === 'kirim').reduce((s, m) => s + m.total, 0)
  const totalOut = filtered.filter(m => m.type === 'chiqim').reduce((s, m) => s + m.total, 0)
  const grossProfit = totalOut - totalIn

  const inventory = getInventory(activeMovements)
  const totalStockValue = inventory.reduce((s, i) => {
    const prod = products.find(p => p.id === i.productId)
    return s + i.quantity * (prod?.purchasePrice || 0)
  }, 0)

  // By product summary
  const byProduct = useMemo(() => {
    const map = {}
    filtered.forEach(mv => {
      if (!map[mv.productId]) map[mv.productId] = { name: mv.productName, inQty: 0, outQty: 0, inTotal: 0, outTotal: 0, unit: mv.unit }
      if (mv.type === 'kirim') { map[mv.productId].inQty += mv.quantity; map[mv.productId].inTotal += mv.total }
      else { map[mv.productId].outQty += mv.quantity; map[mv.productId].outTotal += mv.total }
    })
    return Object.values(map).sort((a, b) => (b.inTotal + b.outTotal) - (a.inTotal + a.outTotal))
  }, [filtered])

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('OMBORCHI', 14, 16)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(130, 130, 130)
    doc.text('by KAFTIMDA', 14, 23)
    doc.setTextColor(0, 0, 0)

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Hisobot', 14, 36)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Davr: ${t(period)}`, 14, 44)
    doc.text(`Jami kirim: ${fmtNum(totalIn)} so'm`, 14, 52)
    doc.text(`Jami chiqim: ${fmtNum(totalOut)} so'm`, 14, 60)
    doc.text(`Foyda: ${fmtNum(grossProfit)} so'm`, 14, 68)

    autoTable(doc, {
      startY: 76,
      head: [['Mahsulot', "Kirim (dona)", "Kirim (so'm)", "Chiqim (dona)", "Chiqim (so'm)", "Foyda"]],
      body: byProduct.map(p => [
        p.name, fmtNum(p.inQty), fmtNum(p.inTotal), fmtNum(p.outQty), fmtNum(p.outTotal), fmtNum(p.outTotal - p.inTotal)
      ]),
      styles: { fontSize: 8 }
    })
    doc.save(`omborbek-hisobot-${period}.pdf`)
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const data = [
      ['OMBORCHI'],
      ['by KAFTIMDA'],
      [],
      ['Mahsulot', 'Kirim dona', "Kirim so'm", 'Chiqim dona', "Chiqim so'm", 'Foyda'],
      ...byProduct.map(p => [p.name, p.inQty, p.inTotal, p.outQty, p.outTotal, p.outTotal - p.inTotal]),
      [],
      ['Jami kirim', '', totalIn, '', '', ''],
      ['Jami chiqim', '', '', '', totalOut, ''],
      ['Foyda', '', '', '', '', grossProfit],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Hisobot')
    XLSX.writeFile(wb, `omborbek-hisobot-${period}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white text-xl font-bold">{t('reportTitle')}</h1>
        </div>

        {team && (
          <div className="flex bg-slate-800/60 rounded-xl p-1 mb-3">
            <button onClick={() => setTeamMode(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              Shaxsiy
            </button>
            <button onClick={() => setTeamMode(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              <Users size={12} /> {team.name}
            </button>
          </div>
        )}

        {/* Period selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${period === p ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {t(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-primary-400" />
              <span className="text-slate-400 text-xs">{t('totalIn')}</span>
            </div>
            <p className="text-primary-400 text-xl font-bold">{fmtNum(totalIn)}</p>
            <p className="text-slate-500 text-xs">so'm</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-400" />
              <span className="text-slate-400 text-xs">{t('totalOut')}</span>
            </div>
            <p className="text-red-400 text-xl font-bold">{fmtNum(totalOut)}</p>
            <p className="text-slate-500 text-xs">so'm</p>
          </div>

          <div className={`border rounded-2xl p-4 col-span-1 ${grossProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className={grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <span className="text-slate-400 text-xs">{t('profit')}</span>
            </div>
            <p className={`text-xl font-bold ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtNum(Math.abs(grossProfit))}</p>
            <p className="text-slate-500 text-xs">so'm {grossProfit < 0 ? '(zarar)' : ''}</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-blue-400" />
              <span className="text-slate-400 text-xs">Ombor qiymati</span>
            </div>
            <p className="text-blue-400 text-xl font-bold">{fmtNum(totalStockValue)}</p>
            <p className="text-slate-500 text-xs">so'm</p>
          </div>
        </div>

        {/* Export buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={exportPDF}
            className="flex items-center justify-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl py-3 text-slate-300 text-sm font-medium active:scale-95 transition-all">
            <FileText size={16} className="text-red-400" />
            {t('downloadPDF')}
          </button>
          <button onClick={exportExcel}
            className="flex items-center justify-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl py-3 text-slate-300 text-sm font-medium active:scale-95 transition-all">
            <FileSpreadsheet size={16} className="text-primary-400" />
            {t('downloadExcel')}
          </button>
        </div>

        {/* By product table */}
        {byProduct.length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-3">{t('byProduct')}</h2>
            <div className="space-y-2">
              {byProduct.map((p, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium text-sm">{p.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${p.outTotal - p.inTotal >= 0 ? 'bg-primary-500/20 text-primary-400' : 'bg-red-500/20 text-red-400'}`}>
                      {fmtNum(Math.abs(p.outTotal - p.inTotal))} so'm
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span className="text-primary-400">↑ {fmtNum(p.inQty)} {p.unit} ({fmtNum(p.inTotal)} so'm)</span>
                    <span className="text-red-400">↓ {fmtNum(p.outQty)} {p.unit} ({fmtNum(p.outTotal)} so'm)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {byProduct.length === 0 && (
          <div className="flex flex-col items-center py-12">
            <BarChart3 size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{t('noMovements')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
