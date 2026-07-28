import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, onSnapshot, getDocs,
  doc, setDoc, serverTimestamp, documentId,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, Save, CheckCircle, RefreshCw, X, Search, MoreVertical, Send, AlarmClock, UserPlus, AlertTriangle, Package, Plus } from 'lucide-react'
import { buildWorkPDFHtml } from '../utils/pdf'
import { sendHTMLToTelegram, sendTelegramMessage } from '../utils/telegram'
import { fetchOrderSummary } from '../utils/orderReport'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

// Bo'limning zanjir guruhi (chainInput bog'lanishlari bo'ylab bog'langan bo'limlar to'plami).
// Masalan Montaj sources = [Tana,Astar,Yeng] bo'lsa, bu 4 bo'lim bir guruhda; Shim mustaqil.
function chainComponent(startId, departments) {
  const adj = {}
  const link = (a, b) => { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a) }
  departments.forEach(d => (d.chainInput?.sources || []).forEach(s => link(d.id, s)))
  const seen = new Set([startId])
  const stack = [startId]
  while (stack.length) {
    const cur = stack.pop()
    ;(adj[cur] || []).forEach(n => { if (!seen.has(n)) { seen.add(n); stack.push(n) } })
  }
  return seen
}

// Bo'lim uchun Telegram mavzu (forum topic) ID'si — nom/ID bo'yicha moslaydi.
function threadForDept(dept) {
  if (!dept) return undefined
  if (dept.telegramThreadId != null) return dept.telegramThreadId
  const s = `${dept.id || ''} ${dept.name || ''}`.toLowerCase()
  if (s.includes('shim')) return 1014
  if (s.includes('kamzul') || s.includes('камзул')) return 1017
  if (s.includes('tana') || s.includes('astar') || s.includes('montaj') || s.includes('yeng')) return 1015
  return undefined
}

function normStatus(quantity, norm, hours) {
  const expected = norm * hours
  if (!expected || quantity === '' || quantity === null) return 'none'
  const qty = Number(quantity)
  if (qty > expected) return 'above'
  if (qty === expected) return 'equal'
  return 'below'
}

// Xodimning shu operatsiya uchun berilgan sanada amal qiluvchi normasi.
// Shaxsiy norma (customNorms) bo'lsa va sanaga mos kelsa — o'shani, aks holda umumiy normani qaytaradi.
function effectiveNorm(emp, opId, globalNorm, date) {
  const hist = emp?.customNorms?.[opId]
  if (!Array.isArray(hist) || hist.length === 0) return globalNorm
  let best = null
  for (const h of hist) {
    if (h.from <= date && (!best || h.from > best.from)) best = h
  }
  return best ? Number(best.norm) : globalNorm
}

const statusStyle = {
  above: 'bg-green-100 text-green-800 border-green-200',
  equal: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  below: 'bg-red-100 text-red-800 border-red-200',
  none: 'bg-white text-gray-700 border-gray-200',
}

export default function DepartmentWork() {
  const { deptId } = useParams()
  const { user, userDoc, can } = useAuth()
  const { departments } = useDepartments()
  const dept = departments.find(d => d.id === deptId)

  const hasAccess = can.manageMembers || !userDoc?.departmentIds?.length || userDoc.departmentIds.includes(deptId)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [entries, setEntries] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [dirtyEmps, setDirtyEmps] = useState({})
  const [savingAll, setSavingAll] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [overrides, setOverrides] = useState({})
  // Buyurtma tanlash (3-bosqich)
  const [orders, setOrders] = useState([])          // shu bo'limning faol buyurtmalari
  const [defaultOrder, setDefaultOrder] = useState('none') // 'none' | 'auto' | orderId (hamma uchun)
  const [empOrders, setEmpOrders] = useState({})    // { empId: 'none'|'auto'|orderId } — xodim uchun standart
  const [opOrders, setOpOrders] = useState({})      // { empId: { opId: 'none'|'auto'|orderId } } — har operatsiya alohida
  // Bir operatsiyani bir nechta buyurtmага bo'lish: qo'shimcha qatorlar (birinchidan keyingi ulushlar)
  const [opSplits, setOpSplits] = useState({})      // { empId: { opId: [{ quantity, note, orderId }] } }
  const [empTimes, setEmpTimes] = useState({})
  const [timePickerEmp, setTimePickerEmp] = useState(null)
  const [menuEmp, setMenuEmp] = useState(null)
  const [pickerEmp, setPickerEmp] = useState(null)
  const [pickerSel, setPickerSel] = useState([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [search, setSearch] = useState('')
  const [activeShift, setActiveShift] = useState(null)
  const [tgSending, setTgSending] = useState(false)
  const [tgMsg, setTgMsg] = useState('')
  const [emptyWarning, setEmptyWarning] = useState(null) // null | [{id, lastName, firstName}]

  // Guest worker state
  const [guestEmps, setGuestEmps] = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [showGuestPicker, setShowGuestPicker] = useState(false)
  const [guestSearch, setGuestSearch] = useState('')
  const [guestWarning, setGuestWarning] = useState('')
  const [guestNotice, setGuestNotice] = useState('') // ogohlantirish, lekin to'smaydi
  const [pendingGuest, setPendingGuest] = useState(null)
  const [removingGuestId, setRemovingGuestId] = useState(null)

  useEffect(() => {
    getDocs(query(collection(db, 'factory_shifts'), where('isActive', '==', true)))
      .then(snap => {
        if (!snap.empty) {
          const shift = { id: snap.docs[0].id, ...snap.docs[0].data() }
          setActiveShift(shift)
        }
      })
  }, [])

  // Load employees in this dept
  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), where('departmentId', '==', deptId))
    return onSnapshot(q, snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.isActive !== false).sort((a, b) => {
        const aO = a.order ?? Infinity
        const bO = b.order ?? Infinity
        if (aO !== bO) return aO - bO
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz')
      }))
    })
  }, [deptId])

  // Barcha faol buyurtmalar (har bo'lim tanlashi mumkin — zanjirdagi bo'limlar ham, masalan Montaj)
  useEffect(() => {
    getDocs(collection(db, 'factory_orders'))
      .then(snap => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(o => o.isActive !== false)
          .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
        setOrders(list)
      })
      .catch(() => setOrders([]))
  }, [deptId])

  // Load all employees for guest picker
  useEffect(() => {
    getDocs(collection(db, 'factory_employees')).then(snap => {
      setAllEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.isActive !== false))
    })
  }, [])

  // Reset guests when dept changes
  useEffect(() => {
    setGuestEmps([])
  }, [deptId])

  // Load all operations
  useEffect(() => {
    getDocs(collection(db, 'factory_operations')).then(snap => {
      setAllOps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  // Load overrides from localStorage when date or dept changes
  useEffect(() => {
    if (!date) { setOverrides({}); return }
    try {
      const saved = localStorage.getItem(`op_overrides_${deptId}_${date}`)
      setOverrides(saved ? JSON.parse(saved) : {})
    } catch { setOverrides({}) }
  }, [deptId, date])

  // Reset dirty flag and entries when date/time changes
  useEffect(() => {
    setPickerEmp(null)
    setIsDirty(false)
    setEntries({})
    setDirtyEmps({})
    setGuestEmps([])
    setEmpOrders({})
    setOpOrders({})
    setOpSplits({})
  }, [date, startTime, endTime])

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Load existing entries
  useEffect(() => {
    if (!date || !startTime || !endTime) return
    const shiftPrefix = `${date}_${deptId}_${startTime.replace(':','')}_${endTime.replace(':','')}_`
    const q = query(
      collection(db, 'factory_work_entries'),
      where(documentId(), '>=', shiftPrefix),
      where(documentId(), '<', shiftPrefix + ''),
    )
    return onSnapshot(q, snap => {
      const data = {}
      const loadedOrders = {}
      const loadedOpOrders = {}
      const loadedSplits = {}
      let loadedBreak = null
      snap.forEach(d => {
        const { employeeId, operations, breakMinutes: bm, orderId } = d.data()
        data[employeeId] = operations || {}
        // Har operatsiya uchun saqlangan buyurtma (yangi model) + bo'linishlar (allocations)
        const opo = {}
        const splits = {}
        Object.entries(operations || {}).forEach(([opId, v]) => {
          if (v && Array.isArray(v.allocations) && v.allocations.length) {
            // Birinchi ulush — asosiy qator, qolganlari qo'shimcha ("+") qatorlar
            const [first, ...rest] = v.allocations
            opo[opId] = first.orderId == null ? 'none' : first.orderId
            data[employeeId][opId] = { ...v, quantity: first.quantity ?? '', note: first.note ?? v.note ?? '' }
            if (rest.length) splits[opId] = rest.map(a => ({ quantity: a.quantity ?? '', note: a.note ?? '', orderId: a.orderId == null ? 'none' : a.orderId }))
          } else if (v && v.orderId !== undefined) {
            opo[opId] = v.orderId === null ? 'none' : v.orderId
          }
        })
        if (Object.keys(opo).length) loadedOpOrders[employeeId] = opo
        if (Object.keys(splits).length) loadedSplits[employeeId] = splits
        // Eski model: butun yozuv uchun bitta buyurtma (xodim standarti sifatida)
        if (orderId !== undefined && orderId !== null) loadedOrders[employeeId] = orderId
        if (bm !== undefined) loadedBreak = bm
      })
      setEntries(data)
      setEmpOrders(loadedOrders)
      setOpOrders(loadedOpOrders)
      setOpSplits(loadedSplits)
      if (loadedBreak !== null) setBreakMinutes(loadedBreak)
    }, err => {
      console.error('[DepartmentWork] entries onSnapshot error:', err)
    })
  }, [deptId, date, startTime, endTime])

  const setEntryVal = (empId, opId, field, value) => {
    setEntries(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [opId]: { ...prev[empId]?.[opId], [field]: value },
      },
    }))
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  // Bitta operatsiya uchun buyurtma tanlash
  const setOpOrder = (empId, opId, value) => {
    setOpOrders(prev => ({ ...prev, [empId]: { ...prev[empId], [opId]: value } }))
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  // Operatsiyани "+" bilan yana bir buyurtmага bo'lish (qo'shimcha qator)
  const addOpSplit = (empId, opId) => {
    setOpSplits(prev => {
      const cur = prev[empId]?.[opId] || []
      return { ...prev, [empId]: { ...prev[empId], [opId]: [...cur, { quantity: '', note: '', orderId: 'auto' }] } }
    })
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }
  const removeOpSplit = (empId, opId, idx) => {
    setOpSplits(prev => {
      const cur = (prev[empId]?.[opId] || []).filter((_, i) => i !== idx)
      const empMap = { ...prev[empId] }
      if (cur.length) empMap[opId] = cur; else delete empMap[opId]
      return { ...prev, [empId]: empMap }
    })
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }
  const setOpSplitVal = (empId, opId, idx, field, value) => {
    setOpSplits(prev => {
      const cur = (prev[empId]?.[opId] || []).map((l, i) => i === idx ? { ...l, [field]: value } : l)
      return { ...prev, [empId]: { ...prev[empId], [opId]: cur } }
    })
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  // Xodimning barcha operatsiyalari uchun buyurtmani birdaniga belgilash (standart)
  const setEmpOrderAll = (empId, value) => {
    setEmpOrders(o => ({ ...o, [empId]: value }))
    setOpOrders(o => { const n = { ...o }; delete n[empId]; return n }) // op-darajali o'zgarishlarni tozalash
    setSaved(s => ({ ...s, [empId]: false }))
    setDirtyEmps(prev => ({ ...prev, [empId]: true }))
    setIsDirty(true)
  }

  const selectPendingGuest = async (emp) => {
    if (guestEmps.some(e => e.id === emp.id) || employees.some(e => e.id === emp.id)) return
    setGuestNotice('')
    if (date) {
      const snap = await getDocs(query(
        collection(db, 'factory_work_entries'),
        where('employeeId', '==', emp.id),
        where('date', '==', date),
      ))
      const entryWithWork = snap.docs.find(d => {
        if (d.data().departmentId === deptId) return false  // shu bo'limdagi boshqa smena — ruxsat
        const ops = d.data().operations || {}
        return Object.values(ops).some(op => Number(op.quantity || 0) > 0 || (op.note || '').trim())
      })
      if (entryWithWork) {
        // To'smaydi — faqat ogohlantiradi. Xodim bir kunda ikki bo'limda ishlashi mumkin.
        const existingDept = departments.find(d => d.id === entryWithWork.data().departmentId)
        setGuestNotice(`${emp.lastName} ${emp.firstName} bugun ${existingDept?.name || "boshqa bo'limda"} allaqachon ishlagan. Baribir qo'shsangiz bo'ladi.`)
      }
    }
    setPendingGuest(emp)
  }

  const confirmGuest = () => {
    if (!pendingGuest) return
    setPickerSel([])
    setPickerSearch('')
    // Stay in modal, move to ops step
  }

  const addGuestWithOps = () => {
    if (!pendingGuest) return
    setGuestEmps(prev => [...prev, pendingGuest])
    setOverrides(o => ({ ...o, [pendingGuest.id]: pickerSel }))
    setPendingGuest(null)
    setShowGuestPicker(false)
    setGuestSearch('')
    setGuestWarning('')
    setGuestNotice('')
    setPickerSel([])
    setPickerSearch('')
  }

  const removeGuest = (empId) => {
    setGuestEmps(prev => prev.filter(e => e.id !== empId))
    setOverrides(o => { const n = { ...o }; delete n[empId]; return n })
    setEntries(prev => { const n = { ...prev }; delete n[empId]; return n })
  }

  const saveEmployee = async (empId) => {
    setSaving(s => ({ ...s, [empId]: true }))
    const emp = employees.find(e => e.id === empId) || guestEmps.find(e => e.id === empId)
    const isGuest = guestEmps.some(e => e.id === empId)
    const empStart = empTimes[empId]?.startTime || startTime
    const empEnd = empTimes[empId]?.endTime || endTime
    const entryId = `${date}_${deptId}_${startTime.replace(':','')}_${endTime.replace(':','')}_${empId}`
    const normMap = Object.fromEntries(allOps.map(o => [o.id, o.norm || 0]))
    const unitPriceMap = Object.fromEntries(allOps.map(o => [o.id, o.unitPrice || 0]))
    const salaryType = emp?.salaryType || 'hourly'
    const hourlyRate = emp?.hourlyRate || 0
    const empH = getEmpHours(empId)
    const rawOps = entries[empId] || {}
    const norm2order = (v) => (!v || v === 'none') ? null : v
    // Asosiy qator buyurtmasi: op darajasidagi tanlov → xodim standarti → umumiy standart
    const resolveOpOrder = (opId) => norm2order(opOrders[empId]?.[opId] ?? empOrders[empId] ?? defaultOrder)
    const operations = Object.fromEntries(
      Object.entries(rawOps).map(([opId, val]) => {
        const primaryQty = Number(val.quantity || 0)
        const splits = opSplits[empId]?.[opId] || []
        // Operatsiya ulushlari: asosiy qator + "+" bilan qo'shilgan qatorlar
        const allocations = [
          { quantity: primaryQty, orderId: resolveOpOrder(opId), note: val.note || '' },
          ...splits.map(l => ({ quantity: Number(l.quantity || 0), orderId: norm2order(l.orderId), note: l.note || '' })),
        ].filter(a => a.quantity > 0 || (a.note || '').trim())
        const totalQty = allocations.reduce((s, a) => s + Number(a.quantity || 0), 0)
        const unitPrice = unitPriceMap[opId] || 0
        const piecePay = unitPrice * totalQty
        const norm = effectiveNorm(emp, opId, normMap[opId] || 0, date)
        const base = { ...val, quantity: totalQty, norm, expected: norm * empH, unitPrice, piecePay }
        if (splits.length) {
          // Bir nechta buyurtma — ulushlar massivi saqlanadi, orderId noaniq (null)
          return [opId, { ...base, orderId: allocations.length === 1 ? allocations[0].orderId : null, allocations }]
        }
        return [opId, { ...base, orderId: resolveOpOrder(opId) }]
      })
    )
    const totalPiecePay = Object.values(operations).reduce((s, v) => s + (v.piecePay || 0), 0)
    // Guest employees already earn hourly pay in their home department — only piece work counts here
    const hourlyPay = (isGuest || salaryType === 'piece') ? 0 : hourlyRate * empH
    const totalPay = isGuest
      ? (salaryType === 'hourly' ? 0 : totalPiecePay)
      : (salaryType === 'hourly' ? hourlyPay
        : salaryType === 'piece' ? totalPiecePay
        : hourlyPay + totalPiecePay)
    // Buyurtmalar operatsiya darajasida saqlanadi. So'rov (query) uchun yozuvda
    // uch raydigan barcha buyurtma id'lari massivi (orderIds) ham saqlanadi.
    const orderIds = [...new Set(Object.values(operations).flatMap(o =>
      Array.isArray(o.allocations) ? o.allocations.map(a => a.orderId) : [o.orderId]
    ).filter(Boolean))]
    // Eski o'quvchilar uchun: bitta buyurtma bo'lsa o'sha, aks holda null
    const orderId = orderIds.length === 1 ? orderIds[0] : null
    await setDoc(doc(db, 'factory_work_entries', entryId), {
      employeeId: empId,
      departmentId: deptId,
      date,
      startTime: empStart,
      endTime: empEnd,
      breakMinutes,
      operations,
      salaryType,
      hourlyRate,
      totalPay,
      orderId,   // null | 'auto' (FIFO) | buyurtma id (bitta bo'lsa)
      orderIds,  // yozuvdagi barcha buyurtmalar (array-contains so'rovi uchun)
      ...(isGuest && { isGuest: true, homeDepartmentId: emp.departmentId }),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    // TV displey uchun signal — bu bo'limda smena o'zgargani belgilanadi (TV shu orqali yangilanadi)
    setDoc(doc(db, 'factory_updates', deptId), { updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
    setSaving(s => ({ ...s, [empId]: false }))
    setSaved(s => ({ ...s, [empId]: true }))
    setDirtyEmps(prev => ({ ...prev, [empId]: false }))
    setTimeout(() => setSaved(s => ({ ...s, [empId]: false })), 2000)

    if (emp?.telegramId) {
      const opLines = Object.entries(operations).map(([opId, val]) => {
        const op = allOps.find(o => o.id === opId)
        if (!op) return ''
        const qty = Number(val.quantity || 0)
        return `• ${op.name}: ${qty} dona`
      }).filter(Boolean).join('\n')

      let dailyTotalPay = totalPay
      try {
        const todaySnap = await getDocs(query(
          collection(db, 'factory_work_entries'),
          where('date', '==', date)
        ))
        dailyTotalPay = todaySnap.docs
          .filter(d => d.data().employeeId === empId)
          .reduce((s, d) => s + Number(d.data().totalPay || 0), 0)
      } catch (_) {}

      let msg = `👤 <b>${emp.lastName} ${emp.firstName}</b>\n`
      msg += `📅 ${date}, ${empStart}–${empEnd}\n`
      msg += `⏱ Ishlagan: <b>${empH.toFixed(1)} soat</b>\n\n`
      msg += opLines ? opLines + '\n' : ''
      if (dailyTotalPay > 0) msg += `\n💰 Bugungi jami maosh: <b>${dailyTotalPay.toLocaleString()} so'm</b>`

      sendTelegramMessage(emp.telegramId, msg)
    }
  }

  const doSaveAll = async () => {
    setSavingAll(true)
    const allWorkers = [...employees, ...guestEmps]
    await Promise.all(allWorkers.map(emp => saveEmployee(emp.id)))
    setSavingAll(false)
    setSavedAll(true)
    setIsDirty(false)
    setDirtyEmps({})
    setTimeout(() => setSavedAll(false), 2500)
  }

  const saveAll = () => {
    const allWorkers = [...employees, ...guestEmps]
    const empty = allWorkers.filter(emp => {
      const ops = entries[emp.id] || {}
      const hasPrimary = Object.values(ops).some(v => Number(v.quantity || 0) > 0 || (v.note || '').trim())
      const splitMap = opSplits[emp.id] || {}
      const hasSplit = Object.values(splitMap).some(list => (list || []).some(l => Number(l.quantity || 0) > 0 || (l.note || '').trim()))
      return !hasPrimary && !hasSplit
    })
    if (empty.length > 0) {
      setEmptyWarning(empty)
    } else {
      doSaveAll()
    }
  }

  const openPicker = (emp) => {
    const current = overrides[emp.id] ?? emp.operationIds ?? []
    setPickerSel(current)
    setPickerEmp(emp.id)
    setPickerSearch('')
  }

  const applyPicker = (empId) => {
    const newOverrides = { ...overrides, [empId]: pickerSel }
    setOverrides(newOverrides)
    if (date) try { localStorage.setItem(`op_overrides_${deptId}_${date}`, JSON.stringify(newOverrides)) } catch {}
    setPickerEmp(null)
  }

  const togglePickerOp = (opId) => {
    setPickerSel(s => s.includes(opId) ? s.filter(id => id !== opId) : [...s, opId])
  }

  // Faqat shu bo'lim zanjiridagi buyurtmalar (mustaqil bo'lim — faqat o'ziniki)
  const orderComponent = chainComponent(deptId, departments)
  const visibleOrders = orders.filter(o => orderComponent.has(o.departmentId))
  // Zanjir yakuni (masalan Montaj) — o'zi buyurtma kirim qilmasa ham buyurtма/FIFO tanlay olsin
  const isChainEndpoint = dept?.chainInput?.mode === 'from'
  const showOrderPicker = can.enterHourly && (visibleOrders.length > 0 || isChainEndpoint)

  const hours = Math.max(0, calcHours(startTime, endTime) - breakMinutes / 60)
  const getEmpHours = (empId) => {
    const t = empTimes[empId]
    if (!t || !t.startTime || !t.endTime) return hours
    return Math.max(0, calcHours(t.startTime, t.endTime) - breakMinutes / 60)
  }

  const handleSendTelegram = async () => {
    if (isDirty) {
      setTgMsg("Avval ma'lumotlarni saqlang")
      setTimeout(() => setTgMsg(''), 3000)
      return
    }

    const allWorkers = [...employees, ...guestEmps]
    const rows = []
    allWorkers.forEach(emp => {
      const empEntries = entries[emp.id] || {}
      const activeOpIds = overrides[emp.id] ?? emp.operationIds ?? []
      allOps.filter(o => activeOpIds.includes(o.id)).forEach(op => {
        const data = empEntries[op.id] || {}
        const norm = effectiveNorm(emp, op.id, op.norm || 0, date)
        const primaryOrder = opOrders[emp.id]?.[op.id] ?? empOrders[emp.id] ?? defaultOrder
        const toId = (v) => (!v || v === 'none') ? null : v
        // Har operatsiya ulushlari: asosiy qator + "+" bilan qo'shilgan buyurtма qatorlari
        const allocs = [
          { quantity: Number(data.quantity || 0), note: data.note || '', orderId: toId(primaryOrder), expected: norm * hours },
          ...(opSplits[emp.id]?.[op.id] || []).map(l => ({ quantity: Number(l.quantity || 0), note: l.note || '', orderId: toId(l.orderId), expected: 0 })),
        ]
        allocs.forEach(a => {
          rows.push({
            empName: `${emp.lastName} ${emp.firstName}`,
            deptName: dept.name,
            opName: op.name,
            norm,
            isCustomNorm: norm !== (op.norm || 0),
            quantity: a.quantity,
            expected: a.expected,
            note: a.note,
            date,
            startTime,
            endTime,
            breakMinutes,
            isFinal: !!(op.isFinal),
            orderId: a.orderId,
          })
        })
      })
    })

    const filteredRows = rows.filter(r => r.quantity > 0 || r.note.trim())
    if (!filteredRows.length) {
      setTgMsg("Kiritilgan ma'lumot yo'q")
      setTimeout(() => setTgMsg(''), 3000)
      return
    }

    setTgSending(true)
    setTgMsg('')
    try {
      let dailyTayyor = null
      try {
        const dailySnap = await getDocs(query(
          collection(db, 'factory_work_entries'),
          where('departmentId', '==', deptId),
          where('date', '==', date),
        ))
        dailyTayyor = 0
        dailySnap.forEach(d => {
          Object.entries(d.data().operations || {}).forEach(([opId, data]) => {
            const op = allOps.find(o => o.id === opId)
            if (op?.isFinal) dailyTayyor += Number(data.quantity || 0)
          })
        })
      } catch (_) {}

      // Buyurtma xulosasi + har qatorga buyurtma nomi
      let orderSummary = null
      try {
        const orderIds = [...new Set(filteredRows.map(r => r.orderId).filter(Boolean))]
        const { summary, orderById } = await fetchOrderSummary(db, orderIds, deptId)
        orderSummary = summary.length ? summary : null
        filteredRows.forEach(r => { r.orderName = r.orderId ? (orderById[r.orderId]?.name || '') : '' })
      } catch (_) {}

      const filters = `${date} · ${startTime}–${endTime}`
      const html = buildWorkPDFHtml(filteredRows, filters, dept.name, false, false, dailyTayyor, orderSummary)
      const filename = `${dept.name}-${date}-${startTime.replace(':', '')}.pdf`
      const caption = `📊 ${dept.name} | ${date} | ${startTime}–${endTime}`
      // Shu bo'limning Telegram mavzusiga (forum topic) yuboriladi
      await sendHTMLToTelegram(html, filename, caption, threadForDept(dept))
      setTgMsg('✓ Yuborildi!')
    } catch (err) {
      setTgMsg('Xatolik: ' + err.message)
    } finally {
      setTgSending(false)
      setTimeout(() => setTgMsg(''), 4000)
    }
  }

  if (!dept) return <div className="text-red-500 p-4">Bo'lim topilmadi</div>
  if (!hasAccess) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <div className="text-gray-700 font-semibold">Ruxsat yo'q</div>
      <div className="text-gray-400 text-sm mt-1">Bu bo'limga kirishingiz cheklanган</div>
    </div>
  )

  const allWorkersList = [...employees, ...guestEmps]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">{dept.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ish ma'lumotlarini kiritish</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        {activeShift && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Tez tanlash ({activeShift.name})</div>
            <div className="flex flex-wrap gap-2">
              {(activeShift.slots || []).map((slot, i) => {
                const isSelected = startTime === slot.startTime && endTime === slot.endTime
                return (
                  <button
                    key={i}
                    onClick={() => { setStartTime(slot.startTime); setEndTime(slot.endTime); setBreakMinutes(slot.breakMinutes || 0) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    {slot.startTime}–{slot.endTime}
                    {slot.breakMinutes > 0 && <span className={`ml-1 ${isSelected ? 'text-indigo-200' : 'text-orange-400'}`}>⏸{slot.breakMinutes}'</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 sm:items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Sana
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Boshlanish
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Tugash
            </label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanaffus (daq.)</label>
            <input
              type="number"
              min="0"
              max="240"
              value={breakMinutes || ''}
              onChange={e => setBreakMinutes(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-full sm:w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 text-sm text-gray-500 sm:pb-2">
            <span className="font-semibold text-gray-700">{hours.toFixed(1)}</span> soat
            {breakMinutes > 0 && (
              <span className="text-xs text-orange-500 ml-1">(−{breakMinutes} daq.)</span>
            )}
          </div>
        </div>
      </div>

      {/* Employees */}
      {(!date || !startTime || !endTime) ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Sana, boshlanish va tugash vaqtini tanlang
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Bu bo'limda xodimlar mavjud emas
        </div>
      ) : (
        <>
          {/* Search + Guest + Save All */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Xodimni qidirish..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {can.enterHourly && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setShowGuestPicker(true); setGuestWarning('') }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Mehmon xodim
                </button>
                <div className="relative">
                  <button
                    onClick={handleSendTelegram}
                    disabled={tgSending}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {tgSending ? 'Yuborilmoqda...' : 'Telegram'}
                  </button>
                  {tgMsg && (
                    <div className={`absolute bottom-full mb-1.5 left-0 whitespace-nowrap text-xs rounded-lg px-3 py-1.5 shadow-md ${
                      tgMsg.startsWith('✓') ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'
                    }`}>
                      {tgMsg}
                    </div>
                  )}
                </div>
                <button
                  onClick={saveAll}
                  disabled={savingAll}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    savedAll
                      ? 'bg-green-100 text-green-700'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } disabled:opacity-60`}
                >
                  {savedAll ? (
                    <><CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">Hammasi </span>saqlandi</>
                  ) : (
                    <><Save className="w-4 h-4" /> {savingAll ? 'Saqlanmoqda...' : <><span className="hidden sm:inline">Barchasini </span>saqlash</>}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Umumiy buyurtma tanlash (hamma xodim uchun) */}
          {showOrderPicker && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-indigo-800 flex items-center gap-1.5 shrink-0">
                <Package className="w-4 h-4" /> Buyurtma:
              </span>
              <select
                value={defaultOrder}
                onChange={e => setDefaultOrder(e.target.value)}
                className="border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">Hech qaysi (buyurtmasiz)</option>
                <option value="auto">FIFO — avtomatik navbat</option>
                {visibleOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({Number(o.quantity).toLocaleString()} dona)</option>
                ))}
              </select>
              <span className="text-xs text-indigo-500">Har xodim va har operatsiya uchun pastda alohida o'zgartirsa bo'ladi</span>
            </div>
          )}

          <div className="space-y-4">
            {allWorkersList.filter(emp => {
              if (!search.trim()) return true
              const q = search.trim().toLowerCase()
              return `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q)
            }).map((emp, idx) => {
              const isGuest = guestEmps.some(e => e.id === emp.id)
              const activeOpIds = overrides[emp.id] ?? emp.operationIds ?? []
              const empOps = allOps.filter(o => activeOpIds.includes(o.id))
              const isOverridden = overrides[emp.id] != null && !isGuest
              const empEntries = entries[emp.id] || {}

              return (
                <div key={emp.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isGuest ? 'border-amber-200' : 'border-gray-100'}`}>
                  {/* Employee header */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isGuest ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${isGuest ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                        {idx + 1}
                      </div>
                      <span className="font-medium text-gray-800 text-sm">
                        {emp.lastName} {emp.firstName}
                      </span>
                      {isGuest && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Mehmon · {departments.find(d => d.id === emp.departmentId)?.name}
                        </span>
                      )}
                      {isOverridden && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          Almashtrilgan
                        </span>
                      )}
                      {empTimes[emp.id] && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlarmClock className="w-3 h-3" />
                          {empTimes[emp.id].startTime}–{empTimes[emp.id].endTime}
                        </span>
                      )}
                      {showOrderPicker && (
                        <select
                          value={empOrders[emp.id] ?? defaultOrder}
                          onChange={e => setEmpOrderAll(emp.id, e.target.value)}
                          title="Barcha operatsiyalar uchun buyurtma (standart)"
                          className="text-xs border border-gray-200 bg-white rounded-full px-2 py-0.5 max-w-[150px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="none">📦 Hammasi: buyurtmasiz</option>
                          <option value="auto">📦 Hammasi: FIFO avto</option>
                          {visibleOrders.map(o => <option key={o.id} value={o.id}>📦 Hammasi: {o.name}</option>)}
                        </select>
                      )}
                    </div>
                    {can.enterHourly && (
                      <div className="relative flex items-center gap-1">
                        {isGuest && (
                          <button
                            onClick={() => setRemovingGuestId(emp.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Mehmon xodimni olib tashlash"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setMenuEmp(menuEmp === emp.id ? null : emp.id)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuEmp === emp.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuEmp(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                              <button
                                onClick={() => { openPicker(emp); setMenuEmp(null) }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                                Operatsiya almashtirish
                              </button>
                              <button
                                onClick={() => { setTimePickerEmp(timePickerEmp === emp.id ? null : emp.id); setMenuEmp(null) }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                              >
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                Vaqtni o'zgartirish
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Guest remove confirmation */}
                  {isGuest && removingGuestId === emp.id && (
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-red-700">
                        <span className="font-semibold">{emp.lastName} {emp.firstName}</span> ni olib tashlaysizmi?
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { removeGuest(emp.id); setRemovingGuestId(null) }}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Tasdiqlash
                        </button>
                        <button
                          onClick={() => setRemovingGuestId(null)}
                          className="border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Bekor
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Operation picker */}
                  {pickerEmp === emp.id && (
                    <div className="border-b border-orange-100 bg-orange-50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-orange-800">Operatsiyalarni tanlang (faqat shu sessiya uchun)</span>
                        <button onClick={() => { setPickerEmp(null); setPickerSearch('') }} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={e => setPickerSearch(e.target.value)}
                          placeholder="Operatsiya qidirish..."
                          className="w-full border border-orange-200 bg-white rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {allOps.filter(o => o.departmentId === deptId).filter(o => !pickerSearch.trim() || o.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())).map(op => (
                          <label key={op.id} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                            pickerSel.includes(op.id)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          }`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={pickerSel.includes(op.id)}
                              onChange={() => togglePickerOp(op.id)}
                            />
                            {op.name}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => applyPicker(emp.id)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors"
                      >
                        Tasdiqlash
                      </button>
                    </div>
                  )}

                  {/* Per-employee time override */}
                  {timePickerEmp === emp.id && (
                    <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-indigo-800">Xodim uchun alohida vaqt</span>
                        <button onClick={() => setTimePickerEmp(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={empTimes[emp.id]?.startTime || startTime}
                          onChange={e => setEmpTimes(t => ({ ...t, [emp.id]: { ...t[emp.id], startTime: e.target.value, endTime: t[emp.id]?.endTime || endTime } }))}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-gray-400 text-sm">—</span>
                        <input
                          type="time"
                          value={empTimes[emp.id]?.endTime || endTime}
                          onChange={e => setEmpTimes(t => ({ ...t, [emp.id]: { ...t[emp.id], endTime: e.target.value, startTime: t[emp.id]?.startTime || startTime } }))}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => { setEmpTimes(t => { const n = { ...t }; delete n[emp.id]; return n }); setTimePickerEmp(null) }}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                        >
                          Bekor
                        </button>
                        <button
                          onClick={() => setTimePickerEmp(null)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
                        >
                          Tasdiqlash
                        </button>
                      </div>
                      <p className="text-xs text-indigo-600 mt-1.5">
                        Ishlagan soat: {getEmpHours(emp.id).toFixed(1)} soat
                      </p>
                    </div>
                  )}

                  {/* Operations */}
                  {empOps.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-400">
                      Operatsiyalar tayinlanmagan
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {empOps.map(op => {
                        const qty = empEntries[op.id]?.quantity ?? ''
                        const note = empEntries[op.id]?.note ?? ''
                        const empH = getEmpHours(emp.id)
                        const norm = effectiveNorm(emp, op.id, op.norm || 0, date)
                        const expected = norm * empH
                        const status = normStatus(qty, norm, empH)

                        return (
                          <div key={op.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700">{op.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Norma: {norm} dona/soat{norm !== (op.norm || 0) ? ' (shaxsiy)' : ''} · {hours > 0 ? `${hours.toFixed(1)} soat = ` : ''}{hours > 0 ? `${expected.toFixed(0)} dona` : '—'}
                                </div>
                                {showOrderPicker && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                                    <select
                                      value={opOrders[emp.id]?.[op.id] ?? empOrders[emp.id] ?? defaultOrder}
                                      onChange={e => setOpOrder(emp.id, op.id, e.target.value)}
                                      title="Bu operatsiya uchun buyurtma"
                                      className="text-xs border border-indigo-100 bg-indigo-50/60 text-indigo-800 rounded-full px-2 py-0.5 max-w-[170px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    >
                                      <option value="none">Buyurtmasiz</option>
                                      <option value="auto">FIFO avto</option>
                                      {visibleOrders.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                    <button
                                      onClick={() => addOpSplit(emp.id, op.id)}
                                      title="Shu operatsiyani boshqa buyurtmага bo'lish"
                                      className="flex items-center gap-0.5 text-xs text-indigo-600 hover:text-white hover:bg-indigo-500 border border-indigo-200 rounded-full px-1.5 py-0.5 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> buyurtma
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  value={qty}
                                  onChange={e => setEntryVal(emp.id, op.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                  disabled={!can.enterHourly}
                                  className={`w-24 border rounded-lg px-3 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${statusStyle[status]}`}
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-400">dona</span>
                              </div>
                              <input
                                type="text"
                                value={note}
                                onChange={e => setEntryVal(emp.id, op.id, 'note', e.target.value)}
                                disabled={!can.enterHourly}
                                className="w-full sm:w-40 md:w-52 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Izoh..."
                              />
                            </div>

                            {/* Qo'shimcha buyurtма qatorlari (shu operatsiyани boshqa buyurtmага) */}
                            {(opSplits[emp.id]?.[op.id] || []).map((line, li) => (
                              <div key={li} className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 pl-3 border-l-2 border-indigo-100">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-indigo-400 flex items-center gap-1">↳ {op.name} · yana bir buyurtма</div>
                                  {showOrderPicker && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <select
                                        value={line.orderId ?? 'auto'}
                                        onChange={e => setOpSplitVal(emp.id, op.id, li, 'orderId', e.target.value)}
                                        className="text-xs border border-indigo-100 bg-indigo-50/60 text-indigo-800 rounded-full px-2 py-0.5 max-w-[170px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                      >
                                        <option value="none">Buyurtmasiz</option>
                                        <option value="auto">FIFO avto</option>
                                        {visibleOrders.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={line.quantity ?? ''}
                                    onChange={e => setOpSplitVal(emp.id, op.id, li, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                    disabled={!can.enterHourly}
                                    className="w-24 border border-gray-200 rounded-lg px-3 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-gray-400">dona</span>
                                </div>
                                <input
                                  type="text"
                                  value={line.note ?? ''}
                                  onChange={e => setOpSplitVal(emp.id, op.id, li, 'note', e.target.value)}
                                  disabled={!can.enterHourly}
                                  className="w-full sm:w-40 md:w-52 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Izoh..."
                                />
                                {can.enterHourly && (
                                  <button
                                    onClick={() => removeOpSplit(emp.id, op.id, li)}
                                    title="Bu qatorni olib tashlash"
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Save button per employee */}
                  {can.enterHourly && dirtyEmps[emp.id] && (
                    <div className="px-4 py-3 border-t border-gray-50 flex justify-end">
                      <button
                        onClick={() => saveEmployee(emp.id)}
                        disabled={saving[emp.id]}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-colors ${
                          saved[emp.id]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        } disabled:opacity-60`}
                      >
                        {saved[emp.id] ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved[emp.id] ? 'Saqlandi' : saving[emp.id] ? '...' : 'Saqlash'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Guest picker modal */}
      {showGuestPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 modal-enter">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800">Mehmon xodim qo'shish</h3>
              <button onClick={() => { setShowGuestPicker(false); setGuestWarning(''); setGuestNotice('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Boshqa bo'limdagi xodim bu bo'limda vaqtinchalik ishlaydi</p>

            {guestWarning && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-xs">
                {guestWarning}
              </div>
            )}

            {guestNotice && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 mb-3 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{guestNotice}</span>
              </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                placeholder="Xodim qidirish..."
                autoFocus
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {!pendingGuest ? (
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {allEmployees
                  .filter(e => e.departmentId !== deptId)
                  .filter(e => !guestEmps.some(g => g.id === e.id))
                  .filter(e => {
                    if (!guestSearch.trim()) return true
                    return `${e.lastName} ${e.firstName}`.toLowerCase().includes(guestSearch.toLowerCase())
                  })
                  .map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => selectPendingGuest(emp)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800">{emp.lastName} {emp.firstName}</div>
                        <div className="text-xs text-gray-400">{departments.find(d => d.id === emp.departmentId)?.name || "Bo'lim yo'q"}</div>
                      </div>
                    </button>
                  ))
                }
              </div>
            ) : (
              <div>
                <div className="bg-amber-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 text-sm font-bold shrink-0">
                    {pendingGuest.firstName?.[0]}{pendingGuest.lastName?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{pendingGuest.lastName} {pendingGuest.firstName}</div>
                    <div className="text-xs text-gray-400">{departments.find(d => d.id === pendingGuest.departmentId)?.name}</div>
                  </div>
                </div>

                <p className="text-xs font-medium text-gray-500 mb-2">Bajaradigan vazifasini tanlang:</p>
                <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2 mb-4">
                  {allOps.filter(o => o.departmentId === deptId).map(op => (
                    <label key={op.id} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      pickerSel.includes(op.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                      <input type="checkbox" className="hidden" checked={pickerSel.includes(op.id)} onChange={() => togglePickerOp(op.id)} />
                      {op.name}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addGuestWithOps}
                    disabled={pickerSel.length === 0}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Qo'shish
                  </button>
                  <button
                    onClick={() => { setPendingGuest(null); setPickerSel([]) }}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                  >
                    Orqaga
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Empty employees confirmation modal */}
      {emptyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 modal-enter">
            <h3 className="font-bold text-gray-800 mb-1">Kiritilmagan xodimlar</h3>
            <p className="text-sm text-gray-500 mb-4">
              Quyidagi {emptyWarning.length} ta xodim uchun miqdor yoki izoh kiritilmagan. Baribir saqlanadimi?
            </p>
            <ul className="mb-5 space-y-1 max-h-52 overflow-y-auto">
              {emptyWarning.map((emp, i) => (
                <li key={emp.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <span className="text-gray-400 text-xs w-5 text-right">{i + 1}.</span>
                  {emp.lastName} {emp.firstName}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setEmptyWarning(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => { setEmptyWarning(null); doSaveAll() }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Baribir saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
