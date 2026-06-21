function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportPDF(rows, filters, deptName) {
  const totalDone = rows.reduce((s, r) => s + Number(r.quantity || 0), 0)
  const totalExp  = rows.reduce((s, r) => s + Number(r.expected  || 0), 0)
  const eff       = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0
  const empCount  = new Set(rows.map(r => r.empName)).size

  const effColor = eff >= 100 ? '#15803d' : eff >= 80 ? '#854d0e' : '#991b1b'
  const effBg    = eff >= 100 ? '#f0fdf4' : eff >= 80 ? '#fefce8' : '#fef2f2'

  const tableRows = rows.map((r, i) => {
    const qty = Number(r.quantity)
    const exp = Number(r.expected)
    const bg    = qty > exp ? '#dcfce7' : qty === exp ? '#fef9c3' : '#fee2e2'
    const color = qty > exp ? '#166534' : qty === exp ? '#713f12' : '#991b1b'
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(r.empName)}</td>
      <td>${esc(r.deptName)}</td>
      <td>${esc(r.date)}</td>
      <td>${esc(r.startTime)}–${esc(r.endTime)}</td>
      <td>${esc(r.opName)}</td>
      <td>${esc(r.norm)}/soat</td>
      <td style="background:${bg};color:${color};font-weight:700;text-align:center">${esc(r.quantity)}</td>
      <td style="text-align:center">${Number(r.expected).toFixed(0)}</td>
    </tr>`
  }).join('')

  const dateStr = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Hisobot – KAFTIMDA</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size:10px; color:#1e293b; }

  .hdr { background:#1e40af; color:#fff; padding:9px 14px;
         display:flex; justify-content:space-between; align-items:center;
         border-bottom:2.5px solid #3b82f6; border-radius:4px 4px 0 0; }
  .hdr-l .brand { font-size:19px; font-weight:700; letter-spacing:.5px; }
  .hdr-l .sub   { font-size:8.5px; color:#93c5fd; margin-top:2px; }
  .hdr-r { text-align:right; }
  .hdr-r .dept  { font-size:11px; font-weight:600; }
  .hdr-r .meta  { font-size:8px; color:#93c5fd; margin-top:2px; line-height:1.5; }

  .stats { display:flex; gap:6px; margin:7px 0; }
  .card  { flex:1; border-radius:5px; padding:7px 10px;
           border:1px solid #e2e8f0; text-align:center; }
  .card-val { font-size:15px; font-weight:700; }
  .card-lbl { font-size:7.5px; color:#64748b; margin-top:1px; }

  table { width:100%; border-collapse:collapse; font-size:8.5px; }
  thead tr { background:#1e40af; color:#fff; }
  thead th { padding:5px 6px; text-align:left; font-weight:600; font-size:8px; white-space:nowrap; }
  tbody tr:nth-child(even) { background:#f8fafc; }
  tbody td { padding:4px 6px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }

  .legend { display:flex; gap:14px; margin-top:7px; padding-top:6px; border-top:1px solid #e2e8f0; }
  .legend-item { display:flex; align-items:center; gap:5px; font-size:8px; color:#64748b; }
  .dot { width:10px; height:10px; border-radius:2px; flex-shrink:0; }

  .footer { display:flex; justify-content:space-between; margin-top:7px;
            padding-top:6px; border-top:1px solid #e2e8f0;
            font-size:7.5px; color:#94a3b8; }
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
      <th>#</th><th>Xodim</th><th>Bo'lim</th><th>Sana</th><th>Vaqt</th>
      <th>Operatsiya</th><th>Norma</th><th>Bajargan</th><th>Kutilgan</th>
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
