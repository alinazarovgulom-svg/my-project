import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection, query, where, onSnapshot, getDocs, doc, getDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { format } from 'date-fns'

const today = format(new Date(), 'yyyy-MM-dd')
const PER_PAGE = 8

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
  const [stats, setStats] = useState({ total: 0, attended: 0, done: 0, expected: 0 })
  const [page, setPage] = useState(0)
  const [clock, setClock] = useState(new Date())

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
      opSnap.forEach(d => { normMap[d.id] = d.data().norm || 0 })

      const q = query(
        collection(db, 'factory_work_entries'),
        where('date', '==', today),
        where('departmentId', '==', deptId)
      )

      unsub = onSnapshot(q, snap => {
        const empQty = {}
        const empExp = {}
        const seenEmp = new Set()
        let totalDone = 0
        let totalExp = 0

        snap.forEach(entry => {
          const d = entry.data()
          seenEmp.add(d.employeeId)
          const hours = calcHours(d.startTime, d.endTime)
          Object.entries(d.operations || {}).forEach(([opId, val]) => {
            const qty = Number(val.quantity || 0)
            empQty[d.employeeId] = (empQty[d.employeeId] || 0) + qty
            empExp[d.employeeId] = (empExp[d.employeeId] || 0) + (normMap[opId] || 0) * hours
            totalDone += qty
            totalExp += (normMap[opId] || 0) * hours
          })
        })

        const sorted = allEmps
          .filter(e => seenEmp.has(e.id))
          .map(e => ({
            id: e.id,
            name: `${e.lastName || ''} ${e.firstName || ''}`.trim(),
            qty: empQty[e.id] || 0,
            exp: empExp[e.id] || 0,
          }))
          .sort((a, b) => b.qty - a.qty)

        setRows(sorted)
        setStats({ total: allEmps.length, attended: seenEmp.size, done: totalDone, expected: totalExp })
        setPage(0)
      })
    }

    setup()
    return () => { cancelled = true; unsub() }
  }, [deptId])

  // Auto-paginate every 10 seconds
  useEffect(() => {
    const total = Math.ceil(rows.length / PER_PAGE)
    if (total <= 1) return
    const t = setInterval(() => setPage(p => (p + 1) % total), 10000)
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
  const timeStr = clock.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = format(clock, 'dd.MM.yyyy')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
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
        padding: '18px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexShrink: 0,
      }}>

        {/* Brand */}
        <div style={{ minWidth: 180 }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 1 }}>KAFTIMDA</div>
          <div style={{ width: 68, height: 3, background: '#D97706', borderRadius: 2, margin: '5px 0 8px' }} />
          <div style={{ fontSize: 20, color: '#93c5fd', fontWeight: 600 }}>{deptName}</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flex: 1, justifyContent: 'center' }}>
          {[
            { label: 'Jami xodim',   value: stats.total,                         color: '#f8fafc' },
            { label: 'Kelgan',        value: stats.attended,                       color: '#4ade80' },
            { label: 'Bajarildi',     value: stats.done,                           color: '#60a5fa' },
            { label: 'Samaradorlik',  value: eff !== null ? `${eff}%` : '—',      color: effColor  },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '12px 28px',
              minWidth: 120,
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Clock */}
        <div style={{ textAlign: 'right', minWidth: 180 }}>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 15, color: '#94a3b8', marginTop: 4 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#475569', fontSize: 24,
          }}>
            Bugun ma'lumot kiritilmagan
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e3a8a' }}>
                <th style={{ padding: '14px 24px', textAlign: 'center', width: 70, fontSize: 17, fontWeight: 700, color: '#93c5fd' }}>#</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: 17, fontWeight: 700, color: '#93c5fd' }}>Xodim ismi</th>
                <th style={{ padding: '14px 40px 14px 24px', textAlign: 'right', fontSize: 17, fontWeight: 700, color: '#93c5fd' }}>Bugun bajargan</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((emp, i) => {
                const rank = page * PER_PAGE + i + 1
                const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : ''
                const qtyColor = emp.exp > 0
                  ? (emp.qty >= emp.exp ? '#4ade80' : emp.qty >= emp.exp * 0.8 ? '#fbbf24' : '#f87171')
                  : '#f8fafc'
                return (
                  <tr
                    key={emp.id}
                    style={{
                      background: i % 2 === 1 ? 'rgba(255,255,255,0.04)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: '#475569', fontSize: 20, fontWeight: 600 }}>
                      {rank}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 24, fontWeight: 600 }}>
                      {medal}{emp.name}
                    </td>
                    <td style={{ padding: '16px 40px 16px 24px', textAlign: 'right', fontSize: 30, fontWeight: 800, color: qtyColor }}>
                      {emp.qty}{' '}
                      <span style={{ fontSize: 15, color: '#64748b', fontWeight: 400 }}>dona</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{
          padding: '14px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div key={i} style={{
              width: i === page ? 36 : 10,
              height: 10,
              borderRadius: 5,
              background: i === page ? '#3b82f6' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.4s',
            }} />
          ))}
          <span style={{ color: '#64748b', fontSize: 14, marginLeft: 16 }}>
            {page + 1} / {totalPages} &nbsp;·&nbsp; har 10 soniyada almashinadi
          </span>
        </div>
      )}
    </div>
  )
}
