import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import {
  collection, getDocs, doc, setDoc, query, where
} from 'firebase/firestore'
import { fmt, MONTHS, currentYear, currentMonth } from '../utils/format'
import { Save, ChevronDown } from 'lucide-react'

export default function OylikHisob() {
  const [yil, setYil] = useState(currentYear())
  const [oy, setOy] = useState(currentMonth())
  const [xodimlar, setXodimlar] = useState([])
  const [hisob, setHisob] = useState({}) // xodimId -> record
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const years = [2025, 2026, 2027, 2028]

  useEffect(() => {
    async function load() {
      const [xSnap, hSnap] = await Promise.all([
        getDocs(query(collection(db, 'xodimlar'), where('faol', '==', true))),
        getDocs(query(collection(db, 'oylikHisob'), where('yil', '==', yil), where('oy', '==', oy)))
      ])
      const xList = xSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
      setXodimlar(xList)
      const hMap = {}
      hSnap.docs.forEach(d => { hMap[d.data().xodimId] = { uid: d.id, ...d.data() } })
      setHisob(hMap)
    }
    load()
  }, [yil, oy])

  const getRow = (x) => hisob[x.uid] || {
    xodimId: x.uid,
    xodimIsm: x.ism,
    xodimIdKod: x.id,
    yil, oy,
    asosiyOylik: x.asosiyOylik || 0,
    kelganKun: 0,
    kechQolish: 0,
    ertaKetish: 0,
    javobSoat: 0,
    bonusBeriladi: x.bonus || false,
    bonusMiqdori: x.bonusMiqdori || 0,
    bonusHisoblangan: 0,
    jami: x.asosiyOylik || 0,
    tolanganNaqd: 0,
    tolanganKarta: 0,
  }

  const updateRow = (xodimId, field, value) => {
    setHisob(prev => {
      const x = xodimlar.find(x => x.uid === xodimId)
      const row = { ...getRow(x), [field]: Number(value) || 0 }
      // Auto-calculate bonus
      const bonusOladi = row.bonusBeriladi && row.kechQolish === 0 && row.ertaKetish === 0 && row.javobSoat === 0
      row.bonusHisoblangan = bonusOladi ? (row.bonusMiqdori || 0) : 0
      row.jami = row.asosiyOylik + row.bonusHisoblangan
      return { ...prev, [xodimId]: row }
    })
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const batch = Object.values(hisob).map(async (row) => {
        const id = `${row.xodimId}_${yil}_${oy}`
        await setDoc(doc(db, 'oylikHisob', id), { ...row, yil, oy })
      })
      // Also save rows not yet modified
      for (const x of xodimlar) {
        if (!hisob[x.uid]) {
          const row = getRow(x)
          const id = `${x.uid}_${yil}_${oy}`
          await setDoc(doc(db, 'oylikHisob', id), row)
        }
      }
      await Promise.all(batch)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const totalJami = xodimlar.reduce((s, x) => s + (getRow(x).jami || 0), 0)
  const totalBonus = xodimlar.reduce((s, x) => s + (getRow(x).bonusHisoblangan || 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Oylik hisob</h1>
          <p className="text-slate-500 text-sm">Davomat kiritiladi, bonus avtomatik hisoblanadi</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={yil} onChange={e => setYil(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={oy} onChange={e => setOy(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <button onClick={saveAll} disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            <Save size={16} /> {saved ? 'Saqlandi ✓' : saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-lg font-bold">{fmt(totalJami)} so'm</div>
          <div className="text-sm text-slate-500">Jami oylik</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-lg font-bold text-emerald-600">{fmt(totalBonus)} so'm</div>
          <div className="text-sm text-slate-500">Jami bonus</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-lg font-bold">{xodimlar.length} ta</div>
          <div className="text-sm text-slate-500">Xodimlar soni</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-3 font-medium sticky left-0 bg-slate-50">Xodim</th>
              <th className="text-right px-3 py-3 font-medium">Oylik</th>
              <th className="text-center px-3 py-3 font-medium">Kelgan kun</th>
              <th className="text-center px-3 py-3 font-medium">Kech qolish</th>
              <th className="text-center px-3 py-3 font-medium">Erta ketish</th>
              <th className="text-center px-3 py-3 font-medium">Javob soat</th>
              <th className="text-center px-3 py-3 font-medium">Bonus</th>
              <th className="text-right px-3 py-3 font-medium">Bonus sum</th>
              <th className="text-right px-3 py-3 font-medium font-bold">Jami</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {xodimlar.map(x => {
              const row = getRow(x)
              const bonusOladi = row.bonusBeriladi && row.kechQolish === 0 && row.ertaKetish === 0 && row.javobSoat === 0
              return (
                <tr key={x.uid} className="hover:bg-slate-50">
                  <td className="px-3 py-2 sticky left-0 bg-white">
                    <div className="font-medium">{x.ism}</div>
                    <div className="text-xs text-slate-400 font-mono">{x.id}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(x.asosiyOylik)}</td>
                  <td className="px-3 py-2">
                    <NumInput value={row.kelganKun} onChange={v => updateRow(x.uid, 'kelganKun', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput value={row.kechQolish} onChange={v => updateRow(x.uid, 'kechQolish', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput value={row.ertaKetish} onChange={v => updateRow(x.uid, 'ertaKetish', v)} />
                  </td>
                  <td className="px-3 py-2">
                    <NumInput value={row.javobSoat} onChange={v => updateRow(x.uid, 'javobSoat', v)} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.bonusBeriladi
                      ? <span className={`text-xs px-2 py-0.5 rounded-full ${bonusOladi ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {bonusOladi ? 'Ha' : "Yo'q"}
                        </span>
                      : <span className="text-xs text-slate-300">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-600">{fmt(row.bonusHisoblangan)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{fmt(row.jami)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200">
            <tr className="bg-slate-50 font-bold">
              <td className="px-3 py-3" colSpan={7}>Jami</td>
              <td className="px-3 py-3 text-right font-mono text-emerald-600">{fmt(totalBonus)}</td>
              <td className="px-3 py-3 text-right font-mono">{fmt(totalJami)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function NumInput({ value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-16 text-center border border-slate-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
    />
  )
}
