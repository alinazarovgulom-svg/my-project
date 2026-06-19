const groupNum = (n) =>
  Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const groupFloat = (n) => {
  const abs = Math.abs(n)
  const [int, dec] = abs.toFixed(2).split('.')
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec}`
}

export const fmtCur = (n, currency = 'UZS') => {
  if (!currency || currency === 'UZS') return groupNum(n)
  return groupFloat(n)
}

export const fmt = (n) => fmtCur(n, 'UZS')
