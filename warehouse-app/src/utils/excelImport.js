import { generateId } from '../store/storage'
import { DEFAULT_CATEGORIES, UNITS } from '../store/AppContext'

// Shablon yuklab olish
export const downloadTemplate = async () => {
  const XLSX = await import('xlsx')
  const header = [['Nomi *', 'Toifa', "O'lchov", 'Kelish narxi', 'Sotish narxi', 'Min qoldiq', 'Izoh']]
  const examples = [
    ['Coca-Cola 0.5l', 'Oziq-ovqat', 'dona', 3500, 5000, 50, ''],
    ['Shampun 400ml', 'Kimyo', 'litr', 12000, 18000, 20, 'Shimray brendi'],
    ['Mayka L', 'Kiyim-kechak', 'dona', 25000, 40000, 10, ''],
  ]
  const notes = [
    [],
    ["* = majburiy maydon"],
    [`Toifa: ${DEFAULT_CATEGORIES.join(', ')}`],
    [`O'lchov: ${UNITS.join(', ')}`],
  ]
  const ws = XLSX.utils.aoa_to_sheet([...header, ...examples, [], ...notes])

  // Ustun kengliklarini sozlash
  ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 24 }]

  // Sarlavha rangini belgilash (shartli formatlash xlsx da cheklangan, faqat kenglik)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Mahsulotlar')
  XLSX.writeFile(wb, 'omborbek-mahsulotlar-shablon.xlsx')
}

// Excel faylni o'qib mahsulotlarga aylantirish
export const parseExcelFile = async (file, userId) => {
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (rows.length < 2) {
          resolve({ products: [], errors: ['Fayl bo\'sh yoki faqat sarlavha bor'] })
          return
        }

        const products = []
        const errors = []

        // 1-qator sarlavha, 2-qatordan boshlab ma'lumot
        rows.slice(1).forEach((row, i) => {
          const rowNum = i + 2
          // Bo'sh qatorlarni o'tkazib yuborish
          if (!row[0] && !row[1] && !row[2]) return

          const name = String(row[0] || '').trim()
          if (!name) {
            errors.push(`${rowNum}-qator: "Nomi" bo'sh — o'tkazib yuborildi`)
            return
          }

          const category = DEFAULT_CATEGORIES.includes(String(row[1]).trim())
            ? String(row[1]).trim()
            : DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]

          const unit = UNITS.includes(String(row[2]).trim())
            ? String(row[2]).trim()
            : 'dona'

          const purchasePrice = parseFloat(String(row[3]).replace(/\s/g, '').replace(',', '.')) || 0
          const salePrice = parseFloat(String(row[4]).replace(/\s/g, '').replace(',', '.')) || 0
          const minStock = parseInt(String(row[5])) || 0
          const note = String(row[6] || '').trim()

          products.push({
            id: generateId(),
            name,
            category,
            unit,
            purchasePrice,
            salePrice,
            minStock,
            note,
            createdAt: new Date().toISOString(),
            userId,
            importedAt: new Date().toISOString()
          })
        })

        resolve({ products, errors })
      } catch (err) {
        reject(new Error('Fayl o\'qilmadi: ' + (err.message || 'Noma\'lum xato')))
      }
    }
    reader.onerror = () => reject(new Error('Fayl ochilmadi'))
    reader.readAsArrayBuffer(file)
  })
}
