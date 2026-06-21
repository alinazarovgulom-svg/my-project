import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

async function addCyrillicFont(doc) {
  const res = await fetch('/fonts/PTSans-Regular.ttf')
  if (!res.ok) throw new Error(`Font 404`)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  doc.addFileToVFS('PTSans-Regular.ttf', btoa(binary))
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
  return 'PTSans'
}

export async function exportPDF(rows, filters, deptName) {
  const doc = new jsPDF({ orientation: 'landscape' })

  let font = 'helvetica'
  try { font = await addCyrillicFont(doc) } catch (e) { console.warn(e) }

  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  // ── HEADER ─────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pw, 30, 'F')
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 28, pw, 2, 'F')

  doc.setFont(font, 'normal')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('KAFTIMDA', 14, 16)
  doc.setFontSize(8)
  doc.setTextColor(147, 197, 253)
  doc.text('Ishlab chiqarish tizimi', 14, 23)

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

  // ── STATS ──────────────────────────────────────────────────────
  const totalDone = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp  = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const eff       = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount  = new Set(rows.map(r => r.empName)).size

  const stats = [
    { label: 'Xodimlar',     value: String(empCount),       bg: [239, 246, 255], vc: [30, 64, 175] },
    { label: 'Bajargan',     value: String(totalDone),      bg: [240, 253, 244], vc: [21, 128, 61] },
    { label: 'Kutilgan',     value: totalExp.toFixed(0),    bg: [254, 252, 232], vc: [133, 77, 14] },
    {
      label: 'Samaradorlik', value: `${eff}%`,
      bg: eff >= 100 ? [240, 253, 244] : eff >= 80 ? [254, 252, 232] : [254, 242, 242],
      vc: eff >= 100 ? [21, 128, 61]   : eff >= 80 ? [133, 77, 14]   : [153, 27, 27],
    },
  ]

  const boxW = (pw - 28 - 12) / 4
  stats.forEach((s, i) => {
    const x = 14 + i * (boxW + 4)
    const y = 34
    doc.setFillColor(...s.bg)
    doc.rect(x, y, boxW, 18, 'F')
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.rect(x, y, boxW, 18, 'S')
    doc.setFont(font, 'normal')
    doc.setFontSize(13)
    doc.setTextColor(...s.vc)
    doc.text(s.value, x + boxW / 2, y + 10, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(s.label, x + boxW / 2, y + 15.5, { align: 'center' })
  })

  // ── TABLE (flat) ───────────────────────────────────────────────
  const head = [['#', 'Xodim', "Bo'lim", 'Sana', 'Vaqt', 'Operatsiya', 'Norma', 'Bajargan', 'Kutilgan']]
  const body = rows.map((r, i) => [
    i + 1,
    r.empName,
    r.deptName,
    r.date,
    `${r.startTime}-${r.endTime}`,
    r.opName,
    `${r.norm}/soat`,
    String(r.quantity),
    r.expected.toFixed(0),
  ])

  autoTable(doc, {
    startY: 56,
    head,
    body,
    styles: { fontSize: 7.5, cellPadding: 3, font, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], font, fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 7) return
      const r = rows[data.row.index]
      if (!r) return
      const done = Number(r.quantity)
      const exp  = Number(r.expected)
      if (done > exp)       { doc.setFillColor(220, 252, 231) }
      else if (done === exp) { doc.setFillColor(254, 249, 195) }
      else                  { doc.setFillColor(254, 226, 226) }
      doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F')
      doc.setFont(font, 'normal')
      doc.setFontSize(7.5)
      if (done > exp)       doc.setTextColor(22, 101, 52)
      else if (done === exp) doc.setTextColor(113, 63, 18)
      else                  doc.setTextColor(153, 27, 27)
      doc.text(String(done), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' })
    },
  })

  // ── LEGEND ─────────────────────────────────────────────────────
  const finalY = (doc.lastAutoTable?.finalY ?? 56) + 6
  if (finalY < ph - 16) {
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
      doc.rect(lx, finalY, 4, 4, 'FD')
      doc.setFont(font, 'normal')
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text(item.text, lx + 6, finalY + 3)
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
    doc.setFont(font, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(30, 64, 175)
    doc.text('KAFTIMDA', 14, ph - 4)
    doc.setTextColor(148, 163, 184)
    doc.text(`${p} / ${pageCount}`, pw / 2, ph - 4, { align: 'center' })
    doc.text('kaftimda@gmail.com  ·  +998 91 760 66 66', pw - 14, ph - 4, { align: 'right' })
  }

  doc.save(`hisobot_${Date.now()}.pdf`)
}
