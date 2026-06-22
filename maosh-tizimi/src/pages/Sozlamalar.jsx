import { useEffect, useState } from 'react'
import { db, auth } from '../store/firebase'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { Plus, Trash2, Shield } from 'lucide-react'

const ROLLAR = ['admin', 'buxgalter', 'xodim']

export default function Sozlamalar() {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', parol: '', ism: '', rol: 'buxgalter', xodimId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const snap = await getDocs(collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.parol)
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: form.email,
        ism: form.ism,
        rol: form.rol,
        xodimId: form.xodimId,
        qoshilgan: serverTimestamp()
      })
      setModal(false)
      setForm({ email: '', parol: '', ism: '', rol: 'buxgalter', xodimId: '' })
      load()
    } catch (e) {
      setError(e.message || 'Xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (uid, rol) => {
    await updateDoc(doc(db, 'users', uid), { rol })
    load()
  }

  const deleteUser = async (uid) => {
    if (!confirm("Bu foydalanuvchini o'chirmoqchimisiz?")) return
    await deleteDoc(doc(db, 'users', uid))
    load()
  }

  const rolColor = (rol) => {
    if (rol === 'admin') return 'bg-red-100 text-red-700'
    if (rol === 'buxgalter') return 'bg-blue-100 text-blue-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sozlamalar</h1>
          <p className="text-slate-500 text-sm">Foydalanuvchilar va rollarni boshqarish</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Plus size={16} /> Foydalanuvchi qo'shish
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Shield size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Foydalanuvchilar</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Ism</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-center px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.uid} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.ism}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={u.rol}
                    onChange={e => changeRole(u.uid, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${rolColor(u.rol)}`}
                  >
                    {ROLLAR.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteUser(u.uid)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">Foydalanuvchilar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { rol: 'admin', label: 'Admin', desc: "Barcha sahifalarga to'liq kirish, foydalanuvchi boshqaruvi" },
          { rol: 'buxgalter', label: 'Buxgalter', desc: "Xodimlar, oylik, to'lovlar, chiqimlar, chek, hisobot" },
          { rol: 'xodim', label: 'Xodim', desc: "Faqat o'z profili va oylik ma'lumotlarini ko'radi" },
        ].map(r => (
          <div key={r.rol} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rolColor(r.rol)}`}>{r.label}</span>
            <p className="text-sm text-slate-600 mt-2">{r.desc}</p>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">Yangi foydalanuvchi</h2>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Ism Familiya" value={form.ism} onChange={v => setForm(f => ({ ...f, ism: v }))} />
              <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
              <Field label="Parol" value={form.parol} onChange={v => setForm(f => ({ ...f, parol: v }))} type="password" placeholder="Kamida 6 ta belgi" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {ROLLAR.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => { setModal(false); setError('') }} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                Bekor qilish
              </button>
              <button onClick={save} disabled={saving || !form.email || !form.parol || !form.ism}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? 'Yaratilmoqda...' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    </div>
  )
}
