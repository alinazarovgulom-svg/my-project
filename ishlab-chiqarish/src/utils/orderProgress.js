// Buyurtma progressini zanjir bo'ylab hisoblaydi.
//
// Kirishlar:
//   order        — { id, name, quantity, departmentId }
//   entries      — shu buyurtmaga teglangan ish yozuvlari (orderId == order.id)
//   opById       — { [opId]: { isFinal, isFirst, departmentId } }
//   departments  — [{ id, name, chainInput }]   chainInput = { mode:'order'|'from', sources:[], rule:'mirror'|'min'|'sum' }
//
// Qaytaradi:
//   { depts: [{ id, name, kirim, chiqim, boshlangich, qoldiq, rule, bottleneck }],
//     endpointId, done, doneQty, orderQty, percent }

export function computeOrderChain(order, entries, opById, departments) {
  const orderQty = Number(order.quantity || 0)
  const deptById = Object.fromEntries(departments.map(d => [d.id, d]))

  // Har bo'lim uchun chiqim (yakuniy op) va boshlang'ich (kirim op) miqdori
  const chiqim = {}       // yakuniy operatsiya yig'indisi
  const boshlangich = {}  // boshlang'ich operatsiya yig'indisi
  const appeared = new Set()

  entries.forEach(e => {
    const dId = e.departmentId
    appeared.add(dId)
    Object.entries(e.operations || {}).forEach(([opId, val]) => {
      const op = opById[opId]
      if (!op) return
      const qty = Number(val.quantity || 0)
      if (op.isFinal) chiqim[dId] = (chiqim[dId] || 0) + qty
      if (op.isFirst) boshlangich[dId] = (boshlangich[dId] || 0) + qty
    })
  })

  // Ishtirok etgan bo'limlar: yozuvi borlar + ularga bog'langan 'from' bo'limlar (masalan Montaj)
  const involved = new Set(appeared)
  departments.forEach(d => {
    const ci = d.chainInput
    if (ci?.mode === 'from' && (ci.sources || []).some(s => appeared.has(s))) involved.add(d.id)
  })
  // Buyurtma egasi bo'limi ham
  if (order.departmentId) involved.add(order.departmentId)

  const kirimOf = (dId, seen = new Set()) => {
    if (seen.has(dId)) return orderQty // xavfsizlik: siklni to'xtatish
    seen.add(dId)
    const ci = deptById[dId]?.chainInput
    if (!ci || ci.mode !== 'from') return orderQty // mustaqil = buyurtma miqdori
    const sources = (ci.sources || []).filter(s => s !== dId)
    if (sources.length === 0) return orderQty
    const vals = sources.map(s => chiqim[s] || 0)
    if (ci.rule === 'sum')    return vals.reduce((a, b) => a + b, 0)
    if (ci.rule === 'mirror') return kirimOf(sources[0], seen)
    // 'min' (standart)
    return Math.min(...vals)
  }

  const depts = [...involved].map(dId => {
    const d = deptById[dId] || { id: dId, name: dId }
    const ci = d.chainInput
    const k = kirimOf(dId)
    const c = chiqim[dId] || 0
    let bottleneck = null
    if (ci?.mode === 'from' && ci.rule === 'min') {
      const sources = (ci.sources || []).filter(s => s !== dId)
      let minV = Infinity, minId = null
      sources.forEach(s => { const v = chiqim[s] || 0; if (v < minV) { minV = v; minId = s } })
      if (minId) bottleneck = { id: minId, name: deptById[minId]?.name || minId, qty: minV }
    }
    return {
      id: dId,
      name: d.name || dId,
      rule: ci?.mode === 'from' ? (ci.rule || 'min') : 'order',
      kirim: k,
      chiqim: c,
      boshlangich: boshlangich[dId] || 0,
      qoldiq: Math.max(0, k - c),
      bottleneck,
    }
  })

  // Endpoint (tayyor mahsulot bo'limi): 'from' bo'lim (masalan Montaj), bo'lmasa buyurtma egasi
  const fromDept = depts.find(d => d.rule !== 'order')
  const endpointId = fromDept ? fromDept.id : (order.departmentId || depts[0]?.id)
  const doneQty = chiqim[endpointId] || 0
  const percent = orderQty > 0 ? Math.round((doneQty / orderQty) * 100) : 0
  const done = orderQty > 0 && doneQty >= orderQty

  // Ko'rsatish tartibi: mustaqil bo'limlar avval, 'from' (yig'uvchi) oxirida
  depts.sort((a, b) => (a.rule === 'order' ? 0 : 1) - (b.rule === 'order' ? 0 : 1))

  return { depts, endpointId, done, doneQty, orderQty, percent }
}
