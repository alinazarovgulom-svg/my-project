import { collection, getDocs, query, where } from 'firebase/firestore'
import { computeOrderChain, forecastOrder } from './orderProgress'

// Hisobotda uchragan buyurtmalar bo'yicha xulosa (tayyor/jami/%, tiqilish, prognoz)
// va buyurtma nomlari xaritasini qaytaradi. PDF/Telegram hisoboti uchun.
export async function fetchOrderSummary(db, orderIds) {
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
    const f = forecastOrder(o, chain.doneQty)
    const bn = chain.depts.find(d => d.bottleneck)?.bottleneck
    const opbnDept = chain.depts.find(d => d.opBottleneck)
    return {
      name: o.name,
      doneQty: chain.doneQty,
      orderQty: chain.orderQty,
      percent: chain.percent,
      done: chain.done,
      bottleneck: bn ? `${bn.name} (${bn.qty})` : null,
      opBottleneck: opbnDept ? `${opbnDept.name}: ${opbnDept.opBottleneck.name} (${opbnDept.opBottleneck.qty})` : null,
      forecast: f && !f.done ? `${f.date} (${f.daysLeft} kun)` : null,
    }
  }).filter(Boolean)

  return { summary, orderById }
}
