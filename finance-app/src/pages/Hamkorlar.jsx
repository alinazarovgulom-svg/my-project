import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Users, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { generateId } from '../store/storage'
import { getSections, saveSections, getPartners, savePartners, loadHamkorlarFromCloud } from '../store/hamkorlar'

const COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-green-500/20', text: 'text-green-400' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
]

export default function Hamkorlar() {
  const nav = useNavigate()
  const { user } = useApp()
  const uid = user?.id

  const [sections, setSections] = useState([])
  const [modal, setModal] = useState(false)
  const [sectionName, setSectionName] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const loadSections = () => setSections(getSections(uid))

  useEffect(() => {
    if (!uid) return
    loadSections()
    loadHamkorlarFromCloud(uid).then(() => loadSections())
  }, [uid])

  const handleAdd = () => {
    if (!sectionName.trim()) return
    const colorIdx = sections.length % COLORS.length
    const section = { id: generateId(), name: sectionName.trim(), colorIdx, createdAt: new Date().toISOString() }
    saveSections(uid, [...sections, section])
    setSectionName('')
    setModal(false)
    loadSections()
  }

  const handleDelete = (id) => {
    saveSections(uid, sections.filter(s => s.id !== id))
    savePartners(uid, getPartners(uid).filter(p => p.sectionId !== id))
    setDeleteId(null)
    loadSections()
  }

  const partnerCount = (sectionId) => getPartners(uid).filter(p => p.sectionId === sectionId).length

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Hamkorlar</h1>
        </div>

        <div className="px-4 flex flex-col gap-3">
          {sections.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Hali bo'lim qo'shilmagan</p>
              <p className="text-sm mt-1 text-gray-600">+ tugmasi orqali bo'lim yarating</p>
            </div>
          )}
          {sections.map(s => {
            const c = COLORS[s.colorIdx % COLORS.length]
            const count = partnerCount(s.id)
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}>
                <button
                  onClick={() => nav(`/hamkorlar/${s.id}`)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                    <Users size={20} className={c.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{count} ta hamkor</p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button
                  onClick={() => setDeleteId(s.id)}
                  className="text-gray-600 active:text-red-400 p-1 ml-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* Add section modal */}
      <Modal open={modal} onClose={() => { setModal(false); setSectionName('') }} title="Yangi bo'lim qo'shish">
        <div className="flex flex-col gap-3">
          <input
            className="w-full rounded-xl px-3 py-3 outline-none input-field"
            placeholder="Bo'lim nomi (masalan: Yetkazib beruvchilar)"
            value={sectionName}
            onChange={e => setSectionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button onClick={handleAdd} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">
            Qo'shish
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Bo'limni o'chirish">
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Bu bo'lim va undagi barcha hamkorlar o'chib ketadi. Tasdiqlaysizmi?</p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl py-3" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>Bekor</button>
          <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold">O'chirish</button>
        </div>
      </Modal>
    </div>
  )
}
