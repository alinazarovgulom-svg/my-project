import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, ChevronRight, Phone, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { generateId } from '../store/storage'
import { calcDebtByCurrency, getSections, getPartners, savePartners } from '../store/hamkorlar'
import { fmtCur } from '../utils/format'

export default function HamkorlarList() {
  const { sectionId } = useParams()
  const nav = useNavigate()
  const { user } = useApp()
  const uid = user?.id

  const [section, setSection] = useState(null)
  const [list, setList] = useState([])
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const load = () => {
    setSection(getSections(uid).find(s => s.id === sectionId) || null)
    setList(getPartners(uid).filter(h => h.sectionId === sectionId))
  }

  useEffect(() => { if (uid) load() }, [uid, sectionId])

  const handleAdd = () => {
    if (!name.trim()) return
    const hamkor = { id: generateId(), sectionId, name: name.trim(), phone: phone.trim(), createdAt: new Date().toISOString(), entries: [] }
    savePartners(uid, [...getPartners(uid), hamkor])
    setName(''); setPhone(''); setModal(false)
    load()
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        <div className="sticky top-0 z-10 page-bg px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => nav('/hamkorlar')} className="text-gray-400 active:opacity-70">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[18px] font-black flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{section?.name || 'Hamkorlar'}</h1>
        </div>

        <div className="px-4 flex flex-col gap-3 mt-2">
          {list.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Hali hamkor qo'shilmagan</p>
            </div>
          )}
          {list.map(h => {
            const debts = calcDebtByCurrency(h.entries || [])
            const hasDebt = debts.some(d => d.val > 0)
            const allPaid = debts.length === 0 || debts.every(d => d.val <= 0)
            return (
              <button
                key={h.id}
                onClick={() => nav(`/hamkorlar/${sectionId}/${h.id}`)}
                className="flex items-center gap-3 rounded-2xl p-4 w-full text-left active:scale-95 transition-transform" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-base">{h.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                  {h.phone && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Phone size={10} />{h.phone}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {allPaid ? (
                    <p className="text-sm font-bold text-green-400">Qarz yo'q</p>
                  ) : (
                    debts.filter(d => d.val > 0).map(({ cur, val }) => (
                      <p key={cur} className="text-sm font-bold text-red-400 leading-tight">
                        {fmtCur(val, cur)} <span className="text-xs font-normal opacity-70">{cur}</span>
                      </p>
                    ))
                  )}
                  {hasDebt && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>qarz</p>}
                </div>
                <ChevronRight size={16} className="ml-1" style={{ color: 'var(--text-muted)' }} />
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

      <Modal open={modal} onClose={() => { setModal(false); setName(''); setPhone('') }} title="Yangi hamkor qo'shish">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Ism *</label>
            <input
              className="input-field"
              placeholder="Hamkor ismi"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Telefon (ixtiyoriy)</label>
            <input
              className="input-field"
              placeholder="+998 90 000 00 00"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold mt-1">
            Qo'shish
          </button>
        </div>
      </Modal>
    </div>
  )
}
