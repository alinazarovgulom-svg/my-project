import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { fmt, MONTHS, currentYear } from '../utils/format'
import { Download, FileSpreadsheet } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function Hisobot() {
  const [yil, setYil] = useState(currentYear())
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const years = [2025, 2026, 2027, 2028]

  useEffect(() => {
    setLoading(true)
    getDocs(query(collection(db, 'oylikHisob'), where('yil', '==', yil)))
      .then(snap => {
        setData(snap.docs.map(d => d.data()))
        setLoading(false)
      })
  }, [yil])

  // Build month summaries
  const byMonth = MONTHS.map((m, i) => {
    const rows = data.filter(d => d.oy === i)
    return {
      oy: m,
      xodimSoni: rows.length,
      oylikJami: rows.reduce((s, r) => s + (r.asosiyOylik || 0), 0),
      bonusJami: rows.reduce((s, r) => s + (r.bonusHisoblangan || 0), 0),
      jami: rows.reduce((s, r) => s + (r.jami || 0), 0),
      tolangan: rows.reduce((s, r) => s + (r.tolanganNaqd || 0) + (r.tolanganKarta || 0), 0),
    }
  }).filter(m => m.xodimSoni > 0)

  const totalJami = byMonth.reduce((s, m) => s + m.jami, 0)
  const totalTolangan = byMonth.reduce((s, m) => s + m.tolangan, 0)

  const exportPDF = () => {
    const pdf = new jsPDF()
    pdf.setFontSize(14)
    pdf.text(`${yil} yil oylik hisoboti`, 105, 16, { align: 'center' })
    autoTable(pdf, {
      startY: 24,
      head: [['Oy', 'Xodim', 'Oylik', 'Bonus', 'Jami', "To'langan", 'Qarz']],
      body: byMonth.map(m => [
        m.oy, m.xodimSoni,
        fmt(m.oylikJami), fmt(m.bonusJami),
        fmt(m.jami), fmt(m.tolangan),
        fmt(m.jami - m.tolangan)
      ]),
      foot: [['JAMI', '', '', '', fmt(totalJami), fmt(totalTolangan), fmt(totalJami - totalTolangan)]],
      headStyles: { fillColor: [16, 185, 129] },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
    })
    pdf.save(`hisobot-${yil}.pdf`)
  }

  const exportExcel = () => {
    const rows = byMonth.map(m => ({
      'Oy': m.oy,
      'Xodim soni': m.xodimSoni,
      'Oylik (so\'m)': m.oylikJami,
      'Bonus (so\'m)': m.bonusJami,
      "Jami (so'm)": m.jami,
      "To'langan (so'm)": m.tolangan,
      "Qarz (so'm)": m.jami - m.tolangan,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${yil}`)
    XLSX.writeFile(wb, `hisobot-${yil}.xlsx`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hisobot</h1>
          <p className="text-slate-500 text-sm">Yillik oylik hisoboti</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={yil} onChange={e => setYil(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400">Yuklanmoqda...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Oy</th>
                <th className="text-center px-4 py-3 font-medium">Xodimlar</th>
                <th className="text-right px-4 py-3 font-medium">Oylik</th>
                <th className="text-right px-4 py-3 font-medium">Bonus</th>
                <th className="text-right px-4 py-3 font-medium font-bold">Jami</th>
                <th className="text-right px-4 py-3 font-medium">To'langan</th>
                <th className="text-right px-4 py-3 font-medium">Qarz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {byMonth.map(m => {
                const qarz = m.jami - m.tolangan
                return (
                  <tr key={m.oy} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{m.oy}</td>
                    <td className="px-4 py-3 text-center">{m.xodimSoni}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(m.oylikJami)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(m.bonusJami)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{fmt(m.jami)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(m.tolangan)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${qarz > 0 ? 'text-red-500' : 'text-slate-400'}`}>{fmt(qarz)}</td>
                  </tr>
                )
              })}
              {byMonth.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">Ma'lumot yo'q</td></tr>
              )}
            </tbody>
            {byMonth.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr className="font-bold">
                  <td className="px-4 py-3" colSpan={4}>JAMI</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(totalJami)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(totalTolangan)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${totalJami - totalTolangan > 0 ? 'text-red-500' : ''}`}>{fmt(totalJami - totalTolangan)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
