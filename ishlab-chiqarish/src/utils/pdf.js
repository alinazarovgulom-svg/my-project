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
  const ph = doc.internal.pageSize.getHeight()

  // ── HEADER BANNER ──────────────────────────────────────────────
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pw, 30, 'F')

  // Accent stripe
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 28, pw, 2, 'F')

  // Logo area background circle
  doc.setFillColor(255, 255, 255, 0.15)

  // KAFTIMDA
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('KAFTIMDA', 14, 16)

  doc.setFontSize(8)
  doc.setTextColor(147, 197, 253)
  doc.text('Ishlab chiqarish tizimi', 14, 23)

  // Right side info
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(deptName, pw - 14, 13, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setTextColor(147, 197, 253)
  doc.text(filters, pw - 14, 20, { align: 'right' })
  doc.text(
    `Chiqarilgan: ${new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
    pw - 14, 26.5, { align: 'right' }
  )

  // ── SUMMARY STATS ──────────────────────────────────────────────
  const totalDone = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp  = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const eff       = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount  = new Set(rows.map(r => r.empName)).size
  const opCount   = new Set(rows.map(r => r.opName)).size

  const stats = [
    { label: 'Xodimlar',      value: String(empCount),            bg: [239, 246, 255], val: [30, 64, 175],  lbl: [71, 85, 105] },
    { label: 'Operatsiyalar', value: String(opCount),             bg: [240, 253, 244], val: [21, 128, 61],  lbl: [71, 85, 105] },
    { label: 'Bajargan',      value: String(totalDone),           bg: [254, 252, 232], val: [133, 77, 14],  lbl: [71, 85, 105] },
    { label: 'Kutilgan',      value: totalExp.toFixed(0),         bg: [248, 250, 252], val: [51, 65, 85],   lbl: [71, 85, 105] },
    {
      label: 'Samaradorlik',
      value: `${eff}%`,
      bg: eff >= 100 ? [240, 253, 244] : eff >= 80 ? [254, 252, 232] : [254, 242, 242],
      val: eff >= 100 ? [21, 128, 61]  : eff >= 80 ? [133, 77, 14]  : [153, 27, 27],
      lbl: [71, 85, 105],
    },
  ]

  const boxW = (pw - 28 - 16) / 5
  stats.forEach((s, i) => {
    const x = 14 + i * (boxW + 4)
    const y = 34

    // Card background
    doc.setFillColor(...s.bg)
    doc.roundedRect(x, y, boxW, 20, 2, 2, 'F')

    // Card border
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, boxW, 20, 2, 2, 'S')

    // Value
    doc.setFontSize(13)
    doc.setTextColor(...s.val)
    doc.text(s.value, x + boxW / 2, y + 11, { align: 'center' })

    // Label
    doc.setFontSize(6.5)
    doc.setTextColor(...s.lbl)
    doc.text(s.label, x + boxW / 2, y + 17, { align: 'center' })
  })

  // ── PIVOT TABLE ────────────────────────────────────────────────
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
    return multiDate ? `${date} ${time}` : time
  })

  const head = [['#', 'Xodim', "Bo'lim", 'Operatsiya', 'Norma', ...slotHeaders, 'Jami']]

  const body = gRows.map((r, i) => {
    const td = slots.reduce((s, k) => s + (r.slots[k]?.quantity || 0), 0)
    const te = slots.reduce((s, k) => s + (r.slots[k]?.expected || 0), 0)
    return [
      i + 1,
      r.empName,
      r.deptName,
      r.opName,
      `${r.norm}/soat`,
      ...slots.map(k => {
        const d = r.slots[k]
        return d ? `${d.quantity}/${d.expected.toFixed(0)}` : '-'
      }),
      `${td}/${te.toFixed(0)}`,
    ]
  })

  autoTable(doc, {
    startY: 58,
    head,
    body,
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      font: 'PTSans',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      font: 'PTSans',
      fontSize: 7,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    willDrawCell: (data) => {
      if (data.section !== 'body') return
      const slotStart = 5
      const totalCol  = 5 + slots.length
      if (data.column.index < slotStart) return

      const r = gRows[data.row.index]
      if (!r) return

      let done, exp
      if (data.column.index === totalCol) {
        done = slots.reduce((s, k) => s + (r.slots[k]?.quantity || 0), 0)
        exp  = slots.reduce((s, k) => s + (r.slots[k]?.expected || 0), 0)
      } else {
        const sd = r.slots[slots[data.column.index - slotStart]]
        if (!sd) return
        done = sd.quantity
        exp  = sd.expected
      }

      if (done > exp) {
        doc.setFillColor(220, 252, 231)
      } else if (done === exp) {
        doc.setFillColor(254, 249, 195)
      } else {
        doc.setFillColor(254, 226, 226)
      }
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
    },
  })

  // ── LEGEND ─────────────────────────────────────────────────────
  const legendY = doc.lastAutoTable.finalY + 6
  if (legendY < ph - 14) {
    const items = [
      { color: [220, 252, 231], text: 'Normadan yuqori' },
      { color: [254, 249, 195], text: 'Normaga teng' },
      { color: [254, 226, 226], text: 'Normadan past' },
    ]
    let lx = 14
    items.forEach(item => {
      doc.setFillColor(...item.color)
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.roundedRect(lx, legendY, 4, 4, 1, 1, 'FD')
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text(item.text, lx + 6, legendY + 3)
      lx += 42
    })
  }

  // ── FOOTER ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(248, 250, 252)
    doc.rect(0, ph - 10, pw, 10, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(0, ph - 10, pw, ph - 10)
    doc.setFontSize(6.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`${p} / ${pageCount}`, pw / 2, ph - 4, { align: 'center' })
    doc.text('kaftimda@gmail.com  ·  +998 91 760 66 66', pw - 14, ph - 4, { align: 'right' })
    doc.setTextColor(30, 64, 175)
    doc.text('KAFTIMDA', 14, ph - 4)
  }

  doc.save(`hisobot_${Date.now()}.pdf`)
}
