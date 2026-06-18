import { getLocalLog } from '../store/auditLog'

const VERSION = '1.0'

export const downloadBackup = (uid, user, products, movements) => {
  const auditLog = getLocalLog(uid)
  const payload = {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    user: { username: user?.username, fullName: user?.fullName },
    products,
    movements,
    auditLog
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `omborbek-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const parseBackupFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result)
      if (!Array.isArray(data.products) || !Array.isArray(data.movements)) {
        reject(new Error('Noto\'g\'ri fayl formati — products yoki movements yo\'q'))
        return
      }
      resolve(data)
    } catch {
      reject(new Error('JSON formati noto\'g\'ri — fayl buzilgan bo\'lishi mumkin'))
    }
  }
  reader.onerror = () => reject(new Error('Fayl o\'qilmadi'))
  reader.readAsText(file)
})

export const applyRestore = (uid, data, mode, saveProducts, saveMovements, currentProducts, currentMovements) => {
  if (mode === 'replace') {
    saveProducts(data.products)
    saveMovements(data.movements)
  } else {
    // merge — ID bo'yicha takrorlarni o'tkazib yuborish
    const existProdIds = new Set(currentProducts.map(p => p.id))
    const existMvIds = new Set(currentMovements.map(m => m.id))
    const newProds = data.products.filter(p => !existProdIds.has(p.id))
    const newMvs = data.movements.filter(m => !existMvIds.has(m.id))
    saveProducts([...currentProducts, ...newProds])
    saveMovements([...currentMovements, ...newMvs])
    return { addedProducts: newProds.length, addedMovements: newMvs.length }
  }
  return { addedProducts: data.products.length, addedMovements: data.movements.length }
}
