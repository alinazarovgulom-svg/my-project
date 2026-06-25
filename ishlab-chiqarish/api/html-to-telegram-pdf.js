export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { html, filename = 'hisobot.pdf', caption = '' } = req.body
  if (!html) return res.status(400).json({ ok: false, error: 'HTML missing' })

  let browser
  try {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')

    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1150, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '8mm', right: '10mm', bottom: '8mm', left: '10mm' },
      printBackground: true,
    })

    // Send directly to Telegram — PDF never goes back to client
    const formData = new FormData()
    formData.append('chat_id', process.env.TELEGRAM_CHAT_ID)
    formData.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), filename)
    if (caption) formData.append('caption', caption)

    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      { method: 'POST', body: formData }
    )
    const tgData = await tgRes.json()
    if (!tgData.ok) throw new Error(`Telegram: ${tgData.description || JSON.stringify(tgData)}`)

    return res.json({ ok: true })
  } catch (err) {
    console.error('[html-to-telegram-pdf]', err)
    return res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (browser) await browser.close()
  }
}
