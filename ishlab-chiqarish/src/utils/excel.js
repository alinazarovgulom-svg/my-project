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

const REASON_LABELS_XL = {
  kasallik: 'Kasallik',
  tatil:    "Ta'til",
  sababsiz: 'Sababsiz',
  boshqa:   'Boshqa',
}

function fmtDateXl(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function exportAttendanceExcel(absentEmps, allEmps, absences, departments, date) {
  const getDeptName  = id => departments.find(d => d.id === id)?.name || id
  const totalPresent = allEmps.length - absentEmps.length

  const header = [
    ['KAFTIMDA', '', '', '', ''],
    ['kaftimda@gmail.com', '', '', '', ''],
    ['+998 91 760 66 66', '', '', '', ''],
    [`Davomat hisoboti · ${fmtDateXl(date)}`, '', '', '', ''],
    [`Jami: ${allEmps.length}  |  Kelgan: ${totalPresent}  |  Kelmagan: ${absentEmps.length}`, '', '', '', ''],
    [],
    ['#', 'Ism Familyasi', "Bo'lim", 'Sabab', 'Izoh'],
  ]

  const data = absentEmps.map((emp, i) => {
    const abs = absences[emp.id]
    return [
      i + 1,
      `${emp.lastName} ${emp.firstName}`,
      getDeptName(emp.departmentId),
      REASON_LABELS_XL[abs?.reason] || '',
      abs?.note || '',
    ]
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...header, ...data])

  ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 22 }, { wch: 12 }, { wch: 30 }]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Davomat')
  XLSX.writeFile(wb, `davomat_${date}.xlsx`)
}
