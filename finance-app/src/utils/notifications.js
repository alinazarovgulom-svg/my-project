export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted'
}

async function getSwReg() {
  if (!('serviceWorker' in navigator)) return null
  try { return await navigator.serviceWorker.ready } catch { return null }
}

export async function sendNotification(title, body, options = {}) {
  if (!canNotify()) return
  const reg = await getSwReg()
  const opts = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    tag: options.tag || 'pulbek',
    data: { url: options.url || '/' },
    ...options,
  }
  if (reg) {
    reg.showNotification(title, opts)
  } else {
    new Notification(title, opts)
  }
}

export async function notifyNewTransaction(tx) {
  const typeLabel = tx.type === 'income' ? '💰 Kirim' : '💸 Chiqim'
  const amount = new Intl.NumberFormat('uz-UZ').format(tx.amount)
  const cur = tx.currency || 'UZS'
  await sendNotification(
    `${typeLabel} qo'shildi`,
    `${amount} ${cur} — ${tx.category}${tx.note ? ': ' + tx.note : ''}`,
    { tag: 'tx-new', url: '/transactions' }
  )
}

export async function checkDebtDueNotifications(debts) {
  if (!canNotify()) return
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  for (const d of debts) {
    if (!d.dueDate || d.remaining <= 0) continue
    const due = new Date(d.dueDate)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due - now) / 86400000)

    if (diffDays < 0) {
      await sendNotification(
        '🔴 Qarz muddati o\'tib ketdi!',
        `${d.person} — ${new Intl.NumberFormat('uz-UZ').format(d.remaining)} ${d.currency || 'UZS'} (${Math.abs(diffDays)} kun oldin o'tgan)`,
        { tag: `debt-overdue-${d.id}`, url: '/debts' }
      )
    } else if (diffDays === 0) {
      await sendNotification(
        '⚠️ Qarz bugun qaytarilishi kerak!',
        `${d.person} — ${new Intl.NumberFormat('uz-UZ').format(d.remaining)} ${d.currency || 'UZS'}`,
        { tag: `debt-today-${d.id}`, url: '/debts' }
      )
    } else if (diffDays <= 3) {
      await sendNotification(
        `⏰ Qarz muddati ${diffDays} kun qoldi`,
        `${d.person} — ${new Intl.NumberFormat('uz-UZ').format(d.remaining)} ${d.currency || 'UZS'}`,
        { tag: `debt-soon-${d.id}`, url: '/debts' }
      )
    }
  }
}
