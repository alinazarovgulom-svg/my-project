import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import {
  collection, getDocs, addDoc, query, where, orderBy,
  doc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { fmt, MONTHS, currentYear, currentMonth, fmtDate } from '../utils/format'
import { Plus, CreditCard, Banknote } from 'lucide-react'

export default function Tolovlar() {
  const [yil, setYil] = useState(currentYear())
  const [oy, setOy] = useState(currentMonth())
  const [tolovlar, setTolovlar] = useState([])
  const [xodimlar, setXodimlar] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ xodimId: '', tur: 'naqd', summa: '', izoh: '' })
  const [saving, setSaving] = useState(false)
  const years = [2025, 2026, 2027, 2028]

  const load = async () => {
    const [tSnap, xSnap] = await Promise.all([
      getDocs(query(collection(db, 'tolovlar'), where('yil', '==', yil), where('oy', '==', oy), orderBy('sana', 'desc'))),
      getDocs(query(collection(db, 'xodimlar'), where('faol', '==', true)))
    ])
    setTolovlar(tSnap.docs.map(d => ({ uid: d.id, ...d.data() })))
    setXodimlar(xSnap.docs.map(d => ({ uid: d.id, ...d.data() })))
  }

  useEffect(() => { load() }, [yil, oy])

  const save = async () => {
    if (!form.xodimId || !form.summa) return
    setSaving(true)
    try {
      const x = xodimlar.find(x => x.uid === form.xodimId)
      await addDoc(collection(db, 'tolovlar'), {
        xodimId: form.xodimId,
        xodimIsm: x?.ism || '',
        xodimIdKod: x?.id || '',
        tur: form.tur,
        summa: Number(form.summa),
        izoh: form.izoh,
        yil, oy,
        sana: serverTimestamp()
      })
      // Update oylikHisob
      const hId = `${form.xodimId}_${yil}_${oy}`
      const hSnap = await getDocs(query(collection(db, 'oylikHisob'), where('xodimId', '==', form.xodimId), where('yil', '==', yil), where('oy', '==', oy)))
      if (!hSnap.empty) {
        const hDoc = hSnap.docs[0]
        const hData = hDoc.data()
        const field = form.tur === 'naqd' ? 'tolanganNaqd' : 'tolanganKarta'
        await updateDoc(doc(db, 'oylikHisob', hDoc.id), {
          [field]: (hData[field] || 0) + Number(form.summa)
        })
      }
      setModal(false)
      setForm({ xodimId: '', tur: 'naqd', summa: '', izoh: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const naqdJami = tolovlar.filter(t => t.tur === 'naqd').reduce((s, t) => s + t.summa, 0)
  const kartaJami = tolovlar.filter(t => t.tur === 'karta').reduce((s, t) => s + t.summa, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">To'lovlar</h1>
          <p className="text-slate-500 text-sm">Naqd va karta to'lovlari</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={yil} onChange={e => setYil(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={oy} onChange={e => setOy(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            <Plus size={16} /> To'lov qo'shish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><Banknote size={20} className="text-green-600" /></div>
          <div>
            <div className="font-bold">{fmt(naqdJami)} so'm</div>
            <div className="text-xs text-slate-500">Naqd</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><CreditCard size={20} className="text-blue-600" /></div>
          <div>
            <div className="font-bold">{fmt(kartaJami)} so'm</div>
            <div className="text-xs text-slate-500">Karta</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="font-bold">{fmt(naqdJami + kartaJami)} so'm</div>
          <div className="text-xs text-slate-500">Jami to'langan</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Xodim</th>
              <th className="text-center px-4 py-3 font-medium">Tur</th>
              <th className="text-right px-4 py-3 font-medium">Summa</th>
              <th className="text-left px-4 py-3 font-medium">Izoh</th>
              <th className="text-left px-4 py-3 font-medium">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tolovlar.map(t => (
              <tr key={t.uid} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.xodimIsm}</div>
                  <div className="text-xs text-slate-400 font-mono">{t.xodimIdKod}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  {t.tur === 'naqd'
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Naqd</span>
                    : <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Karta</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium">{fmt(t.summa)}</td>
                <td className="px-4 py-3 text-slate-500">{t.izoh || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(t.sana)}</td>
              </tr>
            ))}
            {tolovlar.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">To'lovlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">To'lov qo'shish</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xodim</label>
                <select value={form.xodimId} onChange={e => setForm(f => ({ ...f, xodimId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Xodimni tanlang</option>
                  {xodimlar.map(x => <option key={x.uid} value={x.uid}>{x.ism} ({x.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To'lov turi</label>
                <div className="flex gap-3">
                  {['naqd', 'karta'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tur: t }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.tur === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}>
                      {t === 'naqd' ? 'Naqd' : 'Karta'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summa (so'm)</label>
                <input type="number" value={form.summa} onChange={e => setForm(f => ({ ...f, summa: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Izoh (ixtiyoriy)</label>
                <input value={form.izoh} onChange={e => setForm(f => ({ ...f, izoh: e.target.value }))}
                  placeholder="To'lov haqida izoh..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Bekor qilish</button>
              <button onClick={save} disabled={saving || !form.xodimId || !form.summa}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
