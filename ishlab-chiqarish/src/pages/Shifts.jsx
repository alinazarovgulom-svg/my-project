import { useEffect, useState } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2, Check, X, Clock, Star } from 'lucide-react'

export default function Shifts() {
  const { can } = useAuth()
  const [shifts, setShifts] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', slots: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'factory_shifts'), snap => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const openAdd = () => {
    setForm({ name: '', slots: [{ startTime: '08:00', endTime: '09:00', breakMinutes: 0 }] })
    setModal('add')
  }

  const openEdit = (shift) => {
    setForm({ name: shift.name, slots: [...(shift.slots || [])] })
    setModal(shift)
  }

  const addSlot = () => {
    setForm(f => ({ ...f, slots: [...f.slots, { startTime: '', endTime: '', breakMinutes: 0 }] }))
  }

  const removeSlot = (i) => {
    setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }))
  }

  const updateSlot = (i, field, value) => {
    setForm(f => ({
      ...f,
      slots: f.slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || form.slots.length === 0) return
    setSaving(true)
    const data = {
      name: form.name.trim(),
      slots: form.slots.filter(s => s.startTime && s.endTime),
    }
    if (modal === 'add') {
      await addDoc(collection(db, 'factory_shifts'), {
        ...data,
        isActive: shifts.length === 0,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'factory_shifts', modal.id), data)
    }
    setSaving(false)
    setModal(null)
  }

  const handleSetActive = async (shift) => {
    await Promise.all(
      shifts.map(s => updateDoc(doc(db, 'factory_shifts', s.id), { isActive: s.id === shift.id }))
    )
  }

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    await deleteDoc(doc(db, 'factory_shifts', id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Smena jadvallari</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Jadval qo'shish
          </button>
        )}
      </div>

      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center text-gray-400 text-sm">
          Smena jadvali qo'shilmagan
        </div>
      ) : (
        <div className="space-y-4">
          {shifts.map(shift => (
            <div key={shift.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${shift.isActive ? 'border-blue-300' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{shift.name}</span>
                  {shift.isActive && (
                    <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-blue-600" /> Faol
                    </span>
                  )}
                </div>
                {can.manageMembers && (
                  <div className="flex gap-2">
                    {!shift.isActive && (
                      <button
                        onClick={() => handleSetActive(shift)}
                        className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Faol qilish
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(shift)}
                      className="text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      O'chirish
                    </button>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {(shift.slots || []).map((slot, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {slot.startTime}–{slot.endTime}
                    {slot.breakMinutes > 0 && (
                      <span className="text-orange-500 ml-0.5">⏸{slot.breakMinutes}'</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi jadval' : 'Jadvalni tahrirlash'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jadval nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masalan: Yozgi jadval"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Vaqt oralig'lari
                  </label>
                  <button
                    onClick={addSlot}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Qo'shish
                  </button>
                </div>
                <div className="text-xs text-gray-400 mb-3">Boshlanish · Tugash · Tanaffus (daq.)</div>
                <div className="space-y-2">
                  {form.slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateSlot(i, 'startTime', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                      />
                      <span className="text-gray-400">–</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateSlot(i, 'endTime', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                      />
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={slot.breakMinutes || ''}
                        onChange={e => updateSlot(i, 'breakMinutes', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-16 text-center"
                        placeholder="0"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || form.slots.length === 0}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
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
