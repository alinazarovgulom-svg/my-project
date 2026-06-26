import { useState, useMemo, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { generateId } from '../store/storage'
import { fmtCur } from '../utils/format'
import Modal from '../components/Modal'
import {
  Car, Plus, ChevronLeft, ChevronRight,
  Edit2, Trash2, Sun, Moon, Phone,
  Users, TrendingUp, Check, X, User,
} from 'lucide-react'

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]
const DAY_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const DAY_FULL = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function firstWeekday(year, month) {
  // 0=Sun…6=Sat → Mon=0…Sun=6
  return (new Date(year, month - 1, 1).getDay() + 6) % 7
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function calcSalary(baseSalary, attMonth, year, month) {
  const total = daysInMonth(year, month)
  const att = attMonth || {}
  let fullDays = 0, halfDays = 0, absentDays = 0
  for (let d = 1; d <= total; d++) {
    const { m = false, e = false } = att[d] || {}
    if (m && e) fullDays++
    else if (m || e) halfDays++
    else absentDays++
  }
  const dailyRate = baseSalary / total
  const earned = dailyRate * (fullDays + halfDays * 0.5)
  return { fullDays, halfDays, absentDays, earned, total }
}

function fmt(n) {
  return fmtCur(Math.round(n))
}

// ── Month navigation helper ──
function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}
function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

// ── Driver form ──
function DriverForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    baseSalary: initial?.baseSalary ? String(initial.baseSalary) : '',
    phone: initial?.phone || '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    if (!form.name.trim()) return
    const salary = parseFloat(form.baseSalary.replace(/\s/g, '').replace(',', '.')) || 0
    onSave({ name: form.name.trim(), baseSalary: salary, phone: form.phone.trim() })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
          Haydovchi ismi *
        </label>
        <input
          value={form.name}
          onChange={set('name')}
          placeholder="To'liq ism"
          className="input-field"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
          Oylik ish haqi (so'm)
        </label>
        <input
          value={form.baseSalary}
          onChange={set('baseSalary')}
          placeholder="Masalan: 3000000"
          className="input-field"
          inputMode="numeric"
        />
      </div>
      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
          Telefon raqami
        </label>
        <input
          value={form.phone}
          onChange={set('phone')}
          placeholder="+998 __ ___ __ __"
          className="input-field"
          inputMode="tel"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
        >
          Bekor
        </button>
        <button
          onClick={handleSave}
          disabled={!form.name.trim()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: 'rgba(99,102,241,0.25)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.35)' }}
        >
          Saqlash
        </button>
      </div>
    </div>
  )
}

// ── Attendance day row ──
function DayRow({ dayNum, weekday, att, onToggle, isToday }) {
  const { m = false, e = false } = att || {}
  const status = m && e ? 'full' : (m || e) ? 'half' : 'absent'

  const statusColor = {
    full: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', label: '100%', color: '#4ade80' },
    half: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)', label: '50%', color: '#facc15' },
    absent: { bg: 'transparent', border: 'rgba(255,255,255,0.06)', label: '0%', color: 'var(--text-muted)' },
  }[status]

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: statusColor.bg, border: `1px solid ${statusColor.border}` }}
    >
      {/* Day number + name */}
      <div className="w-12 flex-shrink-0">
        <div
          className="text-sm font-black leading-tight"
          style={{ color: isToday ? '#818cf8' : 'var(--text-primary)' }}
        >
          {dayNum}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{DAY_SHORT[weekday]}</div>
      </div>

      {/* Morning toggle */}
      <button
        onClick={() => onToggle('m')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center transition-all"
        style={
          m
            ? { background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }
            : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid transparent' }
        }
      >
        <Sun size={13} />
        Ertalab
      </button>

      {/* Evening toggle */}
      <button
        onClick={() => onToggle('e')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center transition-all"
        style={
          e
            ? { background: 'rgba(129,140,248,0.2)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.35)' }
            : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid transparent' }
        }
      >
        <Moon size={13} />
        Kechqurun
      </button>

      {/* Status badge */}
      <div className="w-10 text-right">
        <span className="text-xs font-bold" style={{ color: statusColor.color }}>{statusColor.label}</span>
      </div>
    </div>
  )
}

// ── Attendance modal ──
function AttendanceModal({ driver, open, onClose, year, month, onPrevMonth, onNextMonth }) {
  const { driverAttendance, saveDriverAttendance, drivers, saveDrivers } = useApp()
  const [showEditForm, setShowEditForm] = useState(false)

  const mk = monthKey(year, month)
  const attMonth = driverAttendance?.[driver.id]?.[mk] || {}
  const totalDays = daysInMonth(year, month)
  const firstWd = firstWeekday(year, month)
  const { fullDays, halfDays, absentDays, earned } = calcSalary(driver.baseSalary, attMonth, year, month)

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  const toggleShift = (dayNum, shift) => {
    const current = attMonth[dayNum] || {}
    const updated = { ...current, [shift]: !current[shift] }
    const newAtt = {
      ...driverAttendance,
      [driver.id]: {
        ...(driverAttendance?.[driver.id] || {}),
        [mk]: { ...attMonth, [dayNum]: updated },
      },
    }
    saveDriverAttendance(newAtt)
  }

  const handleEditDriver = ({ name, baseSalary, phone }) => {
    const updated = drivers.map(d => d.id === driver.id ? { ...d, name, baseSalary, phone } : d)
    saveDrivers(updated)
    setShowEditForm(false)
  }

  const handleDeleteDriver = () => {
    if (!window.confirm(`"${driver.name}" haydovchisini o'chirasizmi?`)) return
    saveDrivers(drivers.filter(d => d.id !== driver.id))
    const newAtt = { ...driverAttendance }
    delete newAtt[driver.id]
    saveDriverAttendance(newAtt)
    onClose()
  }

  const days = []
  for (let d = 1; d <= totalDays; d++) {
    const weekday = (firstWd + d - 1) % 7
    days.push({ d, weekday })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={showEditForm ? "Haydovchini tahrirlash" : driver.name}
    >
      {showEditForm ? (
        <DriverForm
          initial={driver}
          onSave={handleEditDriver}
          onCancel={() => setShowEditForm(false)}
        />
      ) : (
        <>
          {/* Driver info + actions */}
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
              >
                {driver.name[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{driver.name}</div>
                {driver.phone ? (
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Phone size={10} /> {driver.phone}
                  </div>
                ) : (
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Oylik: {fmt(driver.baseSalary)} so'm
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowEditForm(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={handleDeleteDriver}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={onPrevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {UZ_MONTHS[month - 1]} {year}
            </div>
            <button
              onClick={onNextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Ertalab
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Kechqurun
            </span>
            <span className="flex items-center gap-1 ml-auto">
              Ikkalasi = 100% · Bittasi = 50%
            </span>
          </div>

          {/* Day rows */}
          <div className="flex flex-col gap-1.5">
            {days.map(({ d, weekday }) => (
              <DayRow
                key={d}
                dayNum={d}
                weekday={weekday}
                att={attMonth[d]}
                onToggle={(shift) => toggleShift(d, shift)}
                isToday={year === todayYear && month === todayMonth && d === todayDay}
              />
            ))}
          </div>

          {/* Summary */}
          <div
            className="rounded-xl p-4 mt-1"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <div className="text-xs font-semibold mb-3" style={{ color: '#818cf8' }}>
              {UZ_MONTHS[month - 1]} oyi xulosasi
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-lg font-black" style={{ color: '#4ade80' }}>{fullDays}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>To'liq kun</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black" style={{ color: '#facc15' }}>{halfDays}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Yarim kun</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black" style={{ color: '#f87171' }}>{absentDays}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kelmadi</div>
              </div>
            </div>
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}
            >
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Hisoblangan ish haqi</div>
              <div className="text-base font-black" style={{ color: '#818cf8' }}>
                {fmt(earned)} so'm
              </div>
            </div>
            {driver.baseSalary > 0 && (
              <div className="flex items-center justify-between mt-1">
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Oylik stavka: {fmt(driver.baseSalary)} so'm
                </div>
                <div className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {driver.baseSalary > 0 ? `${Math.round((earned / driver.baseSalary) * 100)}%` : '—'}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

// ── Driver card ──
function DriverCard({ driver, year, month, onClick }) {
  const { driverAttendance } = useApp()
  const mk = monthKey(year, month)
  const attMonth = driverAttendance?.[driver.id]?.[mk]
  const { fullDays, halfDays, absentDays, earned, total } = calcSalary(driver.baseSalary, attMonth, year, month)
  const workedDays = fullDays + halfDays
  const progress = total > 0 ? ((fullDays + halfDays * 0.5) / total) * 100 : 0

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{ background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
          >
            {driver.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {driver.name}
            </div>
            {driver.phone ? (
              <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <Phone size={9} /> {driver.phone}
              </div>
            ) : (
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Stavka: {fmt(driver.baseSalary)} so'm
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black" style={{ color: '#818cf8' }}>
            {fmt(earned)}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>so'm</div>
        </div>
      </div>

      {/* Attendance summary */}
      <div className="flex gap-2 mb-2">
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#4ade80' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          {fullDays} to'liq
        </div>
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#facc15' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
          {halfDays} yarim
        </div>
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#f87171' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          {absentDays} yoq
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: progress > 80 ? '#4ade80' : progress > 40 ? '#facc15' : '#f87171',
          }}
        />
      </div>
    </button>
  )
}

// ── Main page ──
export default function Haydovchilar() {
  const { drivers, saveDrivers, driverAttendance } = useApp()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const goBack = () => {
    const p = prevMonth(viewYear, viewMonth)
    setViewYear(p.year); setViewMonth(p.month)
  }
  const goForward = () => {
    const n = nextMonth(viewYear, viewMonth)
    setViewYear(n.year); setViewMonth(n.month)
  }

  // Recalculate selected driver object from current drivers list (after edit)
  const currentSelectedDriver = useMemo(
    () => selectedDriver ? drivers.find(d => d.id === selectedDriver.id) || null : null,
    [selectedDriver, drivers]
  )

  const handleAddDriver = ({ name, baseSalary, phone }) => {
    const newDriver = { id: generateId(), name, baseSalary, phone, createdAt: new Date().toISOString() }
    saveDrivers([...drivers, newDriver])
    setShowAddForm(false)
  }

  // Total payroll for the month
  const mk = monthKey(viewYear, viewMonth)
  const totalPayroll = useMemo(() => {
    return drivers.reduce((sum, d) => {
      const attMonth = driverAttendance?.[d.id]?.[mk]
      const { earned } = calcSalary(d.baseSalary, attMonth, viewYear, viewMonth)
      return sum + earned
    }, 0)
  }, [drivers, driverAttendance, mk, viewYear, viewMonth])

  return (
    <div className="min-h-screen pb-28 page-bg" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Car size={20} style={{ color: '#818cf8' }} />
            <h1 className="text-xl font-black">Haydovchilar</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <Plus size={15} /> Qo'shish
          </button>
        </div>

        {/* Month navigation */}
        <div
          className="flex items-center justify-between rounded-2xl p-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={17} />
          </button>
          <div className="text-center">
            <div className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
              {UZ_MONTHS[viewMonth - 1]} {viewYear}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {daysInMonth(viewYear, viewMonth)} ish kuni
            </div>
          </div>
          <button
            onClick={goForward}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 px-4 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={14} style={{ color: '#818cf8' }} />
            <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>Haydovchilar</span>
          </div>
          <div className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {drivers.length}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>jami</div>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} style={{ color: '#4ade80' }} />
            <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>Jami ish haqi</span>
          </div>
          <div className="text-base font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
            {fmt(totalPayroll)}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>so'm</div>
        </div>
      </div>

      {/* Business rules reminder */}
      <div
        className="mx-4 mb-4 rounded-xl px-4 py-3 flex gap-3 text-[11px]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex gap-3 flex-wrap">
          <span style={{ color: '#4ade80' }}>
            <Sun size={10} className="inline mr-0.5" />
            <Moon size={10} className="inline mr-1" />
            Ertalab + Kechqurun = 100%
          </span>
          <span style={{ color: '#facc15' }}>
            <Sun size={10} className="inline mr-1" />
            Faqat bittasi = 50%
          </span>
          <span style={{ color: 'var(--text-muted)' }}>Hech biri = 0%</span>
        </div>
      </div>

      {/* Driver list */}
      <div className="px-4 flex flex-col gap-2.5">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Car size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Haydovchilar yo'q
            </div>
            <div className="text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              Yuqoridagi "Qo'shish" tugmasini bosing
            </div>
          </div>
        ) : (
          drivers.map(driver => (
            <DriverCard
              key={driver.id}
              driver={driver}
              year={viewYear}
              month={viewMonth}
              onClick={() => setSelectedDriver(driver)}
            />
          ))
        )}
      </div>

      {/* Add driver modal */}
      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="Haydovchi qo'shish">
        <DriverForm
          onSave={handleAddDriver}
          onCancel={() => setShowAddForm(false)}
        />
      </Modal>

      {/* Attendance modal */}
      {currentSelectedDriver && (
        <AttendanceModal
          driver={currentSelectedDriver}
          open={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          year={viewYear}
          month={viewMonth}
          onPrevMonth={goBack}
          onNextMonth={goForward}
        />
      )}
    </div>
  )
}
