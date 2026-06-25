export async function sendHTMLToTelegram(html, filename, caption = '') {
  const res = await fetch('/api/html-to-telegram-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename, caption }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Server xatolik (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Telegram xatolik')
  return data
}

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

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Server xatolik (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Telegram xatolik')
  return data
}
