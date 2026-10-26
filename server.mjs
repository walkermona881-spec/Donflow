import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, randomUUID } from 'node:crypto'

const root = dirname(fileURLToPath(import.meta.url))
try {
  process.loadEnvFile(join(root, '.env'))
} catch {}
const dist = join(root, 'dist')
const dataDir = join(root, 'data')
const dataFile = join(dataDir, 'payments.json')
const port = Number(process.env.PORT || 3000)

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
}

function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 3600000).toISOString()
}

function seedPayments() {
  return [
    {
      id: 'pay_demo_maya',
      transactionId: 'TXN-8F2K9Q',
      status: 'succeeded',
      amount: 24900,
      currency: 'USD',
      createdAt: isoHoursAgo(1.2),
      customer: { name: 'Maya Chen', email: 'maya@northstar.studio' },
      card: { brand: 'Visa', brandId: 'visa', last4: '4242', expMonth: 8, expYear: 2029, holderName: 'Maya Chen' },
      billing: { line1: '88 King Street West', city: 'Toronto', state: 'ON', postalCode: 'M5H 1J9', country: 'Canada' },
      invoice: { id: 'INV-2048', description: 'State Coin Growth Plan' },
      email: { status: 'delivered', recipient: process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev', sentAt: isoHoursAgo(1.1) }
    },
    {
      id: 'pay_demo_daniel',
      transactionId: 'TXN-4M7P2D',
      status: 'succeeded',
      amount: 120000,
      currency: 'USD',
      createdAt: isoHoursAgo(19),
      customer: { name: 'Daniel Okafor', email: 'daniel@oke.studio' },
      card: { brand: 'Mastercard', brandId: 'mastercard', last4: '4444', expMonth: 11, expYear: 2028, holderName: 'Daniel Okafor' },
      billing: { line1: '14 Admiralty Way', city: 'Lagos', state: 'Lagos', postalCode: '106104', country: 'Nigeria' },
      invoice: { id: 'INV-2047', description: 'State Coin Enterprise' },
      email: { status: 'delivered', recipient: process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev', sentAt: isoHoursAgo(18.9) }
    },
    {
      id: 'pay_demo_sofia',
      transactionId: 'TXN-9C1R6S',
      status: 'succeeded',
      amount: 8900,
      currency: 'USD',
      createdAt: isoHoursAgo(44),
      customer: { name: 'Sofia Martinez', email: 'sofia@atelier-m.co' },
      card: { brand: 'American Express', brandId: 'amex', last4: '0005', expMonth: 3, expYear: 2027, holderName: 'Sofia Martinez' },
      billing: { line1: '701 Congress Avenue', city: 'Austin', state: 'TX', postalCode: '78701', country: 'United States' },
      invoice: { id: 'INV-2046', description: 'State Coin Starter' },
      email: { status: 'delivered', recipient: process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev', sentAt: isoHoursAgo(43.9) }
    },
    {
      id: 'pay_demo_noah',
      transactionId: 'TXN-2L5V8N',
      status: 'succeeded',
      amount: 24900,
      currency: 'USD',
      createdAt: isoHoursAgo(68),
      customer: { name: 'Noah Williams', email: 'noah@fieldwork.io' },
      card: { brand: 'Visa', brandId: 'visa', last4: '1881', expMonth: 6, expYear: 2030, holderName: 'Noah Williams' },
      billing: { line1: '22 Shoreditch High Street', city: 'London', state: 'England', postalCode: 'E1 6PJ', country: 'United Kingdom' },
      invoice: { id: 'INV-2045', description: 'State Coin Growth Plan' },
      email: { status: 'delivered', recipient: process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev', sentAt: isoHoursAgo(67.9) }
    },
    {
      id: 'pay_demo_priya',
      transactionId: 'TXN-7H3B5K',
      status: 'succeeded',
      amount: 42000,
      currency: 'USD',
      createdAt: isoHoursAgo(96),
      customer: { name: 'Priya Raman', email: 'priya@lumenlabs.in' },
      card: { brand: 'Mastercard', brandId: 'mastercard', last4: '9321', expMonth: 1, expYear: 2029, holderName: 'Priya Raman' },
      billing: { line1: '91 Residency Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560025', country: 'India' },
      invoice: { id: 'INV-2044', description: 'State Coin Scale' },
      email: { status: 'delivered', recipient: process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev', sentAt: isoHoursAgo(95.9) }
    }
  ]
}

function ensureStore() {
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(dataFile)) {
    writeFileSync(dataFile, JSON.stringify(seedPayments(), null, 2))
  }
}

function readPayments() {
  ensureStore()
  try {
    const parsed = JSON.parse(readFileSync(dataFile, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePayments(payments) {
  ensureStore()
  writeFileSync(dataFile, JSON.stringify(payments, null, 2))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function money(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(cents || 0) / 100)
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    ...securityHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 200000) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function cleanText(value, max = 120) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function validatePayment(body) {
  const card = body.card || {}
  const forbidden = ['number', 'pan', 'fullNumber', 'cvv', 'cvc', 'cid', 'pin', 'securityCode']
  if (forbidden.some((key) => card[key] !== undefined) || body.cvv !== undefined || body.pin !== undefined) {
    throw Object.assign(new Error('Sensitive card authentication data is not accepted. Tokenize card data with a PCI-compliant provider.'), { status: 422 })
  }
  const amount = Number(body.amount)
  if (!Number.isInteger(amount) || amount < 50 || amount > 10000000) {
    throw Object.assign(new Error('Invalid payment amount.'), { status: 400 })
  }
  const currency = cleanText(body.currency || 'USD', 3).toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) throw Object.assign(new Error('Invalid currency.'), { status: 400 })
  const customerName = cleanText(body.customer?.name)
  const customerEmail = cleanText(body.customer?.email, 180).toLowerCase()
  if (customerName.length < 2) throw Object.assign(new Error('Customer name is required.'), { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail)) throw Object.assign(new Error('A valid customer email is required.'), { status: 400 })
  const last4 = String(card.last4 || '')
  if (!/^\d{4}$/.test(last4)) throw Object.assign(new Error('Card last four digits are required.'), { status: 400 })
  const brand = cleanText(card.brand || 'Card', 30)
  const brandId = cleanText(card.brandId || 'card', 20)
  const expMonth = Number(card.expMonth)
  const expYear = Number(card.expYear)
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) throw Object.assign(new Error('Invalid card expiry month.'), { status: 400 })
  if (!Number.isInteger(expYear) || expYear < new Date().getFullYear() || expYear > 2100) throw Object.assign(new Error('Invalid card expiry year.'), { status: 400 })
  const holderName = cleanText(card.holderName)
  if (holderName.length < 2) throw Object.assign(new Error('Cardholder name is required.'), { status: 400 })
  const billing = body.billing || {}
  const line1 = cleanText(billing.line1, 160)
  const city = cleanText(billing.city, 80)
  const state = cleanText(billing.state, 80)
  const postalCode = cleanText(billing.postalCode, 20)
  const country = cleanText(billing.country, 80)
  if (!line1 || !city || !state || !postalCode || !country) {
    throw Object.assign(new Error('A complete billing address is required.'), { status: 400 })
  }
  const invoiceId = cleanText(body.invoice?.id || 'INV-2048', 32).replace(/[^A-Za-z0-9-_]/g, '') || 'INV-2048'
  const description = cleanText(body.invoice?.description || 'State Coin payment', 90)
  return {
    amount,
    currency,
    customer: { name: customerName, email: customerEmail },
    card: { brand, brandId, last4, expMonth, expYear, holderName },
    billing: { line1, city, state, postalCode, country },
    invoice: { id: invoiceId, description }
  }
}

async function notifyMerchant(payment) {
  const recipient = process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev'
  const apiKey = process.env.RESEND_API_KEY
  const sentAt = new Date().toISOString()
  if (!apiKey) {
    console.log(`[email] sandbox notification for ${payment.transactionId} (${money(payment.amount, payment.currency)}) to ${recipient}`)
    return { status: 'simulated', recipient, sentAt }
  }
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f3f6fb;padding:32px;color:#081a33">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4eaf2;border-radius:18px;overflow:hidden">
        <div style="background:#081a33;color:#fff;padding:24px 28px">
          <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5ce3b9;font-weight:700">State Coin</div>
          <h1 style="margin:8px 0 0;font-size:24px;letter-spacing:-.03em">Payment received</h1>
        </div>
        <div style="padding:26px 28px">
          <p style="margin:0 0 20px;color:#6f7f94;font-size:14px">A payment was completed successfully.</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:-.04em;margin-bottom:22px">${money(payment.amount, payment.currency)}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:8px 0;color:#6f7f94">Transaction</td><td style="padding:8px 0;text-align:right;font-family:monospace">${escapeHtml(payment.transactionId)}</td></tr>
            <tr><td style="padding:8px 0;color:#6f7f94">Customer</td><td style="padding:8px 0;text-align:right">${escapeHtml(payment.customer.name)}</td></tr>
            <tr><td style="padding:8px 0;color:#6f7f94">Email</td><td style="padding:8px 0;text-align:right">${escapeHtml(payment.customer.email)}</td></tr>
            <tr><td style="padding:8px 0;color:#6f7f94">Method</td><td style="padding:8px 0;text-align:right">${escapeHtml(payment.card.brand)} •••• ${escapeHtml(payment.card.last4)}</td></tr>
            <tr><td style="padding:8px 0;color:#6f7f94">Invoice</td><td style="padding:8px 0;text-align:right">${escapeHtml(payment.invoice.id)}</td></tr>
            <tr><td style="padding:8px 0;color:#6f7f94">Date</td><td style="padding:8px 0;text-align:right">${escapeHtml(payment.createdAt)}</td></tr>
          </table>
          <div style="margin-top:22px;padding:12px 14px;border-radius:10px;background:#effaf5;color:#27634f;font-size:11px;line-height:1.6">Full card numbers, CVV codes and PINs are never collected or included in this notification.</div>
          <a href="${escapeHtml(process.env.APP_URL || 'http://localhost:3000')}/dashboard" style="display:inline-block;margin-top:22px;padding:12px 18px;border-radius:10px;background:#07835f;color:#fff;text-decoration:none;font-weight:700;font-size:13px">Open dashboard</a>
        </div>
      </div>
    </div>
  `
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'State Coin <payments@statecoin.dev>',
        to: [recipient],
        subject: `Payment received — ${money(payment.amount, payment.currency)} (${payment.transactionId})`,
        html
      }),
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`)
    return { status: 'delivered', recipient, sentAt }
  } catch (error) {
    console.error('[email] delivery failed:', error.message)
    return { status: 'failed', recipient, sentAt, error: 'Email delivery failed.' }
  }
}

const buckets = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const bucket = buckets.get(ip) || { count: 0, reset: now + 60000 }
  if (now > bucket.reset) {
    bucket.count = 0
    bucket.reset = now + 60000
  }
  bucket.count += 1
  buckets.set(ip, bucket)
  return bucket.count > 30
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      service: 'state-coin-payments',
      email: process.env.RESEND_API_KEY ? 'configured' : 'sandbox',
      storage: 'local-json'
    })
  }

  if (req.method === 'GET' && url.pathname === '/api/payments') {
    const payments = readPayments().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return json(res, 200, {
      payments,
      summary: {
        total: payments.filter((payment) => payment.status === 'succeeded').length,
        volume: payments.filter((payment) => payment.status === 'succeeded').reduce((sum, payment) => sum + payment.amount, 0)
      }
    })
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/payments/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/payments/'.length))
    const payment = readPayments().find((item) => item.id === id || item.transactionId === id)
    if (!payment) return json(res, 404, { error: 'Payment not found.' })
    return json(res, 200, payment)
  }

  if (req.method === 'POST' && url.pathname === '/api/payments') {
    const ip = req.socket.remoteAddress || 'unknown'
    if (rateLimited(ip)) return json(res, 429, { error: 'Too many requests. Please wait a moment.' })
    try {
      const body = await readBody(req)
      const validated = validatePayment(body)
      const now = new Date().toISOString()
      const payment = {
        id: `pay_${randomUUID().replaceAll('-', '').slice(0, 20)}`,
        transactionId: `TXN-${randomBytes(3).toString('hex').toUpperCase()}`,
        status: 'succeeded',
        amount: validated.amount,
        currency: validated.currency,
        createdAt: now,
        customer: validated.customer,
        card: validated.card,
        billing: validated.billing,
        invoice: validated.invoice,
        merchant: 'State Coin Labs',
        email: { status: 'pending', recipient: process.env.MERCHANT_EMAIL || 'merchant@statecoin.dev' }
      }
      const payments = readPayments()
      payments.unshift(payment)
      writePayments(payments)
      payment.email = await notifyMerchant(payment)
      const updated = readPayments().map((item) => (item.id === payment.id ? payment : item))
      writePayments(updated)
      return json(res, 201, payment)
    } catch (error) {
      const status = error.status || 500
      if (status >= 500) console.error(error)
      return json(res, status, { error: error.message || 'Unable to process payment.' })
    }
  }

  return json(res, 404, { error: 'Not found.' })
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...securityHeaders, Allow: 'GET, HEAD' })
    res.end('Method not allowed')
    return
  }
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'
  const relative = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '')
  let file = join(dist, relative)
  try {
    const info = await stat(file)
    if (info.isDirectory()) file = join(file, 'index.html')
  } catch {
    if (!extname(pathname)) {
      file = join(dist, 'index.html')
    } else {
      res.writeHead(404, securityHeaders)
      res.end('Not found')
      return
    }
  }
  const ext = extname(file)
  const isHtml = ext === '.html'
  const headers = {
    ...securityHeaders,
    'Content-Type': mime[ext] || 'application/octet-stream',
    'Cache-Control': isHtml ? 'no-store' : 'public, max-age=31536000, immutable'
  }
  res.writeHead(200, headers)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file).pipe(res)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
      return
    }
    await serveStatic(req, res, url)
  } catch (error) {
    console.error(error)
    if (!res.headersSent) json(res, 500, { error: 'Internal server error.' })
    else res.end()
  }
})

ensureStore()
server.listen(port, '0.0.0.0', () => {
  console.log(`State Coin payments listening on http://0.0.0.0:${port}`)
  console.log(`Static build: ${dist}`)
  console.log(`Merchant email: ${process.env.RESEND_API_KEY ? 'Resend configured' : 'sandbox logging'}`)
})
