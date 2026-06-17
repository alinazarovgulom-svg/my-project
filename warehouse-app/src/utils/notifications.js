export const requestPermission = async () => {
  if (!('Notification' in window)) return false
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export const isGranted = () =>
  'Notification' in window && Notification.permission === 'granted'

export const notifyLowStock = (productName, quantity, unit, minStock) => {
  if (!isGranted()) return
  const title = `Kam qoldiq: ${productName}`
  const body = `Qoldiq ${quantity} ${unit} — minimal: ${minStock} ${unit}`

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `low-stock-${productName}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: '/inventory' }
      })
    }).catch(() => {
      new Notification(title, { body, icon: '/favicon.svg' })
    })
  } else {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}

// Bir necha mahsulotni birdan tekshirish
export const checkLowStock = (products, inventory) => {
  if (!isGranted()) return
  inventory.forEach(item => {
    const prod = products.find(p => p.id === item.productId)
    if (prod?.minStock && item.quantity < prod.minStock && item.quantity >= 0) {
      notifyLowStock(prod.name, item.quantity, prod.unit, prod.minStock)
    }
  })
}
