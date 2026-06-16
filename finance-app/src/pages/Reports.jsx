import { useState } from 'react'
import { FileText, Table, TrendingUp, TrendingDown, PieChart } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

export default function Reports() {
  const { transactions, debts, user } = useApp()
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const filtered = transactions.filter(t => {
    const d = new Date(t.date)
    return isWithinInterval(d, { start: new Date(startDate), end: new Date(endDate) })
  })

  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense

  // Per-currency breakdown
  const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
  const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }
  const currencyStats = CURRENCIES.map(cur => {
    const inc = filtered.filter(t => t.type === 'income' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    const exp = filtered.filter(t => t.type === 'expense' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    return { cur, inc, exp }
  }).filter(x => x.inc > 0 || x.exp > 0)

  // Group by category
  const byCategory = filtered.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = { income: 0, expense: 0 }
    acc[t.category][t.type] += t.amount
    return acc
  }, {})

  const exportPDF = async () => {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      doc.setFont('helvetica')
      doc.setFontSize(18)
      doc.text('Moliyaviy Hisobot', 14, 20)
      doc.setFontSize(11)
      doc.text(`Foydalanuvchi: ${user?.name}`, 14, 30)
      doc.text(`Davr: ${startDate} - ${endDate}`, 14, 37)
      doc.text(`Sana: ${format(new Date(), 'dd.MM.yyyy')}`, 14, 44)

      doc.setFontSize(13)
      doc.text('Umumiy ko\'rsatkichlar', 14, 55)
      autoTable(doc, {
        startY: 58,
        head: [['Kirim', 'Chiqim', 'Sof foyda']],
        body: [[`${fmt(income)} so'm`, `${fmt(expense)} so'm`, `${fmt(net)} so'm`]],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [79, 142, 247] }
      })

      doc.text('Operatsiyalar', 14, doc.lastAutoTable.finalY + 10)
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 13,
        head: [['Sana', 'Tur', 'Kategoriya', 'Izoh', 'Summa']],
        body: filtered.map(t => [
          format(new Date(t.date), 'dd.MM.yyyy'),
          t.type === 'income' ? 'Kirim' : 'Chiqim',
          t.category,
          t.note || '',
          `${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}`
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 142, 247] }
      })

      doc.save(`hisobot_${startDate}_${endDate}.pdf`)
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
                  <span className="text-green-400 font-bold text-sm">+{fmt(inc)} {cur}</span>
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
                  <span className="text-red-400 font-bold text-sm">-{fmt(exp)} {cur}</span>
                </div>
              ))
            ) : (
              <span className="text-red-400 font-bold">{fmt(expense)} so'm</span>
            )}
          </div>

          <div className={`flex items-center justify-between p-3 rounded-xl ${net >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
            <span className="text-gray-300 text-sm font-medium">Sof foyda (UZS)</span>
            <span className={`font-bold ${net >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{fmt(Math.abs(net))} so'm {net < 0 ? '(zarar)' : ''}</span>
          </div>
          <p className="text-gray-500 text-xs text-center">{filtered.length} ta operatsiya</p>
        </div>
      </div>

      {/* By Category */}
      {Object.keys(byCategory).length > 0 && (
        <div className="card">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-blue-400" />
            Kategoriyalar bo'yicha
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(byCategory)
              .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
              .map(([cat, vals]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{cat}</span>
                  <div className="text-right">
                    {vals.income > 0 && <p className="text-green-400 text-xs">+{fmt(vals.income)}</p>}
                    {vals.expense > 0 && <p className="text-red-400 text-xs">-{fmt(vals.expense)}</p>}
                  </div>
                </div>
              ))}
          </div>
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
