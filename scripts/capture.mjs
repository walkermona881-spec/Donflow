import { createRequire } from 'node:module'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR
if (!url || !output) {
  console.error('Set CAPTURE_URL and CAPTURE_DIR.')
  process.exit(1)
}

const started = performance.now()
const step = (name, at) => console.log(`[capture] ${name}: ${Math.round(performance.now() - at)}ms`)

class CaptureError extends Error {
  constructor(message, exitCode) {
    super(message)
    this.exitCode = exitCode
  }
}

const transient = (error, context) => {
  throw new CaptureError(`${context}: ${error?.message || error}`, 75)
}

const runtime = process.env.PLAYWRIGHT_RUNTIME || join(process.env.HOME, '.local/share/omgithub-playwright')
const runtimePackage = join(runtime, 'package.json')
let chromium
try {
  const require = createRequire(runtimePackage)
  ;({ chromium } = require('playwright'))
} catch (error) {
  transient(error, 'Playwright is not available')
}

let config = { browser: { launchOptions: {} } }
try {
  config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
} catch {
  config = { browser: { launchOptions: {} } }
}
if (process.platform === 'linux' && !process.env.DISPLAY) {
  try {
    process.env.DISPLAY = ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()
  } catch {
    process.env.DISPLAY = ':99'
  }
}

const launchAt = performance.now()
let browser
try {
  browser = await chromium.launch({
    ...config.browser.launchOptions,
    headless: true,
    timeout: 30000
  })
} catch (error) {
  transient(error, 'Browser launch failed')
}
step('browser launch', launchAt)

const views = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
]

try {
  for (const view of views) {
    const viewAt = performance.now()
    let page
    try {
      page = await browser.newPage({
        viewport: { width: view.width, height: view.height },
        deviceScaleFactor: 1,
        isMobile: view.mobile,
        hasTouch: view.mobile
      })
    } catch (error) {
      transient(error, `Could not open ${view.name} page`)
    }
    page.setDefaultTimeout(45000)
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    let response
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    } catch (error) {
      transient(error, `Navigation failed for ${view.name}`)
    }
    if (!response) transient(new Error('No HTTP response'), `Navigation failed for ${view.name}`)
    if (!response.ok()) {
      const code = [408, 429, 500, 502, 503, 504].includes(response.status()) ? 75 : 1
      throw new CaptureError(`HTTP ${response.status()} loading ${url}`, code)
    }

    try {
      await page.waitForSelector('html[data-app-ready="true"]', { state: 'attached', timeout: 30000 })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => {
        const app = document.querySelector('#app')
        return app && app.innerText.trim().length > 80
      }, { timeout: 15000 })
    } catch (error) {
      throw new CaptureError(`Rendered content did not become ready for ${view.name}: ${error.message}`, 1)
    }

    await page.waitForTimeout(700)
    const file = join(output, `final-${view.name}.png`)
    try {
      await page.screenshot({ path: file, fullPage: false, timeout: 30000 })
    } catch (error) {
      transient(error, `Screenshot failed for ${view.name}`)
    }

    const size = statSync(file).size
    if (size < 10000) throw new CaptureError(`Screenshot for ${view.name} looks blank (${size} bytes)`, 1)
    if (pageErrors.length) console.error(`[capture] ${view.name} page errors: ${pageErrors.join(' | ')}`)
    console.log(`[capture] ${view.name}: ${file} (${size} bytes)`)
    step(`${view.name} capture`, viewAt)
    await page.close()
  }
} catch (error) {
  console.error(error.message || error)
  process.exitCode = error.exitCode || 1
} finally {
  try {
    await browser?.close()
  } catch (error) {
    console.error(`Browser close failed: ${error.message}`)
    process.exitCode ||= 75
  }
}

step('total', started)
process.exit(process.exitCode || 0)
