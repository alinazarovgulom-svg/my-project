export const fmtNum = (n) => {
  if (n === null || n === undefined) return '0'
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n))
}

export const fmtCur = (n, currency = 'UZS') => {
  const num = Math.round(n || 0)
  if (currency === 'UZS') return `${fmtNum(num)} so'm`
  if (currency === 'USD') return `$${(n || 0).toFixed(2)}`
  if (currency === 'EUR') return `€${(n || 0).toFixed(2)}`
  return `${fmtNum(num)} ${currency}`
}

export const today = () => new Date().toISOString().slice(0, 10)

export const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
