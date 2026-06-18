import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ChevronRight, Phone } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { getHamkorlar, saveHamkorlar, addHamkor, deleteHamkor, getPartnerDebt } from '../store/hamkorlarStorage'
import { fmtCur } from '../utils/format'

const fmt = (n, cur) => fmtCur(n, cur || 'UZS')

export default function HamkorlarList() {
  const navigate = useNavigate()
  const { type } = useParams() // 'yetkazib-beruvchilar' or 'ishlab-chiqaruvchilar'
  const { user } = useApp()

  const partnerType = type === 'yetkazib-beruvchilar' ? 'yetkazib-beruvchi' : 'ishlab-chiqaruvchi'
  const title = type === 'yetkazib-beruvchilar' ? 'Yetkazib beruvchilar' : 'Ishlab chiqaruvchilar'

  const [partners, setPartners] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })

  const loadPartners = () => {
    if (!user?.id) return
    const all = getHamkorlar(user.id)
    setPartners(all.filter(p => p.type === partnerType))
  }

  useEffect(() => {
    loadPartners()
  }, [user?.id, partnerType])

  const handleAdd = () => {
    if (!form.name.trim()) return
    addHamkor(user.id, { type: partnerType, name: form.name.trim(), phone: form.phone.trim() })
    setForm({ name: '', phone: '' })
    setModal(false)
    loadPartners()
  }

  const handleDelete = (id) => {
    if (confirm('O\'chirishni tasdiqlaysizmi?')) {
      deleteHamkor(user.id, id)
      loadPartners()
    }
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate('/hamkorlar')} className="p-2 rounded-xl bg-dark-700 text-gray-400 active:opacity-70">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </div>
          <p className="text-gray-500 text-sm ml-11">{partners.length} ta hamkor</p>
        </div>

        <div className="px-4 flex flex-col gap-2 mt-1">
          {partners.length === 0 ? (
            <div className="card text-center py-10 mt-4">
              <p className="text-gray-500">Hamkorlar yo'q</p>
              <p className="text-gray-600 text-sm mt-1">+ tugmasi orqali qo'shing</p>
            </div>
          ) : (
            partners.map(p => {
              const debt = getPartnerDebt(p)
              return (
                <button
                  key={p.id}
                  className="card flex items-center gap-3 active:opacity-80 text-left w-full"
                  onClick={() => navigate(`/hamkorlar/${type}/${p.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{p.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{p.name}</p>
                    {p.phone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-gray-500" />
                        <span className="text-gray-500 text-xs">{p.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {debt > 0 ? fmt(debt, 'UZS') : '✓'}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p.id) }}
                      className="p-1.5 rounded-lg bg-dark-600 text-gray-500 active:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* FAB — outside page-animate */}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:opacity-80"
      >
        <Plus size={24} />
      </button>

      <Modal open={modal} onClose={() => setModal(false)} title="Hamkor qo'shish">
        <div className="flex flex-col gap-3 pb-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nomi *</label>
            <input
              className="input-field"
              placeholder="Hamkor nomi..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Telefon (ixtiyoriy)</label>
            <input
              className="input-field"
              placeholder="+998 ..."
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary mt-2">Saqlash</button>
        </div>
      </Modal>
    </div>
  )
}
