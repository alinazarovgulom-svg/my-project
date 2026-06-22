export const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

export const fmt = (n) => {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('uz-UZ')
}

export const fmtDate = (ts) => {
  if (!ts) return '-'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('uz-UZ')
}

export const currentYear = () => new Date().getFullYear()
export const currentMonth = () => new Date().getMonth() // 0-indexed
