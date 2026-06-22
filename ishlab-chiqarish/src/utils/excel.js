import * as XLSX from 'xlsx'

export function exportExcel(rows, filters, deptName, showDept = true) {
  const cols = showDept
    ? ['#', 'Ismi Familyasi', "Bo'lim", 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Izoh']
    : ['#', 'Ismi Familyasi', 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Izoh']
  const colCount = cols.length

  const header = [
    ['KAFTIMDA', ...Array(colCount - 1).fill('')],
    ['kaftimda@gmail.com', ...Array(colCount - 1).fill('')],
    ['+998 91 760 66 66', ...Array(colCount - 1).fill('')],
    [`${deptName} · ${filters}`, ...Array(colCount - 1).fill('')],
    [],
    cols,
  ]

  const data = rows.map((r, i) => showDept
    ? [i + 1, r.empName, r.deptName, r.opName, r.norm, r.quantity, Number(r.expected.toFixed(0)), r.note || '']
    : [i + 1, r.empName, r.opName, r.norm, r.quantity, Number(r.expected.toFixed(0)), r.note || '']
  )

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...header, ...data])

  ws['!cols'] = showDept
    ? [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 30 }]
    : [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 30 }]

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Hisobot')
  XLSX.writeFile(wb, `hisobot_${Date.now()}.xlsx`)
}
