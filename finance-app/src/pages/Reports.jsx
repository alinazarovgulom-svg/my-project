import { useState } from 'react'
import { FileText, Table, TrendingUp, TrendingDown, PieChart, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fmtCur } from '../utils/format'
import { exportReportPDF } from '../utils/pdfExport'

const fmt = (n, cur) => fmtCur(n, cur || 'UZS')

export default function Reports() {
  const { transactions: personalTx, familyTransactions, family, debts, user } = useApp()
  const transactions = (family ? familyTransactions : personalTx).filter(t => t.category !== 'Valyuta ayirboshlash')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [showDailyBalance, setShowDailyBalance] = useState(false)

  const filtered = transactions.filter(t => {
    const d = new Date(t.date)
    return isWithinInterval(d, { start: new Date(startDate), end: new Date(endDate) })
  })

  const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
  const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }

  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense

  // Per-currency breakdown
  const currencyStats = CURRENCIES.map(cur => {
    const inc = filtered.filter(t => t.type === 'income' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    const exp = filtered.filter(t => t.type === 'expense' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    return { cur, inc, exp }
  }).filter(x => x.inc > 0 || x.exp > 0)

  // Daily cumulative balance — uses ALL transactions from beginning of time
  const dailyBalances = (() => {
    const allTx = (family ? familyTransactions : personalTx)
    const sorted = [...allTx].sort((a, b) => new Date(a.date) - new Date(b.date))
    const byDate = {}
    sorted.forEach(t => {
      const d = t.date.split('T')[0]
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(t)
    })
    const running = { UZS: 0, USD: 0, EUR: 0, RUB: 0 }
    const result = []
    Object.entries(byDate).forEach(([date, txs]) => {
      txs.forEach(t => {
        const cur = t.currency || 'UZS'
        running[cur] = (running[cur] || 0) + (t.type === 'income' ? t.amount : -t.amount)
      })
      if (date >= startDate && date <= endDate) {
        const dayIncome = {}
        const dayExpense = {}
        txs.filter(t => t.category !== 'Valyuta ayirboshlash').forEach(t => {
          const cur = t.currency || 'UZS'
          if (t.type === 'income') dayIncome[cur] = (dayIncome[cur] || 0) + t.amount
          else dayExpense[cur] = (dayExpense[cur] || 0) + t.amount
        })
        result.push({ date, balance: { ...running }, dayIncome, dayExpense })
      }
    })
    return result.reverse()
  })()

  // Group by category — per currency
  const byCategoryCur = filtered.reduce((acc, t) => {
    const cur = t.currency || 'UZS'
    if (!acc[t.category]) acc[t.category] = {}
    if (!acc[t.category][cur]) acc[t.category][cur] = { income: 0, expense: 0 }
    acc[t.category][cur][t.type] += t.amount
    return acc
  }, {})

  const exportPDF = async () => {
    setLoading(true)
    try {
      await exportReportPDF({
        filtered,
        startDate,
        endDate,
        userName: user?.name || '',
        currencyStats,
        filename: `hisobot_${startDate}_${endDate}.pdf`
      })
    } catch (e) {
      alert('PDF yaratishda xatolik: ' + e.message)
    }
    setLoading(false)
  }

  const exportExcel = async () => {
    setLoading(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // Transactions sheet
      const txData = [
        ['Sana', 'Tur', 'Kategoriya', 'Izoh', 'Summa (so\'m)'],
        ...filtered.map(t => [
          format(new Date(t.date), 'dd.MM.yyyy'),
          t.type === 'income' ? 'Kirim' : 'Chiqim',
          t.category,
          t.note || '',
          t.type === 'income' ? t.amount : -t.amount
        ]),
        [],
        ['', '', '', 'Jami kirim:', income],
        ['', '', '', 'Jami chiqim:', expense],
        ['', '', '', 'Sof foyda:', net],
      ]
      const ws1 = XLSX.utils.aoa_to_sheet(txData)
      XLSX.utils.book_append_sheet(wb, ws1, 'Operatsiyalar')

      // Debts sheet
      const debtData = [
        ['Shaxs', 'Tur', 'Sana', 'Jami summa', 'To\'langan', 'Qolgan'],
        ...debts.map(d => [
          d.person,
          d.direction === 'borrowed' ? 'Qarz oldim' : 'Qarz berdim',
          format(new Date(d.date), 'dd.MM.yyyy'),
          d.amount,
          d.amount - d.remaining,
          d.remaining
        ])
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(debtData)
      XLSX.utils.book_append_sheet(wb, ws2, 'Qarzlar')

      XLSX.writeFile(wb, `hisobot_${startDate}_${endDate}.xlsx`)
    } catch (e) {
      alert('Excel yaratishda xatolik: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4">
      <h1 className="text-xl font-bold text-white">Hisobotlar</h1>

      {/* Date Range */}
      <div className="card">
        <p className="text-gray-400 text-sm mb-3">Davr tanlang</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">Boshlanish</label>
            <input className="input-field text-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">Tugash</label>
            <input className="input-field text-sm" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {[
            ['Bu oy', () => { setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd')) }],
            ['Bu yil', () => { setStartDate(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')); setEndDate(format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd')) }],
            ['Barchasi', () => { setStartDate('2020-01-01'); setEndDate('2099-12-31') }],
          ].map(([l, fn]) => (
            <button key={l} onClick={fn} className="flex-1 py-1.5 rounded-lg bg-dark-600 text-gray-400 text-xs">
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <h2 className="text-white font-semibold mb-3">Davr xulosasi</h2>
        <div className="flex flex-col gap-2">
          {/* Income by currency */}
          <div className="bg-green-500/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-gray-300 text-sm font-medium">Jami kirim</span>
            </div>
            {currencyStats.filter(x => x.inc > 0).length > 0 ? (
              currencyStats.filter(x => x.inc > 0).map(({ cur, inc }) => (
                <div key={cur} className="flex items-center justify-between mt-1">
                  <span className="text-gray-400 text-xs">{FLAGS[cur]} {cur}</span>
                  <span className="text-green-400 font-bold text-sm">+{fmt(inc, cur)} {cur}</span>
                </div>
              ))
            ) : (
              <span className="text-green-400 font-bold">{fmt(income)} so'm</span>
            )}
          </div>

          {/* Expense by currency */}
          <div className="bg-red-500/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-400" />
              <span className="text-gray-300 text-sm font-medium">Jami chiqim</span>
            </div>
            {currencyStats.filter(x => x.exp > 0).length > 0 ? (
              currencyStats.filter(x => x.exp > 0).map(({ cur, exp }) => (
                <div key={cur} className="flex items-center justify-between mt-1">
                  <span className="text-gray-400 text-xs">{FLAGS[cur]} {cur}</span>
                  <span className="text-red-400 font-bold text-sm">-{fmt(exp, cur)} {cur}</span>
                </div>
              ))
            ) : (
              <span className="text-red-400 font-bold">{fmt(expense)} so'm</span>
            )}
          </div>

          <div className="bg-blue-500/10 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">Qoldiq (davr bo'yicha)</p>
            <div className="flex flex-col gap-0.5">
              {currencyStats.map(({ cur, inc, exp }) => {
                const bal = inc - exp
                if (bal === 0) return null
                return (
                  <div key={cur} className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{cur}</span>
                    <span className={`font-bold text-sm ${bal >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      {bal >= 0 ? '+' : ''}{fmt(bal, cur)} {cur}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-gray-500 text-xs text-center">{filtered.length} ta operatsiya</p>
        </div>
      </div>

      {/* By Category */}
      {Object.keys(byCategoryCur).length > 0 && (
        <div className="card">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-blue-400" />
            Kategoriyalar bo'yicha
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(byCategoryCur)
              .map(([cat, curData]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{cat}</span>
                  <div className="text-right">
                    {Object.entries(curData).map(([cur, vals]) => (
                      <div key={cur}>
                        {vals.income > 0 && <p className="text-green-400 text-xs">+{fmt(vals.income, cur)} {cur}</p>}
                        {vals.expense > 0 && <p className="text-red-400 text-xs">-{fmt(vals.expense, cur)} {cur}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Daily Balance */}
      {dailyBalances.length > 0 && (
        <div className="card">
          <button onClick={() => setShowDailyBalance(v => !v)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-blue-400" />
              <h2 className="text-white font-semibold">Kunlik qoldiq</h2>
            </div>
            {showDailyBalance ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {showDailyBalance && (
            <div className="flex flex-col gap-3 mt-3">
              {dailyBalances.map(({ date, balance, dayIncome, dayExpense }) => {
                const activeCurs = CURRENCIES.filter(c => balance[c] !== 0 || dayIncome[c] || dayExpense[c])
                return (
                  <div key={date} className="bg-dark-600 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-2 font-medium">
                      {format(new Date(date), 'dd.MM.yyyy')}
                    </p>
                    {activeCurs.map(cur => (
                      <div key={cur} className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{FLAGS[cur]}</span>
                          <div className="flex gap-2 text-xs">
                            {dayIncome[cur] > 0 && <span className="text-green-400">+{fmt(dayIncome[cur], cur)}</span>}
                            {dayExpense[cur] > 0 && <span className="text-red-400">-{fmt(dayExpense[cur], cur)}</span>}
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${balance[cur] >= 0 ? 'text-white' : 'text-red-400'}`}>
                          {balance[cur] >= 0 ? '' : '-'}{fmt(Math.abs(balance[cur]), cur)} {cur}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex flex-col gap-2">
        <button onClick={exportPDF} disabled={loading} className="flex items-center justify-center gap-3 bg-red-500/15 border border-red-500/20 text-red-400 font-semibold py-4 rounded-xl active:opacity-70 disabled:opacity-50 transition-opacity">
          <FileText size={20} />
          PDF yuklab olish
        </button>
        <button onClick={exportExcel} disabled={loading} className="flex items-center justify-center gap-3 bg-green-500/15 border border-green-500/20 text-green-400 font-semibold py-4 rounded-xl active:opacity-70 disabled:opacity-50 transition-opacity">
          <Table size={20} />
          Excel yuklab olish
        </button>
        {loading && <p className="text-center text-gray-400 text-sm">Tayorlanmoqda...</p>}
      </div>
    </div>
  )
}
