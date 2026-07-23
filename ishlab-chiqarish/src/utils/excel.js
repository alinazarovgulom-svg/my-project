import * as XLSX from 'xlsx'

export function exportExcel(rows, filters, deptName, showDept = true) {
  const cols = showDept
    ? ['#', 'Ismi Familyasi', "Bo'lim", 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Foiz', 'Izoh']
    : ['#', 'Ismi Familyasi', 'Operatsiya', 'Norma (dona/soat)', 'Bajargan', 'Kutilgan', 'Foiz', 'Izoh']
  const colCount = cols.length

  const header = [
    ['KAFTIMDA', ...Array(colCount - 1).fill('')],
    ['kaftimda@gmail.com', ...Array(colCount - 1).fill('')],
    ['+998 91 760 66 66', ...Array(colCount - 1).fill('')],
    [`${deptName} · ${filters}`, ...Array(colCount - 1).fill('')],
    [],
    cols,
  ]

  const data = rows.map((r, i) => {
    const exp = Number(r.expected) || 0
    const pct = exp > 0 ? Math.round((Number(r.quantity) / exp) * 100) + '%' : '—'
    // Shaxsiy norma bo'lsa belgilanadi
    const normCell = r.isCustomNorm ? `${r.norm} (shaxsiy)` : r.norm
    return showDept
      ? [i + 1, r.empName, r.deptName, r.opName, normCell, r.quantity, Number(exp.toFixed(0)), pct, r.note || '']
      : [i + 1, r.empName, r.opName, normCell, r.quantity, Number(exp.toFixed(0)), pct, r.note || '']
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...header, ...data])

  ws['!cols'] = showDept
    ? [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 }]
    : [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 30 }]

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

  // Fixed header rows (indexes 0-6)
  const headerRows = [
    ['KAFTIMDA', '', '', ''],
    ['kaftimda@gmail.com', '', '', ''],
    ['+998 91 760 66 66', '', '', ''],
    [`Davomat hisoboti · ${fmtDateXl(date)}`, '', '', ''],
    [`Jami: ${allEmps.length}  |  Kelgan: ${totalPresent}  |  Kelmagan: ${absentEmps.length}`, '', '', ''],
    [],
    ['#', 'Ism Familyasi', 'Sabab', 'Izoh'],
  ]
  const HEADER_COUNT = headerRows.length // 7

  // Group by department
  const deptGroups = departments
    .map(dept => ({ dept, emps: absentEmps.filter(e => e.departmentId === dept.id) }))
    .filter(g => g.emps.length > 0)

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
  ]

  let currentRow = HEADER_COUNT
  const dataRows = []

  deptGroups.forEach(({ dept, emps }) => {
    // Department header row (merged across all columns)
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } })
    dataRows.push([`${dept.name}  (${emps.length} nafar)`, '', '', ''])
    currentRow++

    emps.forEach((emp, i) => {
      const abs = absences[emp.id]
      dataRows.push([
        i + 1,
        `${emp.lastName} ${emp.firstName}`,
        REASON_LABELS_XL[abs?.reason] || '',
        abs?.note || '',
      ])
      currentRow++
    })
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])

  ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 12 }, { wch: 30 }]
  ws['!merges'] = merges

  XLSX.utils.book_append_sheet(wb, ws, 'Davomat')
  XLSX.writeFile(wb, `davomat_${date}.xlsx`)
}
