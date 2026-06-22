import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { fmt, MONTHS, currentYear, currentMonth } from '../utils/format'
import { Printer, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Chek() {
  const [yil, setYil] = useState(currentYear())
  const [oy, setOy] = useState(currentMonth())
  const [xodimId, setXodimId] = useState('')
  const [xodimlar, setXodimlar] = useState([])
  const [data, setData] = useState(null)
  const years = [2025, 2026, 2027, 2028]

  useEffect(() => {
    getDocs(query(collection(db, 'xodimlar'), where('faol', '==', true)))
      .then(snap => setXodimlar(snap.docs.map(d => ({ uid: d.id, ...d.data() }))))
  }, [])

  const load = async () => {
    if (!xodimId) return
    const snap = await getDocs(
      query(collection(db, 'oylikHisob'), where('xodimId', '==', xodimId), where('yil', '==', yil), where('oy', '==', oy))
    )
    if (!snap.empty) setData(snap.docs[0].data())
    else setData(null)
  }

  const x = xodimlar.find(x => x.uid === xodimId)
  const tolanganNaqd = data?.tolanganNaqd || 0
  const tolanganKarta = data?.tolanganKarta || 0
  const jami = data?.jami || 0
  const qarz = jami - tolanganNaqd - tolanganKarta

  const printPDF = () => {
    if (!data || !x) return
    const pdf = new jsPDF()
    pdf.setFontSize(16)
    pdf.text('MAOSH CHEKI', 105, 20, { align: 'center' })
    pdf.setFontSize(11)
    pdf.text(`${MONTHS[oy]} ${yil}`, 105, 28, { align: 'center' })
    pdf.line(10, 32, 200, 32)
    autoTable(pdf, {
      startY: 36,
      head: [['Ko\'rsatkich', 'Qiymat']],
      body: [
        ['Xodim', x.ism],
        ['ID', x.id],
        ['Lavozim', x.lavozim],
        ['Asosiy oylik', fmt(data.asosiyOylik) + " so'm"],
        ['Bonus', fmt(data.bonusHisoblangan || 0) + " so'm"],
        ['JAMI OYLIK', fmt(jami) + " so'm"],
        ['To\'langan (naqd)', fmt(tolanganNaqd) + " so'm"],
        ['To\'langan (karta)', fmt(tolanganKarta) + " so'm"],
        ['Qarz / ortiqcha', fmt(Math.abs(qarz)) + (qarz > 0 ? " so'm (qarz)" : qarz < 0 ? " so'm (ortiq)" : " so'm")],
      ],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
    })
    pdf.save(`chek-${x.id}-${yil}-${oy + 1}.pdf`)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Maosh cheki</h1>
        <p className="text-slate-500 text-sm">Xodim uchun individual maosh cheki</p>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-5 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Xodim</label>
          <select value={xodimId} onChange={e => setXodimId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Xodimni tanlang</option>
            {xodimlar.map(x => <option key={x.uid} value={x.uid}>{x.ism} ({x.id})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Yil</label>
          <select value={yil} onChange={e => setYil(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Oy</label>
          <select value={oy} onChange={e => setOy(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <button onClick={load} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700">
          Ko'rish
        </button>
      </div>

      {xodimId && data && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="bg-emerald-600 text-white p-5 text-center">
              <h2 className="text-lg font-bold">MAOSH CHEKI</h2>
              <p className="text-emerald-100 text-sm">{MONTHS[oy]} {yil}</p>
            </div>
            <div className="p-5">
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold mx-auto mb-2">
                  {x?.ism?.[0]}
                </div>
                <div className="font-bold text-slate-800">{x?.ism}</div>
                <div className="text-sm text-slate-500">{x?.lavozim} · {x?.id}</div>
              </div>
              <div className="border-t pt-4 space-y-2 text-sm">
                <Row label="Asosiy oylik" value={fmt(data.asosiyOylik) + " so'm"} />
                <Row label="Bonus" value={fmt(data.bonusHisoblangan || 0) + " so'm"} green />
                <div className="border-t pt-2 mt-2">
                  <Row label="JAMI OYLIK" value={fmt(jami) + " so'm"} bold />
                </div>
                <Row label="To'langan (naqd)" value={fmt(tolanganNaqd) + " so'm"} />
                <Row label="To'langan (karta)" value={fmt(tolanganKarta) + " so'm"} />
                <div className="border-t pt-2 mt-2">
                  <Row
                    label={qarz > 0 ? "Qarz" : qarz < 0 ? "Ortiqcha to'lov" : "Holat"}
                    value={fmt(Math.abs(qarz)) + " so'm"}
                    red={qarz > 0}
                    bold
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={printPDF}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700">
                  <Download size={16} /> PDF yuklab olish
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm hover:bg-slate-50">
                  <Printer size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {xodimId && !data && (
        <div className="text-center py-12 text-slate-400">
          Bu oy uchun ma'lumot topilmadi. Avval "Oylik hisob" sahifasida ma'lumot kiriting.
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold, green, red }) {
  return (
    <div className="flex justify-between">
      <span className={`text-slate-500 ${bold ? 'font-semibold text-slate-700' : ''}`}>{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${green ? 'text-emerald-600' : ''} ${red ? 'text-red-600' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}
