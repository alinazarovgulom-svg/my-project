function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportPDF(rows, filters, deptName) {
  if (!rows.length) return

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalDone = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp  = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const eff       = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount  = new Set(rows.map(r => r.empName)).size

  const effColor = eff >= 100 ? '#15803d' : eff >= 80 ? '#854d0e' : '#991b1b'
  const effBg    = eff >= 100 ? '#f0fdf4' : eff >= 80 ? '#fefce8' : '#fef2f2'

  // ── Pivot ─────────────────────────────────────────────────────────────────
  const slotSet = new Set()
  rows.forEach(r => slotSet.add(`${r.startTime}–${r.endTime}`))
  const slots = [...slotSet].sort()

  const groupMap = new Map()
  rows.forEach(r => {
    const key = `${r.empName}||${r.deptName}||${r.opName}||${r.norm}`
    if (!groupMap.has(key)) {
      groupMap.set(key, { empName: r.empName, deptName: r.deptName, opName: r.opName, norm: r.norm, bySlot: {} })
    }
    const slot = `${r.startTime}–${r.endTime}`
    groupMap.get(key).bySlot[slot] = { qty: Number(r.quantity), exp: Number(r.expected) }
  })
  const groups = [...groupMap.values()]

  function qtyStyle(qty, exp) {
    if (qty > exp)   return { bg: '#dcfce7', color: '#15803d' }
    if (qty === exp) return { bg: '#fef9c3', color: '#854d0e' }
    return               { bg: '#fee2e2', color: '#991b1b' }
  }

  // ── Table rows ────────────────────────────────────────────────────────────
  let prevEmp = null
  const tableRows = groups.map((g, i) => {
    const isFirst = g.empName !== prevEmp
    prevEmp = g.empName

    const totDone = slots.reduce((s, sl) => s + (g.bySlot[sl]?.qty ?? 0), 0)
    const totExp  = slots.reduce((s, sl) => s + (g.bySlot[sl]?.exp ?? 0), 0)
    const { bg: tBg, color: tCol } = qtyStyle(totDone, totExp)

    const slotCells = slots.map(sl => {
      const e = g.bySlot[sl]
      if (!e) {
        return `<td style="text-align:center;color:#cbd5e1;font-size:11px">—</td>`
      }
      const { bg, color } = qtyStyle(e.qty, e.exp)
      return `<td style="text-align:center;padding:5px 4px">
        <div style="background:${bg};border-radius:5px;padding:3px 4px;display:inline-block;min-width:30px">
          <div style="font-weight:700;font-size:11px;color:${color};line-height:1.2">${e.qty}</div>
          <div style="font-size:7px;color:#94a3b8;line-height:1.2">${e.exp}</div>
        </div>
      </td>`
    }).join('')

    return `<tr style="${i % 2 === 1 ? 'background:#f8fafc' : ''}">
      <td style="color:#94a3b8;text-align:center">${i + 1}</td>
      <td style="font-weight:700;white-space:nowrap">${isFirst ? esc(g.empName) : ''}</td>
      <td>${isFirst ? `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 7px;border-radius:10px;font-size:7.5px;white-space:nowrap">${esc(g.deptName)}</span>` : ''}</td>
      <td>${esc(g.opName)}</td>
      <td style="color:#94a3b8;white-space:nowrap">${esc(g.norm)} dona/soat</td>
      ${slotCells}
      <td style="text-align:center;padding:5px 4px">
        <div style="background:${tBg};border-radius:5px;padding:3px 4px;display:inline-block;min-width:34px">
          <div style="font-weight:700;font-size:11px;color:${tCol};line-height:1.2">${totDone}</div>
          <div style="font-size:7px;color:#94a3b8;line-height:1.2">${totExp.toFixed(0)}</div>
        </div>
      </td>
    </tr>`
  }).join('')

  const slotHeaders = slots.map(s => `<th style="text-align:center">${esc(s)}</th>`).join('')
  const dateStr = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Hisobot – KAFTIMDA</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:9px; color:#1e293b; }

  .hdr { background:#1e40af; color:#fff; padding:9px 14px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #3b82f6; margin-bottom:6px; }
  .hdr-l .brand { font-size:18px; font-weight:700; }
  .hdr-l .sub   { font-size:8px; color:#93c5fd; margin-top:2px; }
  .hdr-r { text-align:right; }
  .hdr-r .dept  { font-size:10px; font-weight:600; }
  .hdr-r .meta  { font-size:7.5px; color:#93c5fd; margin-top:2px; line-height:1.5; }

  .stats { display:flex; gap:6px; margin-bottom:7px; }
  .card  { flex:1; border-radius:6px; padding:6px 10px; border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:14px; font-weight:700; }
  .card-lbl { font-size:7px; color:#64748b; margin-top:1px; }

  table { width:100%; border-collapse:collapse; font-size:9px; }
  thead tr { background:#1e40af; color:#fff; }
  thead th { padding:6px 6px; text-align:left; font-weight:600; font-size:8px; white-space:nowrap; }
  tbody tr { border-bottom:1px solid #f1f5f9; }
  tbody td { padding:5px 6px; vertical-align:middle; }

  .legend { display:flex; align-items:center; gap:12px; margin-top:7px;
            padding-top:6px; border-top:1px solid #e2e8f0; }
  .legend-item { display:flex; align-items:center; gap:4px; font-size:8px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .legend-note { margin-left:auto; font-size:7px; color:#94a3b8; }

  .footer { display:flex; justify-content:space-between; margin-top:6px;
            padding-top:5px; border-top:1px solid #e2e8f0; font-size:7.5px; color:#94a3b8; }
  .footer .brand { color:#1e40af; font-weight:700; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
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
    <div class="meta">${esc(filters)}<br>Chiqarilgan: ${dateStr}</div>
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

<table>
  <thead>
    <tr>
      <th style="text-align:center;width:24px">#</th>
      <th>Xodim</th>
      <th>Bo'lim</th>
      <th>Operatsiya</th>
      <th>Norma</th>
      ${slotHeaders}
      <th style="text-align:center">Jami</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

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
