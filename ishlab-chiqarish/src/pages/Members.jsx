import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc, setDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentsContext'
import { Plus, Trash2, X, Check, Shield, Eye, Download, Pencil, Clock, UserX, UserCheck } from 'lucide-react'

const ROLES = [
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Barcha imkoniyatlar' },
  { id: 'entry', label: 'Kirituvchi', icon: Pencil, desc: "Barcha ma'lumotlarni kiritish" },
  { id: 'hourly', label: 'Soatbay', icon: Clock, desc: 'Faqat soatbay ish kiritish' },
  { id: 'reporter', label: 'Hisobotchi', icon: Download, desc: "Ko'rish + hisobot yuklab olish" },
  { id: 'viewer', label: "Ko'ruvchi", icon: Eye, desc: "Faqat ko'rish" },
]

const roleColors = {
  admin: 'bg-purple-100 text-purple-800',
  entry: 'bg-indigo-100 text-indigo-800',
  hourly: 'bg-orange-100 text-orange-800',
  reporter: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-700',
}

const empty = { name: '', email: '', password: '', roles: ['viewer'], departmentIds: [] }

function getRoles(member) {
  if (Array.isArray(member.roles)) return member.roles
  if (member.role) return [member.role]
  return ['viewer']
}

// Secondary Firebase app for creating users without signing out current user
function getSecondaryAuth() {
  const config = {
    apiKey: "AIzaSyDAGKw5FHLh_dyDC6dvQeJUzX7Xi34fYWk",
    authDomain: "ishlab-chiqarish-ec750.firebaseapp.com",
    projectId: "ishlab-chiqarish-ec750",
    storageBucket: "ishlab-chiqarish-ec750.firebasestorage.app",
    messagingSenderId: "329770242502",
    appId: "1:329770242502:web:f7bf311986e0478404e2c7",
  }
  const secondaryName = 'factory-secondary'
  const existing = getApps().find(a => a.name === secondaryName)
  const app = existing || initializeApp(config, secondaryName)
  return getAuth(app)
}

export default function Members() {
  const { userDoc, can } = useAuth()
  const { departments } = useDepartments()
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

  const toggleRole = (roleId) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(roleId)
        ? f.roles.filter(r => r !== roleId)
        : [...f.roles, roleId],
    }))
  }

  const toggleDept = (deptId) => {
    setForm(f => ({
      ...f,
      departmentIds: f.departmentIds.includes(deptId)
        ? f.departmentIds.filter(d => d !== deptId)
        : [...f.departmentIds, deptId],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    if (form.roles.length === 0) { setError("Kamida bitta rol tanlang"); return }
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
          roles: form.roles,
          departmentIds: form.departmentIds,
          createdAt: serverTimestamp(),
        })

        // Also create pending in case needed
        const emailKey = form.email.trim().replace(/[.@]/g, '_')
        await setDoc(doc(db, 'factory_pending', emailKey), {
          name: form.name.trim(),
          roles: form.roles,
        })
      } else {
        await setDoc(doc(db, 'factory_users', modal.id), {
          name: form.name.trim(),
          roles: form.roles,
          departmentIds: form.departmentIds,
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
            roles: form.roles,
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

  const handleToggleDisabled = async (member) => {
    if (member.email === userDoc?.email) { alert("O'z akkauntingizni bloklaya olmaysiz"); return }
    const newDisabled = !member.disabled
    await setDoc(doc(db, 'factory_users', member.id), { disabled: newDisabled }, { merge: true })
  }

  const handleDelete = async (member) => {
    if (!confirm(`${member.name} ni o'chirishni tasdiqlaysizmi?`)) return
    if (member.email === userDoc?.email) { alert("O'z akkauntingizni o'chira olmaysiz"); return }
    setDeleting(member.id)
    await deleteDoc(doc(db, 'factory_users', member.id))
    setDeleting(null)
  }

  const openEdit = (m) => {
    setForm({ name: m.name, email: m.email, password: '', roles: getRoles(m), departmentIds: m.departmentIds || [] })
    setError('')
    setModal(m)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">A'zolar</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> A'zo qo'shish
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">A'zolar topilmadi</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(member => {
              const memberRoles = getRoles(member)
              return (
                <div key={member.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 ${member.disabled ? 'opacity-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${member.disabled ? 'bg-gray-400' : 'bg-indigo-600'}`}>
                    {member.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm flex items-center gap-2 flex-wrap">
                      {member.name}
                      {member.disabled && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Bloklangan</span>
                      )}
                    </div>
                    {member.departmentIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {member.departmentIds.map(dId => {
                          const d = departments.find(x => x.id === dId)
                          return d ? (
                            <span key={dId} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{d.name}</span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {memberRoles.map(roleId => {
                      const roleInfo = ROLES.find(r => r.id === roleId)
                      const RoleIcon = roleInfo?.icon || Shield
                      return (
                        <div key={roleId} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[roleId] || roleColors.viewer}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo?.label || roleId}
                        </div>
                      )
                    })}
                  </div>
                  {can.manageMembers && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(member)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleDisabled(member)}
                        title={member.disabled ? 'Faollashtirish' : 'Bloklash'}
                        className={`transition-colors ${member.disabled ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-orange-500'}`}
                      >
                        {member.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        disabled={deleting === member.id}
                        className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? "Yangi a'zo" : "A'zoni tahrirlash"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ismi</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ism Familya" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={modal !== 'add'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  placeholder="email@misol.com" />
              </div>
              {modal === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Parol</label>
                  <input type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Kamida 6 belgi" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol va cheklov</label>
                <div className="space-y-2">
                  {ROLES.map(role => {
                    const Icon = role.icon
                    const checked = form.roles.includes(role.id)
                    return (
                      <label key={role.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(role.id)}
                          className="accent-indigo-600 w-4 h-4"
                        />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bo'limlar <span className="text-gray-400 font-normal text-xs">(bo'sh = barchasi)</span>
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {departments.map(dept => {
                    const checked = form.departmentIds.includes(dept.id)
                    return (
                      <label key={dept.id} className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-colors ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDept(dept.id)}
                          className="accent-indigo-600 w-4 h-4"
                        />
                        <span className="text-sm text-gray-800">{dept.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer buttons - always visible */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim() || form.roles.length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
