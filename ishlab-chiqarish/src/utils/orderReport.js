import { collection, getDocs, query, where } from 'firebase/firestore'
import { computeOrderChain, forecastOrder } from './orderProgress'

// Hisobotda uchragan buyurtmalar bo'yicha xulosa (tayyor/jami/%, tiqilish, prognoz)
// va buyurtma nomlari xaritasini qaytaradi. PDF/Telegram hisoboti uchun.
export async function fetchOrderSummary(db, orderIds, targetDeptId = null) {
  const ids = [...new Set((orderIds || []).filter(id => id && id !== 'auto'))]
  if (ids.length === 0) return { summary: [], orderById: {} }

  const [orderSnap, opSnap, deptSnap] = await Promise.all([
    getDocs(collection(db, 'factory_orders')),
    getDocs(collection(db, 'factory_operations')),
    getDocs(collection(db, 'factory_departments')),
  ])
  const allOrders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const orderById = Object.fromEntries(allOrders.map(o => [o.id, o]))
  const opById = {}
  opSnap.forEach(d => { const o = d.data(); opById[d.id] = { isFinal: !!o.isFinal, isFirst: !!o.isFirst, departmentId: o.departmentId, name: o.name, order: o.order ?? Infinity } })
  const departments = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Ham eski (entry.orderId), ham yangi (operatsiya ichidagi orderId → entry.orderIds massivi)
  // yozuvlarni yig'amiz. Har op alohida teglanadi, shuning uchun ikkala so'rov birlashtiriladi.
  const qids = [...ids, 'auto']
  const byDoc = new Map()
  for (let i = 0; i < qids.length; i += 30) {
    const chunk = qids.slice(i, i + 30)
    const [legacy, tagged] = await Promise.all([
      getDocs(query(collection(db, 'factory_work_entries'), where('orderId', 'in', chunk))),
      getDocs(query(collection(db, 'factory_work_entries'), where('orderIds', 'array-contains-any', chunk))),
    ])
    legacy.forEach(d => byDoc.set(d.id, d.data()))
    tagged.forEach(d => byDoc.set(d.id, d.data()))
  }
  const entries = [...byDoc.values()]

  const summary = ids.map(id => {
    const o = orderById[id]
    if (!o) return null
    const chain = computeOrderChain(o, entries, opById, departments, { allOrders })
    // Hisobot bo'limi: berilган bo'lim (masalan Montaj), bo'lmasa — yakuniy bo'lim
    const reportDept = targetDeptId
      ? chain.depts.find(d => d.id === targetDeptId)
      : chain.depts.find(d => d.id === chain.endpointId)
    // Tiqilish HAR BIR bo'limga o'zinikini ko'rsatadi: bo'lim berilган bo'lsa o'shaniki,
    // aks holda (umumiy hisobot) zanjirdagi birinchi tiqilgan bo'lim.
    const bnDept = targetDeptId ? reportDept : chain.depts.find(d => d.bottleneck)
    const opbnDept = targetDeptId ? reportDept : chain.depts.find(d => d.opBottleneck)
    // "Tayyor": bo'lim hisoboti bo'lsa -> shu bo'lim yakuniy operatsiyasi (chiqim);
    // umumiy hisoboti bo'lsa -> buyurtma zanjir yakuni.
    const doneQ = targetDeptId ? (reportDept?.chiqim ?? 0) : chain.doneQty
    const pct = chain.orderQty > 0 ? Math.round((doneQ / chain.orderQty) * 100) : 0
    const isDone = chain.orderQty > 0 && doneQ >= chain.orderQty
    const f = forecastOrder(o, doneQ)
    return {
      name: o.name,
      doneQty: doneQ,
      orderQty: chain.orderQty,
      percent: pct,
      done: isDone,
      bottleneck: bnDept?.bottleneck ? `${bnDept.bottleneck.name} (${bnDept.bottleneck.qty})` : null,
      opBottleneck: opbnDept?.opBottleneck ? `${opbnDept.name}: ${opbnDept.opBottleneck.name} (${opbnDept.opBottleneck.qty})` : null,
      forecast: f && !f.done ? `${f.date} (${f.daysLeft} kun)` : null,
      ops: (reportDept?.opList || []).map(op => ({ name: op.name, qty: op.qty, isFinal: op.isFinal })),
    }
  }).filter(Boolean)

  return { summary, orderById }
}
