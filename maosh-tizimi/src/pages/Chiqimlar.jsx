import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { fmt, MONTHS, currentYear, currentMonth, fmtDate } from '../utils/format'
import { Plus } from 'lucide-react'

const KATEGORIYALAR = ['Kommunal', 'Ijara', 'Transport', 'Oziq-ovqat', 'Texnika', 'Reklama', 'Boshqa']

export default function Chiqimlar() {
  const [yil, setYil] = useState(currentYear())
  const [oy, setOy] = useState(currentMonth())
  const [chiqimlar, setChiqimlar] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ kategoriya: KATEGORIYALAR[0], nomi: '', summa: '', izoh: '' })
  const [saving, setSaving] = useState(false)
  const years = [2025, 2026, 2027, 2028]

  const load = async () => {
    const snap = await getDocs(
      query(collection(db, 'chiqimlar'), where('yil', '==', yil), where('oy', '==', oy), orderBy('sana', 'desc'))
    )
    setChiqimlar(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
  }

  useEffect(() => { load() }, [yil, oy])

  const save = async () => {
    setSaving(true)
    try {
      await addDoc(collection(db, 'chiqimlar'), {
        kategoriya: form.kategoriya,
        nomi: form.nomi,
        summa: Number(form.summa),
        izoh: form.izoh,
        yil, oy,
        sana: serverTimestamp()
      })
      setModal(false)
      setForm({ kategoriya: KATEGORIYALAR[0], nomi: '', summa: '', izoh: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const jami = chiqimlar.reduce((s, c) => s + (c.summa || 0), 0)

  // Group by category
  const byKat = KATEGORIYALAR.map(k => ({
    kat: k,
    jami: chiqimlar.filter(c => c.kategoriya === k).reduce((s, c) => s + c.summa, 0)
  })).filter(k => k.jami > 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chiqimlar</h1>
          <p className="text-slate-500 text-sm">Xarajatlar hisobi</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={yil} onChange={e => setYil(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={oy} onChange={e => setOy(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            <Plus size={16} /> Xarajat qo'shish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 lg:col-span-1">
          <div className="text-lg font-bold text-red-600">{fmt(jami)} so'm</div>
          <div className="text-sm text-slate-500">Jami chiqimlar</div>
        </div>
        {byKat.slice(0, 3).map(k => (
          <div key={k.kat} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="font-bold">{fmt(k.jami)} so'm</div>
            <div className="text-sm text-slate-500">{k.kat}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Kategoriya</th>
              <th className="text-left px-4 py-3 font-medium">Nomi</th>
              <th className="text-right px-4 py-3 font-medium">Summa</th>
              <th className="text-left px-4 py-3 font-medium">Izoh</th>
              <th className="text-left px-4 py-3 font-medium">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {chiqimlar.map(c => (
              <tr key={c.uid} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c.kategoriya}</span>
                </td>
                <td className="px-4 py-3 font-medium">{c.nomi}</td>
                <td className="px-4 py-3 text-right font-mono font-medium text-red-600">{fmt(c.summa)}</td>
                <td className="px-4 py-3 text-slate-500">{c.izoh || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(c.sana)}</td>
              </tr>
            ))}
            {chiqimlar.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Chiqimlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">Xarajat qo'shish</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategoriya</label>
                <select value={form.kategoriya} onChange={e => setForm(f => ({ ...f, kategoriya: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {KATEGORIYALAR.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nomi</label>
                <input value={form.nomi} onChange={e => setForm(f => ({ ...f, nomi: e.target.value }))}
                  placeholder="Xarajat nomi"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summa (so'm)</label>
                <input type="number" value={form.summa} onChange={e => setForm(f => ({ ...f, summa: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Izoh</label>
                <input value={form.izoh} onChange={e => setForm(f => ({ ...f, izoh: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Bekor qilish</button>
              <button onClick={save} disabled={saving || !form.nomi || !form.summa}
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
