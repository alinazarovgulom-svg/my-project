import * as XLSX from 'xlsx'

export function exportExcel(rows, filters, deptName) {
  const header = [
    ['KAFTIMDA', '', '', '', '', '', '', ''],
    ['kaftimda@gmail.com', '', '', '', '', '', '', ''],
    ['+998 91 760 66 66', '', '', '', '', '', '', ''],
    [`${deptName} · ${filters}`, '', '', '', '', '', '', ''],
    [],
    ['#', 'Ismi Familyasi', "Bo'lim", 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Izoh'],
  ]

  const data = rows.map((r, i) => [
    i + 1,
    r.empName,
    r.deptName,
    r.opName,
    r.norm,
    r.quantity,
    Number(r.expected.toFixed(0)),
    r.note || '',
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...header, ...data])

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
  ]

  // Merge header cells
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Hisobot')
  XLSX.writeFile(wb, `hisobot_${Date.now()}.xlsx`)
}
