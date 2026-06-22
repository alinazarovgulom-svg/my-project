import { useEffect, useState } from 'react'
import { db } from '../store/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { useAuth } from '../store/AuthContext'
import { fmt, MONTHS } from '../utils/format'

export default function MyProfile() {
  const { user, profile } = useAuth()
  const [tarix, setTarix] = useState([])

  useEffect(() => {
    if (!profile?.xodimId) return
    getDocs(query(
      collection(db, 'oylikHisob'),
      where('xodimId', '==', profile.xodimId),
      orderBy('yil', 'desc'),
      orderBy('oy', 'desc')
    )).then(snap => setTarix(snap.docs.map(d => d.data())))
  }, [profile])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mening profilim</h1>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
            {profile?.ism?.[0] || user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{profile?.ism || 'Foydalanuvchi'}</div>
            <div className="text-slate-500 text-sm">{user?.email}</div>
            <span className="inline-block mt-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{profile?.rol}</span>
          </div>
        </div>
      </div>

      {profile?.rol === 'xodim' && tarix.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-slate-800">Oylik tarixim</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Yil / Oy</th>
                <th className="text-right px-4 py-3 font-medium">Oylik</th>
                <th className="text-right px-4 py-3 font-medium">Bonus</th>
                <th className="text-right px-4 py-3 font-medium">Jami</th>
                <th className="text-right px-4 py-3 font-medium">To'langan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tarix.map((t, i) => {
                const tol = (t.tolanganNaqd || 0) + (t.tolanganKarta || 0)
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">{t.yil} - {MONTHS[t.oy]}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(t.asosiyOylik)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(t.bonusHisoblangan || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{fmt(t.jami)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmt(tol)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {profile?.rol !== 'xodim' && (
        <div className="text-slate-500 text-sm bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          Bu sahifada xodimlar o'z oylik ma'lumotlarini ko'radi. Admin/buxgalter uchun ma'lumotlar boshqa sahifalarda.
        </div>
      )}
    </div>
  )
}
