import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../store/firebase'
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { fmt, MONTHS } from '../utils/format'
import { ArrowLeft } from 'lucide-react'

export default function XodimDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [xodim, setXodim] = useState(null)
  const [tarix, setTarix] = useState([])

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'xodimlar', id))
      if (snap.exists()) setXodim({ uid: snap.id, ...snap.data() })
      const hSnap = await getDocs(
        query(collection(db, 'oylikHisob'), where('xodimId', '==', id), orderBy('yil', 'desc'), orderBy('oy', 'desc'))
      )
      setTarix(hSnap.docs.map(d => ({ uid: d.id, ...d.data() })))
    }
    load()
  }, [id])

  if (!xodim) return <div className="p-6 text-slate-400">Yuklanmoqda...</div>

  const jami = tarix.reduce((s, t) => s + (t.jami || 0), 0)
  const tolangan = tarix.reduce((s, t) => s + (t.tolanganNaqd || 0) + (t.tolanganKarta || 0), 0)

  return (
    <div className="p-6">
      <button onClick={() => navigate('/xodimlar')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={16} /> Xodimlar ro'yxati
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {xodim.ism?.[0] || '?'}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{xodim.ism}</h2>
            <p className="text-slate-500 text-sm">{xodim.lavozim}</p>
            <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{xodim.id}</span>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Bo'lim" value={xodim.bulim} />
            <Row label="Telefon" value={xodim.telefon || '-'} />
            <Row label="Oylik" value={fmt(xodim.asosiyOylik) + " so'm"} />
            <Row label="Bonus" value={xodim.bonus ? `Ha (${fmt(xodim.bonusMiqdori)} so'm)` : "Yo'q"} />
            <Row label="Holat" value={xodim.faol ? '✅ Faol' : '❌ Nofaol'} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Jami hisoblangan" value={fmt(jami) + " so'm"} color="text-slate-800" />
            <StatCard label="Jami to'langan" value={fmt(tolangan) + " so'm"} color="text-emerald-600" />
            <StatCard label="Qarz" value={fmt(Math.max(0, jami - tolangan)) + " so'm"} color={jami - tolangan > 0 ? 'text-red-600' : 'text-slate-800'} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-slate-800">Oylik tarix</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Yil</th>
                  <th className="text-left px-4 py-3 font-medium">Oy</th>
                  <th className="text-right px-4 py-3 font-medium">Oylik</th>
                  <th className="text-right px-4 py-3 font-medium">Bonus</th>
                  <th className="text-right px-4 py-3 font-medium">Jami</th>
                  <th className="text-right px-4 py-3 font-medium">To'langan</th>
                  <th className="text-right px-4 py-3 font-medium">Qarz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tarix.map(t => {
                  const tol = (t.tolanganNaqd || 0) + (t.tolanganKarta || 0)
                  const qarz = (t.jami || 0) - tol
                  return (
                    <tr key={t.uid}>
                      <td className="px-4 py-3">{t.yil}</td>
                      <td className="px-4 py-3">{MONTHS[t.oy]}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(t.asosiyOylik)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(t.bonusMiqdori || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{fmt(t.jami)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(tol)}</td>
                      <td className={`px-4 py-3 text-right font-mono ${qarz > 0 ? 'text-red-500' : 'text-slate-400'}`}>{fmt(qarz)}</td>
                    </tr>
                  )
                })}
                {tarix.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">Ma'lumot yo'q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
