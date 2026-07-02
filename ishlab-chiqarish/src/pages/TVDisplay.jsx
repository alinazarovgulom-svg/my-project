import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, onSnapshot, getDocs, doc, getDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'

const today = format(new Date(), 'yyyy-MM-dd')
const PER_PAGE = 2

function shortSlot(slot) {
  return slot.replace('–', ' – ')
}

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

export default function TVDisplay() {
  const { deptId } = useParams()
  const [deptName, setDeptName] = useState('...')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ total: 0, attended: 0, absent: 0, done: 0, expected: 0, tayyor: 0 })
  const [page, setPage] = useState(0)
  const [clock, setClock] = useState(new Date())
  const [lastUpdated, setLastUpdated] = useState(null)

  // Department name
  useEffect(() => {
    getDoc(doc(db, 'factory_departments', deptId)).then(d => {
      if (d.exists()) setDeptName(d.data().name)
    })
  }, [deptId])

  // Employees + real-time work entries
  useEffect(() => {
    let unsub = () => {}
    let cancelled = false

    async function setup() {
      const [empSnap, opSnap] = await Promise.all([
        getDocs(query(collection(db, 'factory_employees'), where('departmentId', '==', deptId))),
        getDocs(collection(db, 'factory_operations')),
      ])
      if (cancelled) return

      const allEmps = empSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.isActive !== false)

      const normMap = {}
      const opNameMap = {}
      let finalOpId = null
      opSnap.forEach(d => {
        const data = d.data()
        normMap[d.id] = data.norm || 0
        opNameMap[d.id] = data.name || d.id
        if (data.isFinal && data.departmentId === deptId) finalOpId = d.id
      })

      const q = query(
        collection(db, 'factory_work_entries'),
        where('date', '==', today),
        where('departmentId', '==', deptId)
      )

      unsub = onSnapshot(q, snap => {
        // empData: { empId: { ops: { opId: { slots: { slotKey: qty }, total, exp } } } }
        const empData = {}
        const seenEmp = new Set()
        let totalDone = 0
        let totalExp = 0
        let totalTayyor = 0
        let lastEndTime = ''

        snap.forEach(entry => {
          const d = entry.data()
          const hasQty = Object.values(d.operations || {}).some(op => Number(op.quantity) > 0)
          if (hasQty) seenEmp.add(d.employeeId)
          if (d.endTime && d.endTime > lastEndTime) lastEndTime = d.endTime
          const slot = `${d.startTime}–${d.endTime}`
          const hours = Math.max(0, calcHours(d.startTime, d.endTime) - Number(d.breakMinutes || 0) / 60)

          if (!empData[d.employeeId]) empData[d.employeeId] = { ops: {}, totalQty: 0, totalExp: 0 }

          Object.entries(d.operations || {}).forEach(([opId, val]) => {
            const qty = Number(val.quantity || 0)
            const exp = val.expected !== undefined ? Number(val.expected) : (normMap[opId] || 0) * hours

            if (!empData[d.employeeId].ops[opId]) {
              empData[d.employeeId].ops[opId] = { slots: {}, total: 0, exp: 0 }
            }
            if (!empData[d.employeeId].ops[opId].slots[slot]) {
              empData[d.employeeId].ops[opId].slots[slot] = { qty: 0, exp: 0, note: '' }
            }
            empData[d.employeeId].ops[opId].slots[slot].qty += qty
            empData[d.employeeId].ops[opId].slots[slot].exp += exp
            if (val.note) empData[d.employeeId].ops[opId].slots[slot].note = val.note
            empData[d.employeeId].ops[opId].total += qty
            empData[d.employeeId].ops[opId].exp   += exp
            empData[d.employeeId].totalQty += qty
            empData[d.employeeId].totalExp += exp
            totalDone += qty
            totalExp  += exp
            if (opId === finalOpId) totalTayyor += qty
          })
        })

        const sorted = allEmps
          .filter(e => seenEmp.has(e.id))
          .map(e => {
            const data = empData[e.id] || { ops: {}, totalQty: 0, totalExp: 0 }
            const ops = Object.entries(data.ops).map(([opId, op]) => ({
              name: opNameMap[opId] || opId,
              norm: normMap[opId] || 0,
              slots: op.slots,
              total: op.total,
              exp: op.exp,
            }))
            return {
              id: e.id,
              name: [e.lastName, e.firstName].filter(s => s && s.trim() && s.trim() !== '.').join(' '),
              totalQty: data.totalQty,
              totalExp: data.totalExp,
              ops,
            }
          })
          .sort((a, b) => {
            const tier = e => {
              if (!e.totalExp) return 2
              if (e.totalQty > e.totalExp)           return 0  // yashil: 100%+
              if (e.totalQty === e.totalExp)         return 1  // sariq: aynan 100%
              if (e.totalQty >= e.totalExp * 0.95)  return 2  // qizil: 95-99%
              return 3                                          // to'q qizil: <95%
            }
            const ta = tier(a), tb = tier(b)
            if (ta !== tb) return ta - tb
            const ea = a.totalExp > 0 ? a.totalQty / a.totalExp : 0
            const eb = b.totalExp > 0 ? b.totalQty / b.totalExp : 0
            return eb - ea
          })

        setRows(sorted)
        setStats({ total: allEmps.length, attended: seenEmp.size, absent: allEmps.length - seenEmp.size, done: totalDone, expected: totalExp, tayyor: totalTayyor })
        setLastUpdated(lastEndTime || null)
        setPage(0)
      })
    }

    setup()
    return () => { cancelled = true; unsub() }
  }, [deptId])

  // Auto-paginate every 6 seconds
  useEffect(() => {
    const total = Math.ceil(rows.length / PER_PAGE)
    if (total <= 1) return
    const t = setInterval(() => setPage(p => (p + 1) % total), 7000)
    return () => clearInterval(t)
  }, [rows.length])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const totalPages = Math.ceil(rows.length / PER_PAGE)
  const pageRows = rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const allSlots = [...new Set(rows.flatMap(emp => emp.ops.flatMap(op => Object.keys(op.slots))))].sort()

  function slotColor(qty, exp) {
    if (!exp) return { bg: '#f1f5f9', color: '#94a3b8' }
    if (qty > exp)          return { bg: '#dcfce7', color: '#15803d' }  // yashil: 100%+
    if (qty === exp)        return { bg: '#dbeafe', color: '#1d4ed8' }  // ko'k: aynan 100%
    if (qty >= exp * 0.95)  return { bg: '#fef9c3', color: '#a16207' }  // sariq: 95-99%
    return                         { bg: '#fee2e2', color: '#b91c1c' }  // qizil: <95%
  }
  const eff = stats.expected > 0 ? Math.round((stats.done / stats.expected) * 100) : null
  const effColor = eff === null ? '#94a3b8' : eff >= 100 ? '#4ade80' : eff >= 80 ? '#fbbf24' : '#f87171'
  const timeStr = clock.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tashkent' })
  const dateStr = clock.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Tashkent' })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      color: '#1e293b',
      fontFamily: 'Arial, Helvetica, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: '#0f1c3a',
        borderBottom: '3px solid #D97706',
        padding: '16px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>
            <span style={{ color: '#D97706' }}>KAFT</span><span style={{ color: '#ffffff' }}>IMDA</span>
          </div>
          <div style={{ height: 3, background: '#D97706', borderRadius: 2, margin: '6px 0 5px' }} />
          <div style={{ fontSize: 18, color: '#93c5fd', letterSpacing: 0.3, marginBottom: 4 }}>Biznesingiz kaftingizda</div>
          <div style={{ fontSize: 20, color: '#e2e8f0', fontWeight: 700 }}>{deptName}</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, flex: 1, justifyContent: 'center' }}>
          {[
            { label: 'Jami xodimlar',    value: stats.total,                     color: '#f8fafc'  },
            { label: 'Kelgan',           value: stats.attended,                   color: '#4ade80'  },
            { label: 'Kelmagan',         value: stats.absent,                     color: '#f87171'  },
            { label: 'Tayyor mahsulot',  value: stats.tayyor,                     color: '#f59e0b'  },
            { label: 'Samaradorlik',     value: eff !== null ? `${eff}%` : '—',  color: effColor   },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '14px 28px',
              minWidth: 130,
            }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 15, color: '#94a3b8', marginTop: 7 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Clock */}
        <div style={{ textAlign: 'right', minWidth: 180 }}>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 2, fontVariantNumeric: 'tabular-nums', color: '#ffffff' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#94a3b8', fontSize: 22,
          }}>
            Bugun ma'lumot kiritilmagan
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#1a202c' }}>
                <th style={{ width: 56, padding: '10px 8px', textAlign: 'center', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>Xodim</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>Operatsiya</th>
                <th style={{ width: 110, padding: '10px 8px', textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#93c5fd' }}>Norma</th>
                {allSlots.map(slot => (
                  <th key={slot} style={{ width: 130, padding: '10px 6px', textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#93c5fd' }}>
                    {shortSlot(slot)}
                  </th>
                ))}
                <th style={{ width: 110, padding: '10px 8px', textAlign: 'center', fontSize: 19, fontWeight: 700, color: '#93c5fd' }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((emp, i) => {
                const rank = page * PER_PAGE + i + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                const rowBg = i % 2 === 1 ? '#e8edf3' : '#ffffff'
                return emp.ops.map((op, opIdx) => {
                  const totalSt = slotColor(op.total, op.exp)
                  return (
                    <tr key={`${emp.id}-${op.name}`} style={{
                      background: rowBg,
                      borderTop: opIdx === 0 ? '2px solid #cbd5e1' : '1px solid #e2e8f0',
                    }}>
                      {opIdx === 0 && (
                        <td rowSpan={emp.ops.length} style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#94a3b8', verticalAlign: 'middle', padding: '10px 8px' }}>
                          {rank}
                        </td>
                      )}
                      {opIdx === 0 && (
                        <td rowSpan={emp.ops.length} style={{ padding: '10px 12px', fontSize: 22, fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {medal && <span style={{ marginRight: 6 }}>{medal}</span>}{emp.name}
                        </td>
                      )}
                      <td style={{ padding: '8px 12px', fontSize: 32, color: '#1d4ed8', fontWeight: 700 }}>{op.name}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 24, color: '#b45309', fontWeight: 700 }}>{op.norm} d/s</td>
                      {allSlots.map(slot => {
                        const sd = op.slots[slot]
                        if (!sd) return <td key={slot} style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 18 }}>—</td>
                        const st = slotColor(sd.qty, sd.exp)
                        return (
                          <td key={slot} style={{ textAlign: 'center', padding: '5px 4px' }}>
                            <div style={{ background: st.bg, borderRadius: 8, padding: '4px 8px', display: 'inline-block', minWidth: 58 }}>
                              <div style={{ fontSize: 32, fontWeight: 800, color: st.color, lineHeight: 1.2 }}>{sd.qty}</div>
                              <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1 }}>{Math.round(sd.exp)}</div>
                            </div>
                            {sd.note && (
                              <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', marginTop: 3, maxWidth: 120, wordBreak: 'break-word' }}>{sd.note}</div>
                            )}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'center', padding: '5px 8px' }}>
                        <div style={{ background: totalSt.bg, borderRadius: 8, padding: '4px 8px', display: 'inline-block', minWidth: 58 }}>
                          <div style={{ fontSize: 32, fontWeight: 800, color: totalSt.color, lineHeight: 1.2 }}>{op.total}</div>
                          <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1 }}>{Math.round(op.exp)}</div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      <div style={{
        padding: '12px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderTop: '1px solid #cbd5e1',
        flexShrink: 0,
        position: 'relative',
      }}>
        {totalPages > 1 && (<>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} style={{
              width: i === page ? 36 : 10,
              height: 10,
              borderRadius: 5,
              background: i === page ? '#3b82f6' : '#cbd5e1',
              transition: 'all 0.4s',
            }} />
          ))}
          <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 16 }}>
            {page + 1} / {totalPages} &nbsp;·&nbsp; har 7 soniyada almashinadi
          </span>
        </>)}
        {lastUpdated && (
          <div style={{ position: 'absolute', right: 40, fontSize: 17, color: '#f87171', fontWeight: 700 }}>
            🔴 Yangilandi: {lastUpdated}
          </div>
        )}
      </div>
    </div>
  )
}
