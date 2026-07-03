import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, onSnapshot, getDocs,
  doc, setDoc, serverTimestamp, documentId,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useDepartments } from '../contexts/DepartmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, Save, CheckCircle, RefreshCw, X, Search, MoreVertical, Send, AlarmClock, UserPlus } from 'lucide-react'
import { buildWorkPDFHtml } from '../utils/pdf'
import { sendHTMLToTelegram, sendTelegramMessage } from '../utils/telegram'

function calcHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function normStatus(quantity, norm, hours) {
  const expected = norm * hours
  if (!expected || quantity === '' || quantity === null) return 'none'
  const qty = Number(quantity)
  if (qty > expected) return 'above'
  if (qty === expected) return 'equal'
  return 'below'
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

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [employees, setEmployees] = useState([])
  const [allOps, setAllOps] = useState([])
  const [entries, setEntries] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [savingAll, setSavingAll] = useState(false)
  const [savedAll, setSavedAll] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [overrides, setOverrides] = useState({})
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

  // Guest worker state
  const [guestEmps, setGuestEmps] = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [showGuestPicker, setShowGuestPicker] = useState(false)
  const [guestSearch, setGuestSearch] = useState('')
  const [guestWarning, setGuestWarning] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'factory_shifts'), where('isActive', '==', true)))
      .then(snap => {
        if (!snap.empty) setActiveShift({ id: snap.docs[0].id, ...snap.docs[0].data() })
      })
  }, [])

  // Load employees in this dept
  useEffect(() => {
    const q = query(collection(db, 'factory_employees'), where('departmentId', '==', deptId))
    return onSnapshot(q, snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.isActive !== false).sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
        return nameA.localeCompare(nameB, 'uz')
      }))
    })
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

  // Reset overrides and dirty flag when date/time changes
  useEffect(() => {
    setOverrides({})
    setPickerEmp(null)
    setIsDirty(false)
    setEntries({})
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
      where(documentId(), '<', shiftPrefix + ''),
    )
    return onSnapshot(q, snap => {
      const data = {}
      let loadedBreak = null
      snap.forEach(d => {
        const { employeeId, operations, breakMinutes: bm } = d.data()
        data[employeeId] = operations || {}
        if (bm !== undefined) loadedBreak = bm
      })
      setEntries(data)
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
    setIsDirty(true)
  }

  const addGuest = async (emp) => {
    if (guestEmps.some(e => e.id === emp.id) || employees.some(e => e.id === emp.id)) return
    if (date) {
      const snap = await getDocs(query(
        collection(db, 'factory_work_entries'),
        where('employeeId', '==', emp.id),
        where('date', '==', date),
      ))
      if (!snap.empty) {
        const existingDeptId = snap.docs[0].data().departmentId
        const existingDept = departments.find(d => d.id === existingDeptId)
        setGuestWarning(`${emp.lastName} ${emp.firstName} bugun ${existingDept?.name || "boshqa bo'limda"} allaqachon ishlagan!`)
        setTimeout(() => setGuestWarning(''), 4000)
        return
      }
    }
    const deptOpIds = allOps.filter(o => o.departmentId === deptId).map(o => o.id)
    setGuestEmps(prev => [...prev, emp])
    setOverrides(o => ({ ...o, [emp.id]: deptOpIds }))
    setShowGuestPicker(false)
    setGuestSearch('')
    setGuestWarning('')
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
    const operations = Object.fromEntries(
      Object.entries(rawOps).map(([opId, val]) => {
        const qty = Number(val.quantity || 0)
        const unitPrice = unitPriceMap[opId] || 0
        const piecePay = unitPrice * qty
        return [opId, { ...val, norm: normMap[opId] || 0, expected: (normMap[opId] || 0) * empH, unitPrice, piecePay }]
      })
    )
    const totalPiecePay = Object.values(operations).reduce((s, v) => s + (v.piecePay || 0), 0)
    const hourlyPay = salaryType === 'piece' ? 0 : hourlyRate * empH
    const totalPay = salaryType === 'hourly' ? hourlyPay
      : salaryType === 'piece' ? totalPiecePay
      : hourlyPay + totalPiecePay
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
      ...(isGuest && { isGuest: true, homeDepartmentId: emp.departmentId }),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    setSaving(s => ({ ...s, [empId]: false }))
    setSaved(s => ({ ...s, [empId]: true }))
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

  const saveAll = async () => {
    setSavingAll(true)
    const allWorkers = [...employees, ...guestEmps]
    await Promise.all(allWorkers.map(emp => saveEmployee(emp.id)))
    setSavingAll(false)
    setSavedAll(true)
    setIsDirty(false)
    setTimeout(() => setSavedAll(false), 2500)
  }

  const openPicker = (emp) => {
    const current = overrides[emp.id] ?? emp.operationIds ?? []
    setPickerSel(current)
    setPickerEmp(emp.id)
    setPickerSearch('')
  }

  const applyPicker = (empId) => {
    setOverrides(o => ({ ...o, [empId]: pickerSel }))
    setPickerEmp(null)
  }

  const togglePickerOp = (opId) => {
    setPickerSel(s => s.includes(opId) ? s.filter(id => id !== opId) : [...s, opId])
  }

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
        rows.push({
          empName: `${emp.lastName} ${emp.firstName}`,
          deptName: dept.name,
          opName: op.name,
          norm: op.norm,
          quantity: Number(data.quantity || 0),
          expected: op.norm * hours,
          note: data.note || '',
          date,
          startTime,
          endTime,
          breakMinutes,
          isFinal: !!(op.isFinal),
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

      const filters = `${date} · ${startTime}–${endTime}`
      const html = buildWorkPDFHtml(filteredRows, filters, dept.name, false, false, dailyTayyor)
      const filename = `${dept.name}-${date}-${startTime.replace(':', '')}.pdf`
      const caption = `📊 ${dept.name} | ${date} | ${startTime}–${endTime}`
      await sendHTMLToTelegram(html, filename, caption)
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
                    </div>
                    {can.enterHourly && (
                      <div className="relative flex items-center gap-1">
                        {isGuest && (
                          <button
                            onClick={() => removeGuest(emp.id)}
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
                        const expected = op.norm * empH
                        const status = normStatus(qty, op.norm, empH)

                        return (
                          <div key={op.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700">{op.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Norma: {op.norm} dona/soat · {hours > 0 ? `${hours.toFixed(1)} soat = ` : ''}{hours > 0 ? `${expected.toFixed(0)} dona` : '—'}
                                </div>
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
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Save button per employee */}
                  {can.enterHourly && (
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
              <button onClick={() => { setShowGuestPicker(false); setGuestWarning('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Boshqa bo'limdagi xodim bu bo'limda vaqtinchalik ishlaydi</p>

            {guestWarning && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-xs">
                {guestWarning}
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

            <div className="max-h-64 overflow-y-auto space-y-0.5">
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
                    onClick={() => addGuest(emp)}
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
          </div>
        </div>
      )}
    </div>
  )
}
