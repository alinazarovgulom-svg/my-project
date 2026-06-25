export async function sendPDFToTelegram(pdfBlob, filename, caption = '') {
  const arrayBuffer = await pdfBlob.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)
  let binary = ''
  uint8.forEach(b => { binary += String.fromCharCode(b) })
  const base64 = btoa(binary)

  const res = await fetch('/api/send-telegram-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf: base64, filename, caption }),
  })

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Telegram xatolik')
  return data
}
