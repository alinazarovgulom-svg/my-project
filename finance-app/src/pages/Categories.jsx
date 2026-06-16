import { useState, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useApp } from '../store/AppContext'

const DEFAULT_CATEGORIES = ['Maosh', 'Oziq-ovqat', 'Transport', 'Kommunal', 'Kiyim', "Sog'liq", "Ta'lim", "Do'st/Oila", 'Biznes', 'Boshqa']

export default function Categories() {
  const { user } = useApp()
  const storageKey = `finance_${user?.id}_categories`

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`finance_${user?.id}_categories`)
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
    } catch { return DEFAULT_CATEGORIES }
  })
  const [newCat, setNewCat] = useState('')

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(categories))
  }, [categories, storageKey])

  const handleAdd = () => {
    const trimmed = newCat.trim()
    if (!trimmed || categories.includes(trimmed)) return
    setCategories([...categories, trimmed])
    setNewCat('')
  }

  const handleDelete = (cat) => {
    if (DEFAULT_CATEGORIES.includes(cat)) {
      if (!confirm(`"${cat}" standart kategoriya. O'chirishni tasdiqlaysizmi?`)) return
    }
    setCategories(categories.filter(c => c !== cat))
  }

  const handleReset = () => {
    if (confirm('Barcha kategoriyalarni standartga qaytarasizmi?')) {
      setCategories(DEFAULT_CATEGORIES)
    }
  }

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4">
      <h1 className="text-xl font-bold text-white">Kategoriyalar</h1>

      {/* Add new */}
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

      {/* Category list */}
      <div className="card flex flex-col gap-0 p-0 overflow-hidden">
        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">Kategoriyalar yo'q</p>
        ) : (
          categories.map((cat, i) => (
            <div key={cat}>
              {i > 0 && <div className="h-px bg-white/5 mx-4" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-white text-sm">{cat}</span>
                <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg bg-dark-600 text-gray-500 active:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={handleReset} className="text-gray-500 text-sm text-center underline">
        Standartga qaytarish
      </button>
    </div>
  )
}
