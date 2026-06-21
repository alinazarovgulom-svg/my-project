import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2, X, Check, Shield, Eye, Download, Pencil, Clock } from 'lucide-react'

const ROLES = [
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Barcha imkoniyatlar' },
  { id: 'entry', label: 'Kirituvchi', icon: Pencil, desc: "Barcha ma'lumotlarni kiritish" },
  { id: 'hourly', label: 'Soatbay', icon: Clock, desc: 'Faqat soatbay ish kiritish' },
  { id: 'reporter', label: 'Hisobotchi', icon: Download, desc: "Ko'rish + hisobot yuklab olish" },
  { id: 'viewer', label: "Ko'ruvchi", icon: Eye, desc: "Faqat ko'rish" },
]

const roleColors = {
  admin: 'bg-purple-100 text-purple-800',
  entry: 'bg-blue-100 text-blue-800',
  hourly: 'bg-orange-100 text-orange-800',
  reporter: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-700',
}

const empty = { name: '', email: '', password: '', role: 'viewer' }

// Secondary Firebase app for creating users without signing out current user
function getSecondaryAuth() {
  const config = {
    apiKey: "AIzaSyASH72RruqIiBlZLAMrO2H6deV1eO2bpqs",
    authDomain: "pulbek-e324a.firebaseapp.com",
    projectId: "pulbek-e324a",
    storageBucket: "pulbek-e324a.firebasestorage.app",
    messagingSenderId: "882923501531",
    appId: "1:882923501531:web:ef3855ef512bd3edc0d9fe",
  }
  const secondaryName = 'factory-secondary'
  const existing = getApps().find(a => a.name === secondaryName)
  const app = existing || initializeApp(config, secondaryName)
  return getAuth(app)
}

export default function Members() {
  const { userDoc } = useAuth()
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'factory_users'), orderBy('name'))
    return onSnapshot(q, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const openAdd = () => { setForm(empty); setError(''); setModal('add') }
  const closeModal = () => { setModal(null); setError('') }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    setError('')
    setSaving(true)
    try {
      if (modal === 'add') {
        if (!form.password || form.password.length < 6) {
          setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
          setSaving(false)
          return
        }
        // Create Firebase Auth user via secondary app
        const secondAuth = getSecondaryAuth()
        const cred = await createUserWithEmailAndPassword(secondAuth, form.email.trim(), form.password)
        const uid = cred.user.uid
        await fbSignOut(secondAuth)

        // Save user doc
        await setDoc(doc(db, 'factory_users', uid), {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          createdAt: serverTimestamp(),
        })

        // Also create pending in case needed
        const emailKey = form.email.trim().replace(/[.@]/g, '_')
        await setDoc(doc(db, 'factory_pending', emailKey), {
          name: form.name.trim(),
          role: form.role,
        })
      } else {
        // Edit role/name only
        await setDoc(doc(db, 'factory_users', modal.id), {
          name: form.name.trim(),
          role: form.role,
        }, { merge: true })
      }
      closeModal()
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        // User already self-registered — just write factory_pending so they can log in
        try {
          const emailKey = form.email.trim().replace(/[.@]/g, '_')
          await setDoc(doc(db, 'factory_pending', emailKey), {
            name: form.name.trim(),
            role: form.role,
          })
          closeModal()
        } catch (e2) {
          setError(e2.message)
        }
      } else {
        setError(e.message)
      }
    }
    setSaving(false)
  }

  const handleDelete = async (member) => {
    if (!confirm(`${member.name} ni o'chirishni tasdiqlaysizmi?`)) return
    if (member.email === userDoc?.email) { alert("O'z akkauntingizni o'chira olmaysiz"); return }
    setDeleting(member.id)
    await deleteDoc(doc(db, 'factory_users', member.id))
    setDeleting(null)
  }

  const openEdit = (m) => {
    setForm({ name: m.name, email: m.email, password: '', role: m.role })
    setError('')
    setModal(m)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">A'zolar</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> A'zo qo'shish
        </button>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">A'zolar topilmadi</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(member => {
              const roleInfo = ROLES.find(r => r.id === member.role)
              const RoleIcon = roleInfo?.icon || Shield
              return (
                <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                  <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {member.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{member.name}</div>
                    <div className="text-xs text-gray-400">{member.email}</div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[member.role] || roleColors.viewer}`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo?.label || member.role}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(member)} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      disabled={deleting === member.id}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? "Yangi a'zo" : "A'zoni tahrirlash"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ismi</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ism Familya" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={modal !== 'add'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="email@misol.com" />
              </div>
              {modal === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kamida 6 belgi" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol va cheklov</label>
                <div className="space-y-2">
                  {ROLES.map(role => {
                    const Icon = role.icon
                    return (
                      <label key={role.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${form.role === role.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" name="role" value={role.id} checked={form.role === role.id}
                          onChange={() => setForm(f => ({ ...f, role: role.id }))} className="accent-blue-700" />
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-800">{role.label}</div>
                          <div className="text-xs text-gray-500">{role.desc}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
