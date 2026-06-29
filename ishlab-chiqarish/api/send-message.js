export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { chatId, text } = req.body
  if (!chatId || !text) return res.status(400).json({ ok: false, error: 'chatId and text required' })

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      }
    )
    const data = await tgRes.json()
    if (!data.ok) throw new Error(data.description || JSON.stringify(data))
    return res.json({ ok: true })
  } catch (err) {
    console.error('[send-message]', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
