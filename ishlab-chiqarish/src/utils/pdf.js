function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  // '2026-06-21' → '21.06.2026'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function qtyStyle(qty, exp) {
  if (qty > exp)   return { bg: '#dcfce7', color: '#15803d' }
  if (qty === exp) return { bg: '#fef9c3', color: '#854d0e' }
  return               { bg: '#fee2e2', color: '#991b1b' }
}

export function exportPDF(rows, filters, deptName, showDept = true) {
  if (!rows.length) return

  // ── Global stats ─────────────────────────────────────────────────────────
  const totalDone   = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp    = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const totalTayyor = rows.filter(r => r.isFinal).reduce((s, r) => s + Number(r.quantity || 0), 0)
  const eff         = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount    = new Set(rows.map(r => r.empName)).size
  const effColor    = eff >= 100 ? '#15803d' : eff >= 80 ? '#854d0e' : '#991b1b'
  const effBg       = eff >= 100 ? '#f0fdf4' : eff >= 80 ? '#fefce8' : '#fef2f2'

  // ── Employee efficiency ranking (across all dates) ───────────────────────
  const empStats = new Map()
  rows.forEach(r => {
    const s = empStats.get(r.empName) ?? { done: 0, exp: 0, deptName: r.deptName }
    s.done += Number(r.quantity || 0)
    s.exp  += Number(r.expected  || 0)
    empStats.set(r.empName, s)
  })
  // Sort: highest efficiency first; equal → alphabetical
  const empRank = new Map(
    [...empStats.entries()]
      .sort(([nameA, a], [nameB, b]) => {
        const ea = a.exp > 0 ? a.done / a.exp : 0
        const eb = b.exp > 0 ? b.done / b.exp : 0
        return eb - ea || nameA.localeCompare(nameB)
      })
      .map(([name], i) => [name, i])
  )
  function empEff(name) {
    const s = empStats.get(name)
    return s && s.exp > 0 ? Math.round((s.done / s.exp) * 100) : 0
  }

  // ── Group rows by date ────────────────────────────────────────────────────
  const dates = [...new Set(rows.map(r => r.date))].sort()

  const sections = dates.map(date => {
    const dr = rows.filter(r => r.date === date)

    const slots = [...new Set(dr.map(r => `${r.startTime}–${r.endTime}`))].sort()

    const groupMap = new Map()
    dr.forEach(r => {
      const key = `${r.empName}||${r.deptName}||${r.opName}||${r.norm}`
      if (!groupMap.has(key)) {
        groupMap.set(key, { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, bySlot: {} })
      }
      groupMap.get(key).bySlot[`${r.startTime}–${r.endTime}`] = {
        qty: Number(r.quantity), exp: Number(r.expected), note: r.note || '',
      }
    })

    // Sort groups by employee rank (best first), then operation name
    const groups = [...groupMap.values()].sort((a, b) =>
      (empRank.get(a.empName) ?? 999) - (empRank.get(b.empName) ?? 999) ||
      a.opName.localeCompare(b.opName)
    )

    return { date, slots, groups }
  })

  // ── Build each date section ───────────────────────────────────────────────
  const sectionsHtml = sections.map(({ date, slots, groups }) => {
    const slotHeaders = slots
      .map(s => `<th class="slot-th">${esc(s)}</th>`)
      .join('')

    let prevEmp = null
    const tableRows = groups.map((g, i) => {
      const isFirst = g.empName !== prevEmp
      prevEmp = g.empName

      const totDone = slots.reduce((s, sl) => s + (g.bySlot[sl]?.qty ?? 0), 0)
      const totExp  = slots.reduce((s, sl) => s + (g.bySlot[sl]?.exp ?? 0), 0)
      const { bg: tBg, color: tCol } = qtyStyle(totDone, totExp)

      const slotCells = slots.map(sl => {
        const e = g.bySlot[sl]
        if (!e) return `<td class="slot-td empty">—</td>`
        const { bg, color } = qtyStyle(e.qty, e.exp)
        return `<td class="slot-td">
          <div class="qty-badge" style="background:${bg}">
            <div class="qty-num" style="color:${color}">${e.qty}</div>
            <div class="qty-exp">${e.exp}</div>
          </div>
          ${e.note ? `<div class="slot-note">${esc(e.note)}</div>` : ''}
        </td>`
      }).join('')

      return `<tr class="${i % 2 === 1 ? 'row-alt' : ''}">
        <td class="td-num">${i + 1}</td>
        <td class="td-name">${isFirst ? (() => {
          const rank = (empRank.get(g.empName) ?? 0) + 1
          const e = empEff(g.empName)
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
          const ec = e >= 100 ? '#15803d' : e >= 80 ? '#854d0e' : '#991b1b'
          const eb = e >= 100 ? '#f0fdf4' : e >= 80 ? '#fefce8' : '#fef2f2'
          return `<span style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap">
            <span style="font-size:11px">${medal}</span>
            <strong>${esc(g.empName)}</strong>
            <span style="background:${eb};color:${ec};border-radius:8px;padding:2px 6px;font-size:9px;font-weight:700;white-space:nowrap">${e}%</span>
          </span>`
        })() : ''}</td>
        ${showDept ? `<td class="td-dept">${isFirst ? `<span class="dept-badge">${esc(g.deptName)}</span>` : ''}</td>` : ''}
        <td class="td-op">${esc(g.opName)}</td>
        <td class="td-norm">${esc(g.norm)} dona/soat</td>
        ${slotCells}
        <td class="slot-td">
          <div class="qty-badge" style="background:${tBg}">
            <div class="qty-num" style="color:${tCol}">${totDone}</div>
            <div class="qty-exp">${totExp.toFixed(0)}</div>
          </div>
        </td>
      </tr>`
    }).join('')

    return `
      <div class="date-section">
        <div class="date-hdr">${fmtDate(date)}</div>
        <table>
          <thead>
            <tr>
              <th class="th-num">#</th>
              <th>Xodim</th>
              ${showDept ? `<th>Bo'lim</th>` : ''}
              <th>Operatsiya</th>
              <th>Norma</th>
              ${slotHeaders}
              <th class="slot-th">Jami</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`
  }).join('')

  const printed = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Hisobot – KAFTIMDA</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:10px; color:#1e293b; }

  /* Header */
  .hdr { background:#0f1c3a; color:#fff; padding:13px 18px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #D97706; margin-bottom:7px; }
  .hdr-l .brand { font-size:22px; font-weight:900; letter-spacing:0.3px; line-height:1.1; }
  .hdr-l .amber { width:68px; height:2.5px; background:#D97706; border-radius:1px; margin-top:5px; }
  .hdr-l .sub   { font-size:10px; color:#93c5fd; margin-top:7px; line-height:1.7; font-weight:500; }
  .hdr-r { display:flex; align-items:center; gap:22px; }
  .hdr-r .contacts { text-align:right; }
  .hdr-r .detail { font-size:9.5px; color:#94a3b8; margin-top:3px; display:flex; align-items:center; justify-content:flex-end; gap:4px; }
  .hdr-r .detail:first-child { margin-top:0; }
  .hdr-r .insta  { display:flex; flex-direction:column; align-items:center; gap:6px; }
  .hdr-r .insta-handle { color:#94a3b8; font-size:9.5px; white-space:nowrap; }

  /* Stat cards */
  .stats { display:flex; gap:6px; margin-bottom:8px; }
  .card  { flex:1; border-radius:6px; padding:6px 10px;
           border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:14px; font-weight:700; }
  .card-lbl { font-size:8px; color:#64748b; margin-top:1px; }

  /* Date section */
  .date-section { margin-bottom:10px; }
  .date-hdr { background:#1e40af; color:#fff; font-size:10px; font-weight:700;
              padding:4px 8px; border-radius:4px 4px 0 0; letter-spacing:.3px; }

  /* Table */
  table { width:100%; border-collapse:collapse; font-size:10px; }
  thead { display:table-header-group; }   /* repeat header on every printed page */
  thead tr { background:#334155; color:#fff; }
  thead th { padding:5px 6px; text-align:left; font-weight:600;
             font-size:9px; white-space:nowrap; }
  .th-num  { width:22px; text-align:center; }
  .slot-th { text-align:center; }
  .row-alt { background:#f8fafc; }
  tbody tr { border-bottom:1px solid #f1f5f9; page-break-inside:avoid; }
  tbody td { padding:5px 6px; vertical-align:middle; }
  .td-num  { color:#94a3b8; text-align:center; width:22px; }
  .td-name { font-weight:700; white-space:nowrap; font-size:11px; }
  .td-dept { white-space:nowrap; }
  .td-op   { font-size:11px; }
  .td-norm { color:#64748b; white-space:nowrap; font-size:9.5px; }
  .dept-badge { background:#eff6ff; color:#1d4ed8; padding:2px 7px;
                border-radius:10px; font-size:9.5px; white-space:nowrap; }
  .slot-td { text-align:center; padding:3px 4px; }
  .slot-td.empty { color:#94a3b8; font-size:11px; }
  .qty-badge { border-radius:5px; padding:3px 6px; display:inline-block; min-width:36px; }
  .qty-num { font-weight:700; font-size:12px; line-height:1.3; }
  .qty-exp { font-size:8.5px; color:#64748b; line-height:1.3; }
  .slot-note { font-size:8px; color:#475569; font-style:italic; margin-top:2px; max-width:80px; word-wrap:break-word; }

  /* Legend */
  .legend { display:flex; align-items:center; gap:12px; margin-top:8px;
            padding-top:6px; border-top:1px solid #e2e8f0; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:9px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .legend-note { margin-left:auto; font-size:8px; color:#94a3b8; }

  /* Footer */
  .footer { display:flex; justify-content:space-between; margin-top:7px;
            padding-top:5px; border-top:1px solid #e2e8f0;
            font-size:8.5px; color:#94a3b8; }
  .footer .brand { color:#1e40af; font-weight:700; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .date-hdr { page-break-after:avoid; }        /* date title stays with its table */
    tbody tr  { page-break-inside:avoid; }       /* no row cut in half across pages */
  }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-l">
    <div class="brand">KAFTIMDA</div>
    <div class="amber"></div>
    <div class="sub">${esc(deptName)} &nbsp;·&nbsp; ${esc(filters)}<br>Chiqarilgan: ${printed}</div>
  </div>
  <div class="hdr-r">
    <div class="contacts">
      <div class="detail">kaftimda@gmail.com</div>
      <div class="detail">
        <svg viewBox="0 0 16 16" width="11" height="11" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.3 6.9c1 2 2.8 3.7 4.8 4.8l1.6-1.6c.2-.2.5-.3.7-.1.8.3 1.7.5 2.6.5.4 0 .7.3.7.7V14c0 .4-.3.7-.7.7C6 14.7 1.3 10 1.3 4.3c0-.4.3-.7.7-.7H5c.4 0 .7.3.7.7 0 1 .2 1.9.5 2.7.1.3 0 .6-.2.7L3.3 6.9z" fill="#94a3b8"/>
        </svg>
        +998 91 760 66 66
      </div>
      <div class="detail">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="#94a3b8"/>
        </svg>
        @KAFTIMDA
      </div>
    </div>
  </div>
</div>

<div class="stats">
  <div class="card" style="background:#fffbeb">
    <div class="card-val" style="color:#b45309">${totalTayyor}</div>
    <div class="card-lbl">Tayyor mahsulot</div>
  </div>
  <div class="card" style="background:#eff6ff">
    <div class="card-val" style="color:#1e40af">${empCount}</div>
    <div class="card-lbl">Xodimlar</div>
  </div>
  <div class="card" style="background:#f0fdf4">
    <div class="card-val" style="color:#15803d">${totalDone}</div>
    <div class="card-lbl">Bajargan</div>
  </div>
  <div class="card" style="background:#fefce8">
    <div class="card-val" style="color:#854d0e">${totalExp.toFixed(0)}</div>
    <div class="card-lbl">Kutilgan</div>
  </div>
  <div class="card" style="background:${effBg}">
    <div class="card-val" style="color:${effColor}">${eff}%</div>
    <div class="card-lbl">Samaradorlik</div>
  </div>
</div>

${sectionsHtml}

<div class="legend">
  <div class="legend-item">
    <div class="dot" style="background:#dcfce7;border:1px solid #bbf7d0"></div>Normadan yuqori
  </div>
  <div class="legend-item">
    <div class="dot" style="background:#fef9c3;border:1px solid #fef08a"></div>Normaga teng
  </div>
  <div class="legend-item">
    <div class="dot" style="background:#fee2e2;border:1px solid #fecaca"></div>Normadan past
  </div>
  <div class="legend-note">Har bir katakda: <strong>bajargan</strong> / kutilgan</div>
</div>

<div class="footer">
  <div class="brand">KAFTIMDA</div>
  <div>kaftimda@gmail.com &nbsp;·&nbsp; +998 91 760 66 66</div>
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=850')
  if (!win) {
    alert("Brauzer popup'ni blokladi. Iltimos, ruxsat bering va qaytadan bosing.")
    return
  }
  win.document.write(html)
  win.document.close()
}

// ── Attendance PDF ────────────────────────────────────────────────────────────

const REASON_LABELS = {
  kasallik: 'Kasallik',
  tatil:    "Ta'til",
  sababsiz: 'Sababsiz',
  boshqa:   'Boshqa',
}
const REASON_STYLE = {
  kasallik: { bg: '#dbeafe', color: '#1d4ed8' },
  tatil:    { bg: '#f3e8ff', color: '#7e22ce' },
  sababsiz: { bg: '#fee2e2', color: '#991b1b' },
  boshqa:   { bg: '#f1f5f9', color: '#475569' },
}

export function exportAttendancePDF(absentEmps, allEmps, absences, departments, date) {
  const totalAbsent  = absentEmps.length
  const totalPresent = allEmps.length - totalAbsent
  const printed      = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Group absent employees by department (preserving departments order)
  const deptGroups = departments
    .map(dept => ({ dept, emps: absentEmps.filter(e => e.departmentId === dept.id) }))
    .filter(g => g.emps.length > 0)

  let rowNum = 0
  const tableRows = deptGroups.map(({ dept, emps }) => {
    const deptRow = `<tr class="dept-group-row">
      <td colspan="4" class="td-dept-group">
        ${esc(dept.name)}
        <span class="dept-count">${emps.length} nafar</span>
      </td>
    </tr>`

    const empRows = emps.map((emp, i) => {
      rowNum++
      const abs         = absences[emp.id]
      const reasonKey   = abs?.reason || ''
      const reasonLabel = REASON_LABELS[reasonKey] || '—'
      const { bg = '#f1f5f9', color = '#475569' } = REASON_STYLE[reasonKey] || {}
      return `<tr class="${i % 2 === 1 ? 'row-alt' : ''}">
        <td class="td-num">${rowNum}</td>
        <td class="td-name">${esc(emp.lastName)} ${esc(emp.firstName)}</td>
        <td class="td-reason">${reasonKey
          ? `<span class="reason-badge" style="background:${bg};color:${color}">${esc(reasonLabel)}</span>`
          : '<span style="color:#94a3b8">—</span>'}</td>
        <td class="td-note">${esc(abs?.note || '') || '<span style="color:#94a3b8">—</span>'}</td>
      </tr>`
    }).join('')

    return deptRow + empRows
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Davomat – KAFTIMDA</title>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:10px; color:#1e293b; }

  .hdr { background:#0f1c3a; color:#fff; padding:13px 18px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #D97706; margin-bottom:7px; }
  .hdr-l .brand { font-size:22px; font-weight:900; letter-spacing:0.3px; line-height:1.1; }
  .hdr-l .amber { width:68px; height:2.5px; background:#D97706; border-radius:1px; margin-top:5px; }
  .hdr-l .sub   { font-size:10px; color:#93c5fd; margin-top:7px; line-height:1.7; font-weight:500; }
  .hdr-r { display:flex; align-items:center; gap:22px; }
  .hdr-r .contacts { text-align:right; }
  .hdr-r .detail { font-size:9.5px; color:#94a3b8; margin-top:3px; display:flex; align-items:center; justify-content:flex-end; gap:4px; }
  .hdr-r .detail:first-child { margin-top:0; }
  .hdr-r .insta  { display:flex; flex-direction:column; align-items:center; gap:6px; }
  .hdr-r .insta-handle { color:#94a3b8; font-size:9.5px; white-space:nowrap; }

  .stats { display:flex; gap:6px; margin-bottom:8px; }
  .card  { flex:1; border-radius:6px; padding:7px 10px; border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:16px; font-weight:700; }
  .card-lbl { font-size:8px; color:#64748b; margin-top:1px; }

  .section-hdr { background:#1e40af; color:#fff; font-size:10px; font-weight:700;
                 padding:4px 8px; border-radius:4px 4px 0 0; margin-top:8px; letter-spacing:.3px; }

  table { width:100%; border-collapse:collapse; font-size:10px; }
  thead { display:table-header-group; }
  thead tr { background:#334155; color:#fff; }
  thead th { padding:6px 8px; text-align:left; font-weight:600; font-size:9px; white-space:nowrap; }
  .th-num  { width:24px; text-align:center; }
  .row-alt { background:#f8fafc; }
  tbody tr { border-bottom:1px solid #f1f5f9; page-break-inside:avoid; }
  tbody td { padding:6px 8px; vertical-align:middle; }
  .td-num    { color:#94a3b8; text-align:center; width:24px; }
  .td-name   { font-weight:600; font-size:11px; white-space:nowrap; }
  .td-reason { white-space:nowrap; }
  .td-note   { color:#64748b; font-size:9.5px; }
  .reason-badge { padding:2px 8px; border-radius:10px; font-size:9.5px; font-weight:700; }

  /* Department group header row */
  .dept-group-row td { background:#dbeafe; color:#1e3a8a; font-weight:700;
                       font-size:10px; padding:5px 8px; page-break-after:avoid; }
  .dept-count { margin-left:8px; font-size:9px; color:#2563eb;
                background:#bfdbfe; padding:1px 7px; border-radius:8px; font-weight:600; }

  .all-present { text-align:center; padding:28px; color:#15803d; font-weight:700;
                 font-size:13px; background:#f0fdf4; border-radius:8px;
                 border:1px solid #bbf7d0; margin-top:8px; }

  .legend { display:flex; align-items:center; gap:10px; margin-top:8px;
            padding-top:6px; border-top:1px solid #e2e8f0; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:9px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }

  .footer { display:flex; justify-content:space-between; margin-top:7px;
            padding-top:5px; border-top:1px solid #e2e8f0; font-size:8.5px; color:#94a3b8; }
  .footer .brand { color:#1e40af; font-weight:700; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    tbody tr { page-break-inside:avoid; }
  }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-l">
    <div class="brand">KAFTIMDA</div>
    <div class="amber"></div>
    <div class="sub">Davomat hisoboti &nbsp;·&nbsp; ${fmtDate(date)}<br>Chiqarilgan: ${printed}</div>
  </div>
  <div class="hdr-r">
    <div class="contacts">
      <div class="detail">kaftimda@gmail.com</div>
      <div class="detail">
        <svg viewBox="0 0 16 16" width="11" height="11" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.3 6.9c1 2 2.8 3.7 4.8 4.8l1.6-1.6c.2-.2.5-.3.7-.1.8.3 1.7.5 2.6.5.4 0 .7.3.7.7V14c0 .4-.3.7-.7.7C6 14.7 1.3 10 1.3 4.3c0-.4.3-.7.7-.7H5c.4 0 .7.3.7.7 0 1 .2 1.9.5 2.7.1.3 0 .6-.2.7L3.3 6.9z" fill="#94a3b8"/>
        </svg>
        +998 91 760 66 66
      </div>
      <div class="detail">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="12" cy="12" r="4.5" stroke="#94a3b8" stroke-width="2"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="#94a3b8"/>
        </svg>
        @KAFTIMDA
      </div>
    </div>
    <div class="insta" style="display:none">
      <span class="insta-handle">@KAFTIMDA</span>
    </div>
  </div>
</div>

<div class="stats">
  <div class="card" style="background:#eff6ff">
    <div class="card-val" style="color:#1e40af">${allEmps.length}</div>
    <div class="card-lbl">Jami xodimlar</div>
  </div>
  <div class="card" style="background:#f0fdf4">
    <div class="card-val" style="color:#15803d">${totalPresent}</div>
    <div class="card-lbl">Kelgan</div>
  </div>
  <div class="card" style="background:#fef2f2">
    <div class="card-val" style="color:#991b1b">${totalAbsent}</div>
    <div class="card-lbl">Kelmagan</div>
  </div>
</div>

${totalAbsent === 0
  ? `<div class="all-present">✓ Barcha xodimlar kelgan</div>`
  : `<div class="section-hdr">Kelmaganlar ro'yxati — ${totalAbsent} nafar</div>
     <table>
       <thead>
         <tr>
           <th class="th-num">#</th>
           <th>Ism Familyasi</th>
           <th>Sabab</th>
           <th>Izoh</th>
         </tr>
       </thead>
       <tbody>${tableRows}</tbody>
     </table>`
}

<div class="legend">
  <div class="legend-item"><div class="dot" style="background:#dbeafe;border:1px solid #bfdbfe"></div>Kasallik</div>
  <div class="legend-item"><div class="dot" style="background:#f3e8ff;border:1px solid #e9d5ff"></div>Ta'til</div>
  <div class="legend-item"><div class="dot" style="background:#fee2e2;border:1px solid #fecaca"></div>Sababsiz</div>
  <div class="legend-item"><div class="dot" style="background:#f1f5f9;border:1px solid #e2e8f0"></div>Boshqa</div>
</div>

<div class="footer">
  <div class="brand">KAFTIMDA</div>
  <div>kaftimda@gmail.com &nbsp;·&nbsp; +998 91 760 66 66</div>
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=850')
  if (!win) {
    alert("Brauzer popup'ni blokladi. Iltimos, ruxsat bering va qaytadan bosing.")
    return
  }
  win.document.write(html)
  win.document.close()
}
