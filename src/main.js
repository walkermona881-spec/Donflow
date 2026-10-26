import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import './styles.css'
import { icon, logoMark } from './icons.js'
import { mountDashboard, renderDashboard } from './views/dashboard.js'
import { mountPayment, renderPayment } from './views/payment.js'
import { mountSuccess, renderSuccess } from './views/success.js'

const app = document.querySelector('#app')

function header(active) {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/" data-link aria-label="State Coin home">
          ${logoMark()}
          <span class="brand-word">State <em>Coin</em></span>
        </a>
        <nav class="main-nav" aria-label="Primary navigation">
          <a href="/" data-link class="${active === 'payment' ? 'is-active' : ''}">Payment page</a>
          <a href="/dashboard" data-link class="${active === 'dashboard' ? 'is-active' : ''}">Dashboard</a>
          <a href="/#security">Security</a>
        </nav>
        <div class="header-actions">
          <span class="sandbox-pill"><span></span> Sandbox</span>
          <a class="btn btn-dark btn-sm header-dashboard" href="/dashboard" data-link>
            ${icon('chart')} <span class="header-dashboard-label">Merchant dashboard</span>
          </a>
        </div>
      </div>
    </header>
  `
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          ${logoMark()}
          <div>
            <strong>State Coin</strong>
            <span>Secure payments, beautifully simple.</span>
          </div>
        </div>
        <div class="footer-meta">
          <span>${icon('shield')} PCI-aware checkout</span>
          <span>${icon('lock')} No card authentication data stored</span>
          <span>© ${new Date().getFullYear()} State Coin</span>
        </div>
      </div>
    </footer>
  `
}

function notFound() {
  return `
    <main class="result-page">
      <div class="result-shell">
        <div class="result-card result-empty">
          <span class="empty-icon">${icon('alert')}</span>
          <h1>Page not found</h1>
          <p>The page you're looking for doesn't exist or has moved.</p>
          <a class="btn btn-primary" href="/" data-link>Return to payment page ${icon('arrowRight')}</a>
        </div>
      </div>
    </main>
  `
}

const routes = {
  '/': {
    title: 'Secure Payment · State Coin',
    active: 'payment',
    render: renderPayment,
    mount: mountPayment
  },
  '/dashboard': {
    title: 'Merchant Dashboard · State Coin',
    active: 'dashboard',
    render: renderDashboard,
    mount: mountDashboard
  },
  '/success': {
    title: 'Payment Confirmation · State Coin',
    active: '',
    render: renderSuccess,
    mount: mountSuccess
  }
}

function render() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const route = routes[path]
  if (!route) {
    document.title = 'Page Not Found · State Coin'
    app.innerHTML = `${header('')}${notFound()}${footer()}`
    document.documentElement.dataset.appReady = 'true'
    return
  }
  document.title = route.title
  document.body.dataset.route = route.active || path.slice(1)
  app.innerHTML = `${header(route.active)}${route.render()}${footer()}`
  route.mount?.(app)
  window.requestAnimationFrame(() => {
    document.documentElement.dataset.appReady = 'true'
    document.body.classList.add('is-rendered')
  })
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-link]')
  if (!link) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return
  const url = new URL(link.href, window.location.href)
  if (url.origin !== window.location.origin) return
  event.preventDefault()
  window.history.pushState({}, '', `${url.pathname}${url.search}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'auto' })
})

window.addEventListener('popstate', render)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render, { once: true })
} else {
  render()
}
