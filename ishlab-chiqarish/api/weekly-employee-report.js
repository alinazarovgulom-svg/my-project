import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initFirebase() {
  if (getApps().length) return
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(sa) })
}

function getPrevWeekRange() {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000) // Tashkent UTC+5
  // Cron shanba kuni ishlaydi — dushanba (−5) dan juma (−1) gacha
  const pad = n => String(n).padStart(2, '0')
  const fmt = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

  const saturday = new Date(now)
  saturday.setUTCHours(0, 0, 0, 0)

  const monday = new Date(saturday)
  monday.setUTCDate(saturday.getUTCDate() - 5)

  const friday = new Date(saturday)
  friday.setUTCDate(saturday.getUTCDate() - 1)

  const monthName = monday.toLocaleString('uz-UZ', { month: 'long' })
  const label = `${monday.getUTCDate()}–${friday.getUTCDate()} ${monthName}`

  return { from: fmt(monday), to: fmt(friday), label }
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    initFirebase()
    const db = getFirestore()
    const { from, to, label } = getPrevWeekRange()

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
      if (!summary[empId]) summary[empId] = { totalDays: 0, totalHours: 0, totalQty: 0, totalPay: 0 }
      summary[empId].totalDays++
      summary[empId].totalPay += Number(e.totalPay || 0)

      // Ishlagan soatni hisoblash
      if (e.startTime && e.endTime) {
        const [sh, sm] = e.startTime.split(':').map(Number)
        const [eh, em] = e.endTime.split(':').map(Number)
        const hrs = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60 - (e.breakMinutes || 0) / 60)
        summary[empId].totalHours += hrs
      }

      Object.values(e.operations || {}).forEach(op => {
        summary[empId].totalQty += Number(op.quantity || 0)
      })
    })

    const results = []
    for (const [empId, s] of Object.entries(summary)) {
      const emp = empMap[empId]
      if (!emp?.telegramId) continue
      const absents = absMap[empId] || 0

      let msg = `📈 <b>Haftalik hisobot (${label})</b>\n`
      msg += `👤 <b>${emp.lastName} ${emp.firstName}</b>\n\n`
      msg += `📅 Ish kunlari: ${s.totalDays}\n`
      msg += `⏱ Jami soat: ${s.totalHours.toFixed(1)} soat\n`
      msg += `📦 Bajarilgan: ${s.totalQty.toLocaleString()} dona\n`
      if (absents > 0) msg += `❌ Kelmagan: ${absents} kun\n`
      if (s.totalPay > 0) msg += `\n💰 Haftalik maosh: <b>${s.totalPay.toLocaleString()} so'm</b>`

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

    return res.json({ ok: true, week: label, sent: results.length })
  } catch (err) {
    console.error('[weekly-employee-report]', err)
    return res.status(500).json({ error: err.message })
  }
}
