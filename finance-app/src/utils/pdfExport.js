import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { fmtCur } from './format'

const fmt = (n, cur) => fmtCur(n, cur || 'UZS')

const HEADER_HTML = (title, subtitle, meta, summaryCards) => `
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#1d4ed8 100%);padding:40px 48px 36px;position:relative;overflow:hidden">
    <!-- decorative circles -->
    <div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;background:rgba(255,255,255,0.04);border-radius:50%"></div>
    <div style="position:absolute;bottom:-40px;left:160px;width:140px;height:140px;background:rgba(255,255,255,0.03);border-radius:50%"></div>
    <div style="position:absolute;top:20px;right:180px;width:60px;height:60px;background:rgba(255,215,0,0.06);border-radius:50%"></div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#ffd700,#b8860b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">💰</div>
          <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">PulBek</span>
        </div>
        <div style="font-size:28px;font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-0.5px">${title}</div>
        ${subtitle ? `<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:4px">${subtitle}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:9px;font-weight:900;letter-spacing:3px;color:#ffd700;text-transform:uppercase;margin-bottom:8px">✦ by KAFTIMDA ✦</div>
        ${meta.map(m => `<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:2px">${m}</div>`).join('')}
      </div>
    </div>

    ${summaryCards.length ? `
    <div style="display:flex;gap:10px;margin-top:24px;position:relative;z-index:1">
      ${summaryCards.map(c => `
      <div style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px">
        <div style="font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">${c.label}</div>
        ${c.lines.map(l => `<div style="font-size:13px;font-weight:700;color:${l.color}">${l.text}</div>`).join('')}
      </div>`).join('')}
    </div>` : ''}
  </div>`

const FOOTER_HTML = () => `
  <div style="padding:14px 48px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">
    <div style="font-size:9px;color:#cbd5e1;letter-spacing:0.5px">PulBek — Shaxsiy va biznes moliyangizni boshqaring</div>
    <div style="font-size:9px;font-weight:900;letter-spacing:2.5px;color:#b8860b">✦ by KAFTIMDA ✦</div>
  </div>`

const TABLE_HTML = (columns, rows) => `
  <table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead>
      <tr style="background:#f1f5f9">
        ${columns.map(c => `<th style="padding:10px 14px;text-align:${c.align||'left'};font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">${c.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        ${row.map((cell, ci) => `<td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:${columns[ci]?.align||'left'};${cell.style||''}">${cell.html||cell}</td>`).join('')}
      </tr>`).join('')}
    </tbody>
  </table>`

const renderToPDF = async (htmlContent, filename) => {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5'
  el.innerHTML = htmlContent
  document.body.appendChild(el)

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' })
  document.body.removeChild(el)

  const imgData = canvas.toDataURL('image/png')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const imgH = (canvas.height * pageW) / canvas.width
  let y = 0
  while (y < imgH) {
    if (y > 0) doc.addPage()
    doc.addImage(imgData, 'PNG', 0, -y, pageW, imgH)
    y += pageH
  }
  doc.save(filename)
}

// ─── Transactions PDF ───────────────────────────────────────────
export const exportTransactionsPDF = async (list, filename = 'pulbek-tranzaksiyalar.pdf') => {
  const currencies = [...new Set(list.map(t => t.currency || 'UZS'))]

  const summaryCards = currencies.map(cur => {
    const inc = list.filter(t => t.type === 'income' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    const exp = list.filter(t => t.type === 'expense' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    return {
      label: cur,
      lines: [
        ...(inc > 0 ? [{ text: `+${fmt(inc, cur)}`, color: '#86efac' }] : []),
        ...(exp > 0 ? [{ text: `-${fmt(exp, cur)}`, color: '#fca5a5' }] : []),
      ]
    }
  })

  const columns = [
    { label: 'Sana' },
    { label: 'Tur' },
    { label: 'Kategoriya' },
    { label: 'Miqdor', align: 'right' },
    { label: 'Izoh' },
  ]

  const rows = list.map(t => [
    `<span style="color:#64748b;font-size:10px">${format(new Date(t.date), 'dd.MM.yyyy')}</span>`,
    `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${t.type === 'income' ? '#dcfce7' : '#fee2e2'};color:${t.type === 'income' ? '#15803d' : '#b91c1c'}">${t.type === 'income' ? '▲ Kirim' : '▼ Chiqim'}</span>`,
    `<span style="font-weight:600;color:#1e293b">${t.emoji || ''} ${t.category}</span>`,
    { html: `<span style="font-weight:700;color:${t.type === 'income' ? '#15803d' : '#b91c1c'}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount, t.currency || 'UZS')}</span> <span style="font-size:9px;color:#94a3b8">${t.currency || 'UZS'}</span>`, align: 'right', style: '' },
    `<span style="color:#94a3b8;font-size:10px">${t.note || '—'}</span>`,
  ])

  const html = `
    ${HEADER_HTML('Tranzaksiyalar', null, [
      `${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
      `${list.length} ta operatsiya`,
    ], summaryCards)}
    <div style="padding:28px 40px 0">
      ${TABLE_HTML(columns, rows)}
    </div>
    <div style="height:28px"></div>
    ${FOOTER_HTML()}`

  await renderToPDF(html, filename)
}

// ─── Reports PDF ────────────────────────────────────────────────
export const exportReportPDF = async ({ filtered, startDate, endDate, userName, byCategory, currencyStats, filename }) => {
  const summaryCards = currencyStats.map(({ cur, inc, exp }) => ({
    label: cur,
    lines: [
      ...(inc > 0 ? [{ text: `+${fmt(inc, cur)}`, color: '#86efac' }] : []),
      ...(exp > 0 ? [{ text: `-${fmt(exp, cur)}`, color: '#fca5a5' }] : []),
    ]
  }))

  const catColumns = [
    { label: 'Kategoriya' },
    { label: 'Kirim', align: 'right' },
    { label: 'Chiqim', align: 'right' },
  ]
  const catRows = Object.entries(byCategory).map(([cat, v]) => [
    `<span style="font-weight:600;color:#1e293b">${cat}</span>`,
    { html: v.income > 0 ? `<span style="color:#15803d;font-weight:700">+${fmt(v.income)}</span>` : '—', align: 'right' },
    { html: v.expense > 0 ? `<span style="color:#b91c1c;font-weight:700">-${fmt(v.expense)}</span>` : '—', align: 'right' },
  ])

  const txColumns = [
    { label: 'Sana' },
    { label: 'Tur' },
    { label: 'Kategoriya' },
    { label: 'Miqdor', align: 'right' },
    { label: 'Izoh' },
  ]
  const txRows = filtered.map(t => [
    `<span style="color:#64748b;font-size:10px">${format(new Date(t.date), 'dd.MM.yyyy')}</span>`,
    `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${t.type === 'income' ? '#dcfce7' : '#fee2e2'};color:${t.type === 'income' ? '#15803d' : '#b91c1c'}">${t.type === 'income' ? '▲ Kirim' : '▼ Chiqim'}</span>`,
    `<span style="font-weight:600;color:#1e293b">${t.emoji || ''} ${t.category}</span>`,
    { html: `<span style="font-weight:700;color:${t.type === 'income' ? '#15803d' : '#b91c1c'}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount, t.currency || 'UZS')}</span> <span style="font-size:9px;color:#94a3b8">${t.currency || 'UZS'}</span>`, align: 'right' },
    `<span style="color:#94a3b8;font-size:10px">${t.note || '—'}</span>`,
  ])

  const html = `
    ${HEADER_HTML('Moliyaviy Hisobot', `${userName} · ${startDate} — ${endDate}`, [
      `${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
      `${filtered.length} ta operatsiya`,
    ], summaryCards)}

    <div style="padding:28px 40px 0">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:12px">Kategoriyalar bo'yicha</div>
      ${TABLE_HTML(catColumns, catRows)}

      <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin:28px 0 12px">Barcha operatsiyalar</div>
      ${TABLE_HTML(txColumns, txRows)}
    </div>
    <div style="height:28px"></div>
    ${FOOTER_HTML()}`

  await renderToPDF(html, filename || `hisobot_${startDate}_${endDate}.pdf`)
}
