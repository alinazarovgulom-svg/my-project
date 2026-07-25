import { useState } from 'react'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react'

export default function Departments() {
  const { departments, addDept, updateDept, deleteDept } = useDepartments()
  const { can } = useAuth()
  const [modal, setModal] = useState(null) // null | 'add' | { id, name }
  const [name, setName] = useState('')
  const [threadId, setThreadId] = useState('')
  const [chainMode, setChainMode] = useState('order')   // 'order' = buyurtmadan | 'from' = boshqa bo'limlardan
  const [chainSources, setChainSources] = useState([])   // manba bo'lim id'lari
  const [chainRule, setChainRule] = useState('min')      // 'mirror' | 'min' | 'sum'
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')

  const openAdd = () => {
    setName(''); setThreadId(''); setChainMode('order'); setChainSources([]); setChainRule('min')
    setError(''); setModal('add')
  }
  const openEdit = (dept) => {
    setName(dept.name)
    setThreadId(dept.telegramThreadId ?? '')
    const ci = dept.chainInput || {}
    setChainMode(ci.mode || 'order')
    setChainSources(ci.sources || [])
    setChainRule(ci.rule || 'min')
    setError('')
    setModal(dept)
  }
  const closeModal = () => { setModal(null); setError('') }

  const toggleSource = (id) => {
    setChainSources(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const handleSave = async () => {
    if (!name.trim()) { setError("Bo'lim nomi kiritilmadi"); return }
    if (modal !== 'add' && chainMode === 'from' && chainSources.length === 0) {
      setError('Kirim manbai bo\'lim(lar)ini tanlang')
      return
    }
    setSaving(true)
    try {
      if (modal === 'add') {
        await addDept(name)
      } else {
        const chainInput = chainMode === 'from'
          ? { mode: 'from', sources: chainSources.filter(id => id !== modal.id), rule: chainRule }
          : { mode: 'order' }
        await updateDept(modal.id, {
          name: name.trim(),
          telegramThreadId: threadId.trim() === '' ? null : Number(threadId.trim()),
          chainInput,
        })
      }
      closeModal()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (dept) => {
    if (!confirm(`"${dept.name}" ni o'chirishni tasdiqlaysizmi?`)) return
    setDeleting(dept.id)
    await deleteDept(dept.id)
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Bo'limlar</h1>
        {can.manageMembers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Bo'lim qo'shish
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Bo'limlar topilmadi</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {departments.map((dept, i) => (
              <div key={dept.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-indigo-700" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">{dept.name}</div>
                </div>
                {can.manageMembers && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(dept)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      disabled={deleting === dept.id}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? "Yangi bo'lim" : "Bo'limni tahrirlash"}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim nomi</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Masalan: Tikuv bo'limi"
                autoFocus
              />
            </div>

            {modal !== 'add' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telegram mavzu ID <span className="text-gray-400 font-normal">— ixtiyoriy</span>
                </label>
                <input
                  type="number"
                  value={threadId}
                  onChange={e => setThreadId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: 1015"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Hisobot shu mavzuga boradi. Mavzu havolasidagi oxirgi raqam (t.me/c/.../<b>1015</b>). Bo'sh = asosiy guruh.
                </p>
              </div>
            )}

            {modal !== 'add' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Zanjir — kirim manbai</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="chainMode" checked={chainMode === 'order'} onChange={() => setChainMode('order')} className="accent-indigo-600" />
                    Buyurtmadan (mustaqil) — masalan Kamzul, Shim, Tana
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" name="chainMode" checked={chainMode === 'from'} onChange={() => setChainMode('from')} className="accent-indigo-600" />
                    Boshqa bo'lim(lar)dan
                  </label>
                </div>

                {chainMode === 'from' && (
                  <div className="mt-3 pl-1 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Manba bo'lim(lar):</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2">
                        {departments.filter(d => d.id !== modal.id).map(d => (
                          <label key={d.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 py-0.5">
                            <input type="checkbox" checked={chainSources.includes(d.id)} onChange={() => toggleSource(d.id)} className="accent-indigo-600" />
                            {d.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Qoida:</p>
                      <select
                        value={chainRule}
                        onChange={e => setChainRule(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="mirror">Nusxa (manba kirimi bilan bir xil — tarqalish, masalan Astar, Yeng)</option>
                        <option value="min">Eng kam (manbalar chiqimi minimumi — masalan Montaj)</option>
                        <option value="sum">Yig'indi (manbalar chiqimi yig'indisi)</option>
                      </select>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">Buyurtma miqdori shu qoida bo'yicha bo'limlar bo'ylab tarqaladi.</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Bekor
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
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
