export const config = {
  api: { bodyParser: { sizeLimit: '3mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { html } = req.body
  if (!html) return res.status(400).json({ error: 'HTML missing' })

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

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '8mm', right: '10mm', bottom: '8mm', left: '10mm' },
      printBackground: true,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.send(pdf)
  } catch (err) {
    console.error('[html-to-pdf]', err)
    res.status(500).json({ error: err.message })
  } finally {
    if (browser) await browser.close()
  }
}
