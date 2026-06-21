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

export function exportPDF(rows, filters, deptName) {
  if (!rows.length) return

  // ── Global stats ─────────────────────────────────────────────────────────
  const totalDone = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp  = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const eff       = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount  = new Set(rows.map(r => r.empName)).size
  const effColor  = eff >= 100 ? '#15803d' : eff >= 80 ? '#854d0e' : '#991b1b'
  const effBg     = eff >= 100 ? '#f0fdf4' : eff >= 80 ? '#fefce8' : '#fef2f2'

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
        qty: Number(r.quantity), exp: Number(r.expected),
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
            <span style="font-size:9px">${medal}</span>
            <strong>${esc(g.empName)}</strong>
            <span style="background:${eb};color:${ec};border-radius:8px;padding:1px 5px;font-size:7px;font-weight:700;white-space:nowrap">${e}%</span>
          </span>`
        })() : ''}</td>
        <td class="td-dept">${isFirst ? `<span class="dept-badge">${esc(g.deptName)}</span>` : ''}</td>
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
              <th>Bo'lim</th>
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
  body { font-family: Arial, Helvetica, sans-serif; font-size:9px; color:#1e293b; }

  /* Header */
  .hdr { background:#1e40af; color:#fff; padding:9px 14px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #3b82f6; margin-bottom:7px; }
  .hdr-l .brand { font-size:18px; font-weight:700; }
  .hdr-l .sub   { font-size:8px; color:#93c5fd; margin-top:2px; }
  .hdr-r { text-align:right; }
  .hdr-r .dept  { font-size:10px; font-weight:600; }
  .hdr-r .meta  { font-size:7.5px; color:#93c5fd; margin-top:2px; line-height:1.6; }

  /* Stat cards */
  .stats { display:flex; gap:6px; margin-bottom:8px; }
  .card  { flex:1; border-radius:6px; padding:6px 10px;
           border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:14px; font-weight:700; }
  .card-lbl { font-size:7px; color:#64748b; margin-top:1px; }

  /* Date section */
  .date-section { margin-bottom:10px; }
  .date-hdr { background:#1e40af; color:#fff; font-size:9px; font-weight:700;
              padding:4px 8px; border-radius:4px 4px 0 0; letter-spacing:.3px; }

  /* Table */
  table { width:100%; border-collapse:collapse; font-size:8.5px; }
  thead tr { background:#334155; color:#fff; }
  thead th { padding:5px 5px; text-align:left; font-weight:600;
             font-size:7.5px; white-space:nowrap; }
  .th-num  { width:20px; text-align:center; }
  .slot-th { text-align:center; }
  .row-alt { background:#f8fafc; }
  tbody tr { border-bottom:1px solid #f1f5f9; }
  tbody td { padding:4px 5px; vertical-align:middle; }
  .td-num  { color:#94a3b8; text-align:center; width:20px; }
  .td-name { font-weight:700; white-space:nowrap; }
  .td-norm { color:#94a3b8; white-space:nowrap; }
  .dept-badge { background:#eff6ff; color:#1d4ed8; padding:1px 6px;
                border-radius:10px; font-size:7px; white-space:nowrap; }
  .slot-td { text-align:center; padding:3px 4px; }
  .slot-td.empty { color:#cbd5e1; font-size:10px; }
  .qty-badge { border-radius:5px; padding:3px 5px; display:inline-block; min-width:30px; }
  .qty-num { font-weight:700; font-size:11px; line-height:1.2; }
  .qty-exp { font-size:6.5px; color:#94a3b8; line-height:1.2; }

  /* Legend */
  .legend { display:flex; align-items:center; gap:12px; margin-top:8px;
            padding-top:6px; border-top:1px solid #e2e8f0; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:8px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .legend-note { margin-left:auto; font-size:7px; color:#94a3b8; }

  /* Footer */
  .footer { display:flex; justify-content:space-between; margin-top:7px;
            padding-top:5px; border-top:1px solid #e2e8f0;
            font-size:7.5px; color:#94a3b8; }
  .footer .brand { color:#1e40af; font-weight:700; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .date-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-l">
    <div class="brand">KAFTIMDA</div>
    <div class="sub">Ishlab chiqarish tizimi</div>
  </div>
  <div class="hdr-r">
    <div class="dept">${esc(deptName)}</div>
    <div class="meta">${esc(filters)}<br>Chiqarilgan: ${printed}</div>
  </div>
</div>

<div class="stats">
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
