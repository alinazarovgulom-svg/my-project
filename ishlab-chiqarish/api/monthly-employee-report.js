import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initFirebase() {
  if (getApps().length) return
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(sa) })
}

function getPrevMonthRange() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000) // Tashkent UTC+5
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth()
  const pad = n => String(n).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
    label: new Date(year, month - 1, 1).toLocaleString('uz-UZ', { month: 'long', year: 'numeric' }),
  }
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initFirebase()
    const db = getFirestore()
    const { from, to, label } = getPrevMonthRange()

    const [empSnap, entriesSnap, absSnap] = await Promise.all([
      db.collection('factory_employees').where('isActive', '!=', false).get(),
      db.collection('factory_work_entries').where('date', '>=', from).where('date', '<=', to).get(),
      db.collection('factory_absences').where('date', '>=', from).where('date', '<=', to).get(),
    ])

    const empMap = {}
    empSnap.docs.forEach(d => { empMap[d.id] = { id: d.id, ...d.data() } })

    const absMap = {}
    absSnap.docs.forEach(d => {
      const a = d.data()
      if (!absMap[a.employeeId]) absMap[a.employeeId] = 0
      absMap[a.employeeId]++
    })

    const summary = {}
    entriesSnap.docs.forEach(d => {
      const e = d.data()
      const empId = e.employeeId
      if (!empMap[empId]) return
      if (!summary[empId]) summary[empId] = { totalDays: 0, totalQty: 0, totalExp: 0, totalPay: 0 }
      summary[empId].totalDays++
      summary[empId].totalPay += Number(e.totalPay || 0)
      Object.values(e.operations || {}).forEach(op => {
        summary[empId].totalQty += Number(op.quantity || 0)
        summary[empId].totalExp += Number(op.expected || 0)
      })
    })

    const results = []
    for (const [empId, s] of Object.entries(summary)) {
      const emp = empMap[empId]
      if (!emp?.telegramId) continue
      const pct = s.totalExp > 0 ? Math.round((s.totalQty / s.totalExp) * 100) : null
      const absents = absMap[empId] || 0
      const pctIcon = !pct ? '⚪' : pct >= 100 ? '🟢' : pct >= 95 ? '🟡' : '🔴'

      let msg = `📊 <b>${label} — oylik hisobot</b>\n`
      msg += `👤 <b>${emp.lastName} ${emp.firstName}</b>\n\n`
      msg += `📅 Ish kunlari: ${s.totalDays}\n`
      msg += `📦 Bajarilgan: ${s.totalQty.toLocaleString()} dona\n`
      msg += `🎯 Kutilgan: ${Math.round(s.totalExp).toLocaleString()} dona\n`
      msg += `${pctIcon} Samaradorlik: <b>${pct !== null ? pct + '%' : '—'}</b>\n`
      if (absents > 0) msg += `❌ Kelmagan: ${absents} kun\n`
      if (s.totalPay > 0) msg += `\n💰 Jami maosh: <b>${s.totalPay.toLocaleString()} so'm</b>`

      try {
        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: emp.telegramId, text: msg, parse_mode: 'HTML' }),
          }
        )
        results.push({ empId, sent: true })
      } catch (e) {
        results.push({ empId, sent: false, error: e.message })
      }
    }

    return res.json({ ok: true, month: label, sent: results.length })
  } catch (err) {
    console.error('[monthly-employee-report]', err)
    return res.status(500).json({ error: err.message })
  }
}
