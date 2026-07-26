import { useEffect, useState, useRef } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy, getDocs, where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Pencil, Trash2, X, Check, Package, Archive, RotateCcw, ChevronUp, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { computeOrderChain, forecastOrder } from '../utils/orderProgress'

const RULE_LABEL = { min: 'eng kam', sum: "yig'indi", mirror: 'nusxa' }

export default function Orders() {
  const { can, userDoc } = useAuth()
  const { departments, getDeptName } = useDepartments()
  const visibleDepts = can.manageMembers || !userDoc?.departmentIds?.length
    ? departments
    : departments.filter(d => userDoc.departmentIds.includes(d.id))
  const canManage = can.manageOperations

  const [orders, setOrders] = useState([])
  const [filterStatus, setFilterStatus] = useState('active') // 'active' | 'archived'
  const [filterDept, setFilterDept] = useState('all') // 'all' | departmentId
  const [modal, setModal] = useState(null) // null | 'add' | {order}
  const [form, setForm] = useState({ name: '', quantity: '', departmentId: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(null)
  const reorderingRef = useRef(false)
  // Zanjir kartasi (progress)
  const [opById, setOpById] = useState({})
  const [expanded, setExpanded] = useState(null)   // ochilgan buyurtma id
  const [chains, setChains] = useState({})         // { orderId: hisoblangan natija }
  const [chainLoading, setChainLoading] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'factory_orders'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  // Operatsiyalar (isFinal/isFirst) — bir marta
  useEffect(() => {
    getDocs(collection(db, 'factory_operations')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { const o = d.data(); map[d.id] = { isFinal: !!o.isFinal, isFirst: !!o.isFirst, departmentId: o.departmentId, name: o.name, order: o.order ?? Infinity } })
      setOpById(map)
    })
  }, [])

  const toggleExpand = async (order) => {
    if (expanded === order.id) { setExpanded(null); return }
    setExpanded(order.id)
    if (chains[order.id]) return // keshda bor
    setChainLoading(order.id)
    try {
      const [snap, autoSnap] = await Promise.all([
        getDocs(query(collection(db, 'factory_work_entries'), where('orderId', '==', order.id))),
        getDocs(query(collection(db, 'factory_work_entries'), where('orderId', '==', 'auto'))),
      ])
      const entries = snap.docs.map(d => d.data())
      const autoEntries = autoSnap.docs.map(d => d.data())
      const result = computeOrderChain(order, entries, opById, departments, { autoEntries, allOrders: orders })
      setChains(c => ({ ...c, [order.id]: result }))
    } catch (e) {
      setChains(c => ({ ...c, [order.id]: { error: e.message } }))
    }
    setChainLoading(null)
  }

  const openAdd = () => {
    setForm({ name: '', quantity: '', departmentId: visibleDepts[0]?.id || '' })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (order) => {
    setForm({ name: order.name, quantity: order.quantity ?? '', departmentId: order.departmentId || '' })
    setSaveError('')
    setModal(order)
  }
  const closeModal = () => { setModal(null); setSaveError('') }

  const handleSave = async () => {
    if (!form.name.trim() || !form.quantity || !form.departmentId) {
      setSaveError('Nomi, miqdor va bo\'lim kiritilishi shart')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const data = {
        name: form.name.trim(),
        quantity: Number(form.quantity),
        departmentId: form.departmentId,
      }
      if (modal === 'add') {
        // Navbat: eng katta order + 1 (oxiriga qo'shiladi — FIFO)
        const maxOrder = orders.reduce((m, o) => Math.max(m, o.order ?? 0), 0)
        await addDoc(collection(db, 'factory_orders'), {
          ...data,
          order: maxOrder + 1,
          status: 'active',   // holat: keyingi bosqichda avto hisoblanadi
          isActive: true,
          createdAt: serverTimestamp(),
        })
      } else {
        await updateDoc(doc(db, 'factory_orders', modal.id), data)
      }
      closeModal()
    } catch (err) {
      setSaveError(err.message || 'Xatolik yuz berdi')
    }
    setSaving(false)
  }

  const handleArchive = async (id) => {
    if (!confirm('Buyurtmani arxivlaysizmi?')) return
    await updateDoc(doc(db, 'factory_orders', id), { isActive: false })
  }
  const handleRestore = async (id) => {
    await updateDoc(doc(db, 'factory_orders', id), { isActive: true })
  }
  const handleDelete = async (id) => {
    if (!confirm('Buyurtmani butunlay o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi.')) return
    setDeleting(id)
    await deleteDoc(doc(db, 'factory_orders', id))
    setDeleting(null)
  }

  const reorder = async (order, dir) => {
    if (reorderingRef.current) return
    reorderingRef.current = true
    const list = orders
      .filter(o => o.isActive !== false)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    const idx = list.findIndex(o => o.id === order.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) { reorderingRef.current = false; return }
    setReordering(order.id)
    await Promise.all(list.map((o, i) => {
      if (o.id === order.id) return updateDoc(doc(db, 'factory_orders', o.id), { order: swapIdx })
      if (i === swapIdx)     return updateDoc(doc(db, 'factory_orders', o.id), { order: idx })
      if (o.order == null)   return updateDoc(doc(db, 'factory_orders', o.id), { order: i })
      return Promise.resolve()
    }))
    setReordering(null)
    reorderingRef.current = false
  }

  const filtered = orders
    .filter(o => filterStatus === 'active' ? o.isActive !== false : o.isActive === false)
    .filter(o => filterDept === 'all' ? true : o.departmentId === filterDept)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))

  const activeCount = orders.filter(o => o.isActive !== false).length
  const archivedCount = orders.filter(o => o.isActive === false).length
  // Har bo'lim uchun buyurtma soni (chip yonida ko'rsatiladi)
  const deptCount = (dId) => orders.filter(o =>
    (filterStatus === 'active' ? o.isActive !== false : o.isActive === false) && o.departmentId === dId
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-700" />
          <h1 className="text-xl font-bold text-gray-800">Buyurtmalar</h1>
        </div>
        {canManage && filterStatus === 'active' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Buyurtma qo'shish
          </button>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Faol ({activeCount})
        </button>
        <button
          onClick={() => setFilterStatus('archived')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Arxivlangan ({archivedCount})
        </button>
      </div>

      {/* Bo'lim bo'yicha filtr — har bo'lim o'z kirim qilgan buyurtmalarini ko'radi */}
      {visibleDepts.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilterDept('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === 'all' ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Barchasi
          </button>
          {visibleDepts.map(d => (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterDept === d.id ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d.name} ({deptCount(d.id)})
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {filterStatus === 'archived' ? 'Arxivlangan buyurtmalar yo\'q' : 'Hozircha buyurtma yo\'q'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((order, i) => {
              const chain = chains[order.id]
              const isOpen = expanded === order.id
              return (
              <div key={order.id}>
              <div className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50 ${filterStatus === 'archived' ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleExpand(order)} className="text-gray-400 hover:text-indigo-600 shrink-0" title="Zanjir kartasi">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <span className="text-xs text-gray-400 w-5 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(order)}>
                  <div className="text-sm font-medium text-gray-800">{order.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      {Number(order.quantity).toLocaleString()} dona
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {getDeptName(order.departmentId)}
                    </span>
                    {chain && !chain.error ? (
                      chain.done
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✅ Bajarildi</span>
                        : <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Jarayonda {chain.percent}%</span>
                    ) : (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Jarayonda</span>
                    )}
                  </div>
                </div>

                {canManage && filterStatus === 'active' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {filterDept === 'all' && (
                      <div className="flex flex-col">
                        <button onClick={() => reorder(order, 'up')} disabled={reordering === order.id || i === 0} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => reorder(order, 'down')} disabled={reordering === order.id || i === filtered.length - 1} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                    )}
                    <button onClick={() => openEdit(order)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleArchive(order.id)} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"><Archive className="w-4 h-4" /></button>
                  </div>
                )}
                {canManage && filterStatus === 'archived' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleRestore(order.id)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(order.id)} disabled={deleting === order.id} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-gray-50/70 border-t border-gray-100">
                  {chainLoading === order.id ? (
                    <div className="py-4 text-center text-xs text-gray-400">Hisoblanmoqda...</div>
                  ) : chain?.error ? (
                    <div className="py-4 text-center text-xs text-red-500">Xatolik: {chain.error}</div>
                  ) : chain ? (
                    <div className="pt-2">
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Tayyor mahsulot: <b className="text-gray-700">{chain.doneQty.toLocaleString()}</b> / {chain.orderQty.toLocaleString()}</span>
                          <span className={chain.done ? 'text-green-700 font-bold' : 'text-amber-700 font-semibold'}>{chain.percent}%{chain.done ? ' ✅' : ''}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${chain.done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(chain.percent, 100)}%` }} />
                        </div>
                        {(() => {
                          const f = forecastOrder(order, chain.doneQty)
                          if (!f || f.done) return null
                          return (
                            <div className="text-xs text-gray-500 mt-1.5">
                              📈 Taxminan: <b className="text-gray-700">{f.date}</b> ({f.daysLeft} kun · ~{f.rate.toLocaleString()} dona/kun)
                            </div>
                          )
                        })()}
                      </div>
                      {chain.depts.length === 0 ? (
                        <div className="text-xs text-gray-400 py-2">Bu buyurtma bo'yicha hali ish kiritilmagan</div>
                      ) : (
                        <div className="space-y-1.5">
                          {chain.depts.map(d => (
                            <div key={d.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-700">
                                  {d.name}
                                  {d.rule !== 'order' && <span className="text-xs text-gray-400 ml-1">({RULE_LABEL[d.rule] || d.rule})</span>}
                                </span>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-blue-700">Kirim: <b>{d.kirim.toLocaleString()}</b></span>
                                  <span className="text-green-700">Chiqim: <b>{d.chiqim.toLocaleString()}</b></span>
                                  <span className={d.qoldiq > 0 ? 'text-amber-700' : 'text-gray-400'}>Qoldiq: <b>{d.qoldiq.toLocaleString()}</b></span>
                                </div>
                              </div>
                              {d.bottleneck && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Tiqilish: <b>{d.bottleneck.name}</b> ({d.bottleneck.qty.toLocaleString()}) — eng kam yetkazyapti
                                </div>
                              )}
                              {d.opBottleneck && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Operatsiya tiqilishi: <b>{d.opBottleneck.name}</b> ({d.opBottleneck.qty.toLocaleString()})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">
                {modal === 'add' ? 'Yangi buyurtma' : 'Buyurtmani tahrirlash'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-xs">{saveError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Buyurtma nomi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Masalan: Ko'k ko'ylak"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Miqdor (dona)</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bo'lim</label>
                <select
                  value={form.departmentId}
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Tanlang —</option>
                  {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Bekor</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.quantity || !form.departmentId}
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
