import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

async function addCyrillicFont(doc) {
  const res = await fetch('/fonts/PTSans-Regular.ttf')
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  const base64 = btoa(binary)
  doc.addFileToVFS('PTSans-Regular.ttf', base64)
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
}

export async function exportPDF(rows, filters, deptName) {
  const doc = new jsPDF({ orientation: 'landscape' })
  await addCyrillicFont(doc)
  doc.setFont('PTSans', 'normal')

  const pw = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(14)
  doc.setTextColor(30, 64, 175)
  doc.text('KAFTIMDA', 14, 14)
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`${deptName} · ${filters}`, 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text('kaftimda@gmail.com', pw - 14, 14, { align: 'right' })
  doc.text('+998 91 760 66 66', pw - 14, 20, { align: 'right' })

  // Build pivot: unique time slots
  const slots = [...new Set(rows.map(r => `${r.date}|${r.startTime}–${r.endTime}`))].sort()
  const multiDate = new Set(rows.map(r => r.date)).size > 1

  const grouped = {}
  rows.forEach(r => {
    const key = `${r.empName}|||${r.deptName}|||${r.opName}`
    if (!grouped[key]) {
      grouped[key] = { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, slots: {} }
    }
    grouped[key].slots[`${r.date}|${r.startTime}–${r.endTime}`] = {
      quantity: r.quantity, expected: r.expected,
    }
  })
  const gRows = Object.values(grouped)

  const slotHeaders = slots.map(s => {
    const [date, time] = s.split('|')
    return multiDate ? `${date}\n${time}` : time
  })

  const head = [['#', 'Xodim', "Bo'lim", 'Operatsiya', 'Norma', ...slotHeaders, 'Jami']]

  const body = gRows.map((r, i) => {
    const totalDone = slots.reduce((s, k) => s + (r.slots[k]?.quantity || 0), 0)
    const totalExp = slots.reduce((s, k) => s + (r.slots[k]?.expected || 0), 0)
    return [
      i + 1,
      r.empName,
      r.deptName,
      r.opName,
      `${r.norm} dona/soat`,
      ...slots.map(k => r.slots[k] ? `${r.slots[k].quantity} / ${r.slots[k].expected.toFixed(0)}` : '—'),
      `${totalDone} / ${totalExp.toFixed(0)}`,
    ]
  })

  autoTable(doc, {
    startY: 28,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 2, font: 'PTSans' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, font: 'PTSans' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  doc.save(`hisobot_${Date.now()}.pdf`)
}
