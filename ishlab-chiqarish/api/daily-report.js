import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DEPARTMENTS = [
  { id: 'bichuv',    name: "Bichuv bo'limi" },
  { id: 'kamzul',    name: "Kamzul bo'limi" },
  { id: 'shim',      name: "Shim bo'limi" },
  { id: 'tana',      name: "Tana bo'limi" },
  { id: 'astar',     name: "Astar bo'limi" },
  { id: 'montaj',    name: "Montaj bo'limi" },
  { id: 'pardoz',    name: "Pardoz dazmol bo'limi" },
  { id: 'qadoqlash', name: "Qadoqlash bo'limi" },
]

function initFirebase() {
  if (getApps().length) return
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(sa) })
}

function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

function effEmoji(eff) {
  if (eff === null || eff === 0) return '⚪'
  if (eff >= 100) return '🟢'
  if (eff >= 80) return '🟡'
  return '🔴'
}

function getTashkentDate() {
  const now = new Date()
  const tashkent = new Date(now.getTime() + 5 * 60 * 60 * 1000)
  return tashkent.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  // Vercel cron authorization
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initFirebase()
    const db = getFirestore()
    const today = getTashkentDate()

    const [deptSnap, empSnap, opSnap, entriesSnap] = await Promise.all([
      db.collection('factory_departments').get(),
      db.collection('factory_employees').get(),
      db.collection('factory_operations').get(),
      db.collection('factory_work_entries').where('date', '==', today).get(),
    ])

    const departments = deptSnap.empty
      ? DEPARTMENTS
      : deptSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const normMap = {}
    const finalOpMap = {}
    opSnap.docs.forEach(d => {
      const data = d.data()
      normMap[d.id] = data.norm || 0
      if (data.isFinal) finalOpMap[data.departmentId] = d.id
    })

    const deptData = {}
    departments.forEach(d => {
      deptData[d.id] = { name: d.name, employees: 0, attended: 0, done: 0, expected: 0, tayyor: 0 }
    })

    empSnap.docs.forEach(doc => {
      const { departmentId, isActive } = doc.data()
      if (deptData[departmentId] && isActive !== false) deptData[departmentId].employees++
    })

    const seenEmp = new Set()
    entriesSnap.docs.forEach(doc => {
      const d = doc.data()
      const dd = deptData[d.departmentId]
      if (!dd) return
      const key = `${d.departmentId}_${d.employeeId}`
      if (!seenEmp.has(key)) { seenEmp.add(key); dd.attended++ }
      const hours = calcHours(d.startTime, d.endTime)
      Object.entries(d.operations || {}).forEach(([opId, val]) => {
        const qty = Number(val.quantity || 0)
        dd.done += qty
        dd.expected += (normMap[opId] || 0) * hours
        if (finalOpMap[d.departmentId] === opId) dd.tayyor += qty
      })
    })

    const totalEmp      = Object.values(deptData).reduce((s, d) => s + d.employees, 0)
    const totalAttended = Object.values(deptData).reduce((s, d) => s + d.attended, 0)
    const totalDone     = Object.values(deptData).reduce((s, d) => s + d.done, 0)
    const totalExp      = Object.values(deptData).reduce((s, d) => s + d.expected, 0)
    const totalEff      = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : null
    const totalTayyor   = Object.values(deptData).reduce((s, d) => s + d.tayyor, 0)

    const deptLines = departments
      .map(dept => {
        const d = deptData[dept.id]
        if (!d || d.employees === 0) return null
        const eff = d.expected > 0 ? Math.round((d.done / d.expected) * 100) : null
        const absent = d.employees - d.attended
        return (
          `${effEmoji(eff)} *${d.name}*\n` +
          `   Kelgan: ${d.attended}/${d.employees}` +
          (absent > 0 ? ` (${absent} yo'q)` : '') +
          ` | ${eff !== null ? eff + '%' : '—'}`
        )
      })
      .filter(Boolean)
      .join('\n')

    const overallEmoji = effEmoji(totalEff)
    const dateFormatted = today.split('-').reverse().join('.')

    const message =
      `🏭 *KAFTIMDA — Kunlik Xisobot*\n` +
      `📅 ${dateFormatted}\n\n` +
      `📊 *Umumiy ko'rsatkichlar:*\n` +
      `👥 Kelgan: ${totalAttended}/${totalEmp} xodim\n` +
      `${overallEmoji} Samaradorlik: ${totalEff !== null ? totalEff + '%' : 'Ma\\'lumot yo\\'q'}\n` +
      `📦 Tayyor mahsulot: ${totalTayyor} dona\n\n` +
      `*Bo'limlar holati:*\n` +
      (deptLines || '⚪ Bugun ma\\'lumot kiritilmagan') +
      `\n\n_KAFTIMDA ishlab chiqarish tizimi_`

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    )

    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram error: ${JSON.stringify(tgData)}`)

    return res.json({ ok: true, date: today, sent: true })
  } catch (err) {
    console.error('[daily-report]', err)
    return res.status(500).json({ error: err.message })
  }
}
