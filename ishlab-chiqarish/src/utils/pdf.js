import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPDF(rows, filters, deptName) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pw = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text('kaftimda@gmail.com', 14, 14)
  doc.text('+998 91 760 66 66', 14, 20)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('KAFTIMDA', pw - 14, 14, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`${deptName} · ${filters}`, pw - 14, 20, { align: 'right' })

  // Table
  autoTable(doc, {
    startY: 28,
    head: [['#', 'Ismi Familyasi', 'Bo\'lim', 'Operatsiya', 'Norma', 'Bajargan', 'Kutilgan', 'Izoh']],
    body: rows.map((r, i) => [
      i + 1,
      r.empName,
      r.deptName,
      r.opName,
      `${r.norm} dona/soat`,
      r.quantity,
      r.expected.toFixed(0),
      r.note || '',
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const row = rows[data.row.index]
        if (!row) return
        const qty = Number(row.quantity)
        const exp = Number(row.expected)
        if (qty > exp) {
          data.cell.styles.fillColor = [144, 238, 144]
          data.cell.styles.textColor = [22, 101, 52]
        } else if (qty === exp) {
          data.cell.styles.fillColor = [253, 224, 71]
          data.cell.styles.textColor = [92, 77, 6]
        } else {
          data.cell.styles.fillColor = [254, 202, 202]
          data.cell.styles.textColor = [153, 27, 27]
        }
      }
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  doc.save(`hisobot_${Date.now()}.pdf`)
}
