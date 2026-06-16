export const fmtCur = (n, currency = 'UZS') => {
  const abs = Math.abs(n)
  if (!currency || currency === 'UZS') {
    return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(Math.round(abs))
  }
  return new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
}

export const fmt = (n) => fmtCur(n, 'UZS')
