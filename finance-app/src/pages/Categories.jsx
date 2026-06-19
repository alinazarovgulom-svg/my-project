import { useState } from 'react'
import { Trash2, Plus, Pencil, Check, X } from 'lucide-react'
import { useApp } from '../store/AppContext'

export default function Categories() {
  const { categories, saveCategories } = useApp()
  const [newCat, setNewCat] = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = () => {
    const trimmed = newCat.trim()
    if (!trimmed || categories.includes(trimmed)) return
    saveCategories([...categories, trimmed])
    setNewCat('')
  }

  const handleDelete = (cat) => {
    if (!confirm(`"${cat}" o'chirilsinmi?`)) return
    saveCategories(categories.filter(c => c !== cat))
  }

  const startEdit = (i) => { setEditingIdx(i); setEditValue(categories[i]) }

  const saveEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed || (categories.includes(trimmed) && categories[editingIdx] !== trimmed)) {
      setEditingIdx(null); return
    }
    const updated = [...categories]
    updated[editingIdx] = trimmed
    saveCategories(updated)
    setEditingIdx(null)
  }

  const handleReset = () => {
    if (confirm('Barcha kategoriyalarni tozalaysizmi?')) saveCategories([])
  }

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4 page-animate">
      <h1 className="text-xl font-bold text-white">Kategoriyalar</h1>

      <div className="card flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Yangi kategoriya nomi..."
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 active:opacity-80">
          <Plus size={20} />
        </button>
      </div>

      <div className="card flex flex-col gap-0 p-0 overflow-hidden">
        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">Kategoriyalar yo'q</p>
        ) : (
          categories.map((cat, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-white/5 mx-4" />}
              <div className="flex items-center gap-2 px-4 py-3">
                {editingIdx === i ? (
                  <>
                    <input
                      className="input-field flex-1 py-1.5 text-sm"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIdx(null) }}
                      autoFocus
                    />
                    <button onClick={saveEdit} className="p-1.5 rounded-lg bg-green-500/20 text-green-400 active:opacity-70"><Check size={14} /></button>
                    <button onClick={() => setEditingIdx(null)} className="p-1.5 rounded-lg bg-dark-600 text-gray-500 active:opacity-70"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-white text-sm">{cat}</span>
                    <button onClick={() => startEdit(i)} className="p-1.5 rounded-lg bg-dark-600 text-gray-500 active:text-blue-400"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg bg-dark-600 text-gray-500 active:text-red-400"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
