import { useEffect, useState, Fragment } from 'react'
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
          const hours = calcHours(d.startTime, d.endTime)

          if (!empData[d.employeeId]) empData[d.employeeId] = { ops: {}, totalQty: 0, totalExp: 0 }

          Object.entries(d.operations || {}).forEach(([opId, val]) => {
            const qty = Number(val.quantity || 0)
            const exp = (normMap[opId] || 0) * hours

            if (!empData[d.employeeId].ops[opId]) {
              empData[d.employeeId].ops[opId] = { slots: {}, total: 0, exp: 0 }
            }
            empData[d.employeeId].ops[opId].slots[slot] =
              (empData[d.employeeId].ops[opId].slots[slot] || 0) + qty
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
          .sort((a, b) => b.totalQty - a.totalQty)

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
  const eff = stats.expected > 0 ? Math.round((stats.done / stats.expected) * 100) : null
  const effColor = eff === null ? '#94a3b8' : eff >= 100 ? '#4ade80' : eff >= 80 ? '#fbbf24' : '#f87171'
  const timeStr = clock.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tashkent' })
  const dateStr = clock.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Tashkent' })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#2d3748',
      color: '#f8fafc',
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
        <div style={{ minWidth: 180 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 1 }}>KAFTIMDA</div>
          <div style={{ width: 68, height: 3, background: '#D97706', borderRadius: 2, margin: '5px 0 7px' }} />
          <div style={{ fontSize: 26, color: '#93c5fd', fontWeight: 700 }}>{deptName}</div>
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
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
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
            height: '100%', color: '#475569', fontSize: 22,
          }}>
            Bugun ma'lumot kiritilmagan
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a202c' }}>
                <th style={{ padding: '12px 20px', textAlign: 'center', width: 60, fontSize: 16, fontWeight: 700, color: '#93c5fd' }}>#</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 16, fontWeight: 700, color: '#93c5fd' }}>Xodim ismi</th>
                <th style={{ padding: '12px 36px 12px 20px', textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#93c5fd' }}>Jami</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((emp, i) => {
                const rank = page * PER_PAGE + i + 1
                const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : ''
                const rowBg = i % 2 === 1 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.04)'
                const qtyColor = emp.totalExp > 0
                  ? (emp.totalQty >= emp.totalExp ? '#4ade80' : emp.totalQty >= emp.totalExp * 0.8 ? '#fbbf24' : '#f87171')
                  : '#f8fafc'

                return (
                  <Fragment key={emp.id}>
                    {/* Main row — name + total */}
                    <tr style={{ background: rowBg, borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                      <td rowSpan={1 + emp.ops.length} style={{
                        padding: '16px 20px',
                        textAlign: 'center',
                        color: '#475569',
                        fontSize: 22,
                        fontWeight: 700,
                        verticalAlign: 'middle',
                      }}>
                        {rank}
                      </td>
                      <td style={{ padding: '16px 20px 4px', fontSize: 30, fontWeight: 800, verticalAlign: 'bottom' }}>
                        {medal}{emp.name}
                      </td>
                      <td style={{
                        padding: '16px 40px 4px 20px',
                        textAlign: 'right',
                        fontSize: 32,
                        fontWeight: 900,
                        color: qtyColor,
                        verticalAlign: 'bottom',
                        whiteSpace: 'nowrap',
                      }}>
                        {emp.totalQty}{' '}
                        <span style={{ fontSize: 15, color: '#64748b', fontWeight: 400 }}>dona</span>
                      </td>
                    </tr>

                    {/* Operation detail rows */}
                    {emp.ops.map(op => (
                      <tr key={op.name} style={{ background: rowBg }}>
                        <td colSpan={2} style={{ padding: '2px 20px 12px 56px', verticalAlign: 'top' }}>
                          {/* Op name */}
                          <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 36, marginBottom: 3 }}>
                            {op.name}
                          </div>
                          {/* Norm */}
                          <div style={{ color: '#fbbf24', fontSize: 17, marginBottom: 5, fontWeight: 600 }}>
                            Norma: {op.norm} dona/soat
                          </div>
                          {/* Slots + total */}
                          <div>
                            {Object.entries(op.slots).sort().map(([slot, qty]) => (
                              <span key={slot} style={{ marginRight: 28, whiteSpace: 'nowrap', display: 'inline-block' }}>
                                <span style={{ color: '#cbd5e1', fontSize: 17 }}>{shortSlot(slot)}: </span>
                                <strong style={{ color: '#f8fafc', fontSize: 28 }}>{qty}</strong>
                              </span>
                            ))}
                            <span style={{ color: '#cbd5e1', fontSize: 17 }}>= </span>
                            <strong style={{ color: '#fbbf24', fontSize: 28 }}>{op.total}</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                )
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
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {totalPages > 1 && (<>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} style={{
              width: i === page ? 36 : 10,
              height: 10,
              borderRadius: 5,
              background: i === page ? '#3b82f6' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.4s',
            }} />
          ))}
          <span style={{ color: '#64748b', fontSize: 13, marginLeft: 16 }}>
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
