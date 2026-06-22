import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../utils/format'
import { Plus, Search, ChevronRight, UserCheck, UserX } from 'lucide-react'

const BO_LIMLAR = ['Boshqaruv', 'Ishlab chiqarish', 'Savdo', 'Hisobchilik', 'Xizmat']

const EMPTY = {
  id: '', ism: '', lavozim: '', bulim: BO_LIMLAR[0],
  asosiyOylik: '', bonus: '', bonusMiqdori: '',
  telefon: '', faol: true
}

export default function Xodimlar() {
  const [xodimlar, setXodimlar] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    const snap = await getDocs(collection(db, 'xodimlar'))
    setXodimlar(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
  }

  useEffect(() => { load() }, [])

  const filtered = xodimlar.filter(x =>
    x.ism?.toLowerCase().includes(search.toLowerCase()) ||
    x.id?.toLowerCase().includes(search.toLowerCase()) ||
    x.lavozim?.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setForm(EMPTY); setModal(true) }
  const openEdit = (x) => { setForm({ ...x }); setModal(true) }

  const save = async () => {
    setSaving(true)
    try {
      const data = {
        id: form.id.trim().toUpperCase(),
        ism: form.ism.trim(),
        lavozim: form.lavozim.trim(),
        bulim: form.bulim,
        asosiyOylik: Number(form.asosiyOylik) || 0,
        bonus: form.bonus === 'true' || form.bonus === true,
        bonusMiqdori: Number(form.bonusMiqdori) || 0,
        telefon: form.telefon.trim(),
        faol: form.faol === 'true' || form.faol === true,
      }
      if (form.uid) {
        await updateDoc(doc(db, 'xodimlar', form.uid), { ...data, yangilangan: serverTimestamp() })
      } else {
        await addDoc(collection(db, 'xodimlar'), { ...data, qoshilgan: serverTimestamp() })
      }
      setModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Xodimlar</h1>
          <p className="text-slate-500 text-sm">{xodimlar.filter(x => x.faol).length} ta faol xodim</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Plus size={16} /> Xodim qo'shish
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ism, ID yoki lavozim bo'yicha qidirish..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">Ism Familiya</th>
              <th className="text-left px-4 py-3 font-medium">Lavozim</th>
              <th className="text-left px-4 py-3 font-medium">Bo'lim</th>
              <th className="text-right px-4 py-3 font-medium">Oylik</th>
              <th className="text-center px-4 py-3 font-medium">Bonus</th>
              <th className="text-center px-4 py-3 font-medium">Holat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(x => (
              <tr key={x.uid} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/xodimlar/${x.uid}`)}>
                <td className="px-4 py-3 font-mono text-slate-600">{x.id}</td>
                <td className="px-4 py-3 font-medium">{x.ism}</td>
                <td className="px-4 py-3 text-slate-600">{x.lavozim}</td>
                <td className="px-4 py-3 text-slate-500">{x.bulim}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(x.asosiyOylik)}</td>
                <td className="px-4 py-3 text-center">
                  {x.bonus ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Ha ({fmt(x.bonusMiqdori)})</span>
                    : <span className="text-xs text-slate-400">Yo'q</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {x.faol ? <UserCheck size={16} className="text-emerald-500 mx-auto" /> : <UserX size={16} className="text-red-400 mx-auto" />}
                </td>
                <td className="px-4 py-3">
                  <button onClick={e => { e.stopPropagation(); openEdit(x) }} className="text-slate-400 hover:text-slate-700">
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Xodim topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">{form.uid ? 'Xodimni tahrirlash' : "Yangi xodim qo'shish"}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Xodim ID" value={form.id} onChange={v => setForm(f => ({ ...f, id: v }))} placeholder="AA0001" />
                <Field label="Telefon" value={form.telefon} onChange={v => setForm(f => ({ ...f, telefon: v }))} placeholder="+998901234567" />
              </div>
              <Field label="Ism Familiya" value={form.ism} onChange={v => setForm(f => ({ ...f, ism: v }))} placeholder="Aliyev Vohid" />
              <Field label="Lavozim" value={form.lavozim} onChange={v => setForm(f => ({ ...f, lavozim: v }))} placeholder="Menejer" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bo'lim</label>
                <select value={form.bulim} onChange={e => setForm(f => ({ ...f, bulim: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {BO_LIMLAR.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <Field label="Asosiy oylik (so'm)" value={form.asosiyOylik} onChange={v => setForm(f => ({ ...f, asosiyOylik: v }))} type="number" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bonus beriladimi?</label>
                <select value={String(form.bonus)} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="false">Yo'q</option>
                  <option value="true">Ha</option>
                </select>
              </div>
              {(form.bonus === 'true' || form.bonus === true) && (
                <Field label="Bonus miqdori (so'm)" value={form.bonusMiqdori} onChange={v => setForm(f => ({ ...f, bonusMiqdori: v }))} type="number" />
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Holat</label>
                <select value={String(form.faol)} onChange={e => setForm(f => ({ ...f, faol: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="true">Faol</option>
                  <option value="false">Nofaol</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Bekor qilish</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  )
}
