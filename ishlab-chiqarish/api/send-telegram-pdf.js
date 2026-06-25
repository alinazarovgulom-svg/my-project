export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pdf, filename = 'hisobot.pdf', caption = '' } = req.body
    if (!pdf) return res.status(400).json({ error: 'PDF data missing' })

    const buffer = Buffer.from(pdf, 'base64')

    const formData = new FormData()
    formData.append('chat_id', process.env.TELEGRAM_CHAT_ID)
    formData.append('document', new Blob([buffer], { type: 'application/pdf' }), filename)
    if (caption) formData.append('caption', caption)

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      { method: 'POST', body: formData }
    )

    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram: ${tgData.description || JSON.stringify(tgData)}`)

    return res.json({ ok: true })
  } catch (err) {
    console.error('[send-telegram-pdf]', err)
    return res.status(500).json({ error: err.message })
  }
}
