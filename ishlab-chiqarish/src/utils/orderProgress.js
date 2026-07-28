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

// Tugash prognozi: buyurtma yaratilganidan beri o'rtacha tezlik bo'yicha taxminiy sana.
export function forecastOrder(order, doneQty) {
  const qty = Number(order.quantity || 0)
  const remaining = Math.max(0, qty - doneQty)
  if (qty > 0 && remaining === 0) return { done: true }
  const created = order.createdAt?.toMillis?.()
    ? order.createdAt.toMillis()
    : (order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null)
  if (!created || doneQty <= 0) return null
  const daysElapsed = Math.max(0.5, (Date.now() - created) / 86400000)
  const rate = doneQty / daysElapsed // dona/kun
  if (rate <= 0) return null
  const daysLeft = Math.ceil(remaining / rate)
  const date = new Date(Date.now() + daysLeft * 86400000).toISOString().slice(0, 10)
  return { daysLeft, date, rate: Math.round(rate) }
}

// Operatsiyaning buyurtmasi: yozuv ichidagi op.orderId (yangi model),
// bo'lmasa (eski yozuv) butun yozuvning entry.orderId'si.
export function opOrderOf(entry, opVal) {
  return opVal && opVal.orderId !== undefined ? opVal.orderId : (entry.orderId ?? null)
}

// Bitta operatsiya bir nechta buyurtmага bo'linishi mumkin (xodim "+" bilan qo'shsa).
// allocations bo'lsa — o'shани, bo'lmasa butun operatsiyани bitta ulush deb qaytaradi.
export function allocationsOf(entry, opVal) {
  if (opVal && Array.isArray(opVal.allocations) && opVal.allocations.length) {
    return opVal.allocations.map(a => ({ quantity: Number(a.quantity || 0), orderId: a.orderId ?? null }))
  }
  return [{ quantity: Number(opVal?.quantity || 0), orderId: opOrderOf(entry, opVal) }]
}

// Bo'limning zanjir guruhi (chainInput.sources bog'lanishlari bo'ylab bog'langan bo'limlar).
function chainGroup(startId, departments) {
  const adj = {}
  const link = (a, b) => { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a) }
  departments.forEach(d => (d.chainInput?.sources || []).forEach(s => link(d.id, s)))
  const seen = new Set([startId])
  const stack = [startId]
  while (stack.length) {
    const cur = stack.pop()
    ;(adj[cur] || []).forEach(n => { if (!seen.has(n)) { seen.add(n); stack.push(n) } })
  }
  return seen
}

export function computeOrderChain(order, entries, opById, departments, opts = {}) {
  const orderQty = Number(order.quantity || 0)
  const targetId = order.id
  const deptById = Object.fromEntries(departments.map(d => [d.id, d]))
  // Har operatsiya alohida buyurtmaga teglanadi — shuning uchun barcha yozuvlar
  // uzatiladi, ichida esa faqat shu buyurtmaga tegishli operatsiyalar hisoblanadi.
  const autoEntries = opts.autoEntries || entries
  const allOrders = opts.allOrders || []

  // Har bo'lim uchun chiqim (yakuniy op) va boshlang'ich (kirim op) miqdori
  const chiqim = {}       // yakuniy operatsiya yig'indisi
  const boshlangich = {}  // boshlang'ich operatsiya yig'indisi
  const opQtyByDept = {}  // { deptId: { opId: yig'indi } } — operatsiya tiqilishi uchun
  const appeared = new Set()

  entries.forEach(e => {
    const dId = e.departmentId
    Object.entries(e.operations || {}).forEach(([opId, val]) => {
      const op = opById[opId]
      if (!op) return
      allocationsOf(e, val).forEach(a => {
        if (a.orderId !== targetId) return // faqat shu buyurtmaga teglangan ulush
        appeared.add(dId)
        const qty = a.quantity
        if (op.isFinal) chiqim[dId] = (chiqim[dId] || 0) + qty
        if (op.isFirst) boshlangich[dId] = (boshlangich[dId] || 0) + qty
        if (!opQtyByDept[dId]) opQtyByDept[dId] = {}
        opQtyByDept[dId][opId] = (opQtyByDept[dId][opId] || 0) + qty
      })
    })
  })

  // Bo'lim ichida tiqilgan operatsiya = eng kam bajarilgan (drop bo'lgan) operatsiya
  const opBottleneckOf = (dId) => {
    const m = opQtyByDept[dId]
    if (!m) return null
    const list = Object.entries(m).map(([opId, qty]) => ({
      name: opById[opId]?.name || opId,
      order: opById[opId]?.order ?? Infinity,
      qty,
    }))
    if (list.length < 2) return null
    const max = Math.max(...list.map(o => o.qty))
    const min = Math.min(...list.map(o => o.qty))
    if (min >= max) return null // barcha operatsiya teng — tiqilish yo'q
    const bn = list.filter(o => o.qty === min).sort((a, b) => a.order - b.order)[0]
    return { name: bn.name, qty: bn.qty }
  }

  // FIFO avto: 'auto' teglangan chiqimni bo'lim buyurtmalari bo'ylab navbat bilan taqsimlash
  // Bu buyurtmaga tegishli ulush shu buyurtma egasi bo'limi chiqimiga qo'shiladi.
  const autoPool = {} // { deptId: yakuniy chiqim yig'indisi (auto) }
  autoEntries.forEach(e => {
    Object.entries(e.operations || {}).forEach(([opId, val]) => {
      const op = opById[opId]
      if (!op?.isFinal) return
      allocationsOf(e, val).forEach(a => {
        if (a.orderId !== 'auto') return // faqat FIFO-avto teglangan ulush
        autoPool[e.departmentId] = (autoPool[e.departmentId] || 0) + a.quantity
      })
    })
  })
  // Har bir bo'limning 'auto' yakuniy chiqimini o'sha bo'lim zanjir guruhiga
  // tegishli buyurtmalar bo'yicha navbat (priority) bilan taqsimlaymiz. Shu bilan
  // mustaqil bo'lim ham, zanjir yakuni (masalan Montaj) ham FIFO'da to'g'ri ishlaydi.
  Object.keys(autoPool).forEach(d => {
    if (!(autoPool[d] > 0)) return
    const comp = chainGroup(d, departments)
    const groupOrders = allOrders
      .filter(o => o.isActive !== false && comp.has(o.departmentId))
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    let pool = autoPool[d]
    for (const o of groupOrders) {
      const share = Math.min(pool, Number(o.quantity || 0))
      pool -= share
      if (o.id === order.id) { chiqim[d] = (chiqim[d] || 0) + share; appeared.add(d); break }
      if (pool <= 0) break
    }
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

  // Bo'limning BARCHA operatsiyalari (Operatsiyalar sahifasidagi tartibда) + shu buyurtмага
  // teglangan miqdori (yo'q bo'lsa 0). Hisobotда buyurtma × operatsiya jadvали uchun.
  const opsOfDept = (dId) => Object.keys(opById)
    .filter(opId => opById[opId].departmentId === dId)
    .map(opId => ({
      name: opById[opId].name || opId,
      order: opById[opId].order ?? Infinity,
      qty: (opQtyByDept[dId] && opQtyByDept[dId][opId]) || 0,
      isFinal: !!opById[opId].isFinal,
    }))
    .sort((a, b) => a.order - b.order)

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
      bottleneck,               // qaysi manba BO'LIM eng kam (min-bo'lim uchun)
      opBottleneck: opBottleneckOf(dId), // qaysi OPERATSIYA orqada (bo'lim ichида)
      opList: opsOfDept(dId),   // bo'limning barcha operatsiyalari + shu buyurtma miqdori
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
