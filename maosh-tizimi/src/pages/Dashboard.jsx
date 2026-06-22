import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useAuth } from '../store/AuthContext'
import { fmt, MONTHS, currentYear, currentMonth } from '../utils/format'
import { Users, Wallet, TrendingDown, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ xodimlar: 0, oylikJami: 0, chiqimlar: 0, qarz: 0 })
  const [loading, setLoading] = useState(true)
  const year = currentYear()
  const month = currentMonth()

  useEffect(() => {
    if (profile?.rol === 'xodim') { setLoading(false); return }
    async function load() {
      const [xSnap, oSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'xodimlar'), where('faol', '==', true))),
        getDocs(query(collection(db, 'oylikHisob'), where('yil', '==', year), where('oy', '==', month))),
        getDocs(query(collection(db, 'chiqimlar'), where('yil', '==', year), where('oy', '==', month))),
      ])
      const oylikJami = oSnap.docs.reduce((s, d) => s + (d.data().jami || 0), 0)
      const chiqimlar = cSnap.docs.reduce((s, d) => s + (d.data().summa || 0), 0)
      const qarz = oSnap.docs.reduce((s, d) => {
        const o = d.data()
        return s + Math.max(0, (o.jami || 0) - (o.tolanganNaqd || 0) - (o.tolanganKarta || 0))
      }, 0)
      setStats({ xodimlar: xSnap.size, oylikJami, chiqimlar, qarz })
      setLoading(false)
    }
    load()
  }, [profile, year, month])

  if (profile?.rol === 'xodim') {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Xush kelibsiz, {profile.ism}!</h2>
        <p className="text-slate-500">O'z ma'lumotlaringizni ko'rish uchun <a href="/profil" className="text-emerald-600 underline">Profil</a> sahifasiga o'ting.</p>
      </div>
    )
  }

  const cards = [
    { label: 'Faol xodimlar', value: stats.xodimlar, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: `${MONTHS[month]} oylik jami`, value: fmt(stats.oylikJami) + ' so\'m', icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
    { label: `${MONTHS[month]} chiqimlar`, value: fmt(stats.chiqimlar) + ' so\'m', icon: TrendingDown, color: 'bg-orange-50 text-orange-600' },
    { label: 'Qarz (to\'lanmagan)', value: fmt(stats.qarz) + ' so\'m', icon: AlertCircle, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">{year} - {MONTHS[month]}</p>
      </div>
      {loading ? (
        <div className="text-slate-400">Yuklanmoqda...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className={`inline-flex p-2 rounded-lg ${c.color} mb-3`}>
                <c.icon size={20} />
              </div>
              <div className="text-xl font-bold text-slate-800">{c.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
