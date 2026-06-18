import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Truck, Factory, ChevronRight, Phone } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { getData, saveData, generateId } from '../store/storage'
import { calcDebt } from '../store/hamkorlar'
import { fmtCur } from '../utils/format'

const TYPES = {
  'yetkazib-beruvchilar': { label: 'Yetkazib beruvchilar', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'ishlab-chiqaruvchilar': { label: 'Ishlab chiqaruvchilar', icon: Factory, color: 'text-purple-400', bg: 'bg-purple-500/20' },
}

export default function HamkorlarList() {
  const { type } = useParams()
  const nav = useNavigate()
  const { user } = useApp()
  const uid = user?.id
  const meta = TYPES[type]

  const [list, setList] = useState([])
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const load = () => {
    const all = getData('hamkorlar', uid)
    setList(all.filter(h => h.type === type))
  }

  useEffect(() => { if (uid) load() }, [uid, type])

  const handleAdd = () => {
    if (!name.trim()) return
    const all = getData('hamkorlar', uid)
    const hamkor = { id: generateId(), type, name: name.trim(), phone: phone.trim(), createdAt: new Date().toISOString(), entries: [] }
    saveData('hamkorlar', uid, [...all, hamkor])
    setName(''); setPhone(''); setModal(false)
    load()
  }

  const Icon = meta?.icon || Truck

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => nav('/hamkorlar')} className="text-gray-400 active:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">{meta?.label}</h1>
        </div>

        <div className="px-4 flex flex-col gap-3 mt-2">
          {list.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Icon size={40} className="mx-auto mb-3 opacity-30" />
              <p>Hali hamkor qo'shilmagan</p>
            </div>
          )}
          {list.map(h => {
            const debt = calcDebt(h.entries)
            return (
              <button
                key={h.id}
                onClick={() => nav(`/hamkorlar/${type}/${h.id}`)}
                className="flex items-center gap-3 bg-gray-800 rounded-2xl p-4 w-full text-left active:scale-95 transition-transform"
              >
                <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{h.name}</p>
                  {h.phone && (
                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                      <Phone size={10} />{h.phone}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {debt > 0 ? `${fmtCur(debt, 'UZS')}` : 'Qarz yo\'q'}
                  </p>
                  {debt > 0 && <p className="text-gray-500 text-xs">qarz</p>}
                </div>
                <ChevronRight size={16} className="text-gray-600 ml-1" />
              </button>
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

      {/* Add modal */}
      <Modal open={modal} onClose={() => { setModal(false); setName(''); setPhone('') }} title="Yangi hamkor qo'shish">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Ism *</label>
            <input
              className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none"
              placeholder="Hamkor ismi"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Telefon (ixtiyoriy)</label>
            <input
              className="w-full bg-gray-700 text-white rounded-xl px-3 py-3 outline-none"
              placeholder="+998 90 000 00 00"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold mt-1"
          >
            Qo'shish
          </button>
        </div>
      </Modal>
    </div>
  )
}
