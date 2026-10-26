import { getPayments } from '../api.js'
import { demoPayments } from '../demo-data.js'
import { icon } from '../icons.js'
import {
  copyText,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  maskCard,
  relativeDayLabel,
  showToast,
  statusLabel
} from '../utils.js'

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function emailMeta(payment) {
  const status = payment.email?.status
  if (status === 'delivered') return { label: 'Sent', tone: 'success', icon: 'check' }
  if (status === 'failed') return { label: 'Failed', tone: 'danger', icon: 'alert' }
  return { label: 'Sandbox', tone: 'info', icon: 'mail' }
}

function metricCard({ label, value, detail, iconName, tone = 'default' }) {
  return `
    <article class="metric-card metric-${tone}">
      <div class="metric-top">
        <span class="metric-icon">${icon(iconName)}</span>
        <span class="metric-detail">${escapeHtml(detail)}</span>
      </div>
      <strong class="metric-value">${escapeHtml(value)}</strong>
      <span class="metric-label">${escapeHtml(label)}</span>
    </article>
  `
}

function dayKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function chartMarkup(payments) {
  const days = []
  const today = new Date()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
    days.push({ date, total: 0 })
  }
  const map = new Map(days.map((day) => [dayKey(day.date), day]))
  payments.forEach((payment) => {
    const day = map.get(dayKey(payment.createdAt))
    if (day && payment.status === 'succeeded') day.total += Number(payment.amount || 0)
  })
  const max = Math.max(...days.map((day) => day.total), 1)
  const weekTotal = days.reduce((sum, day) => sum + day.total, 0)
  return `
    <div class="chart-head">
      <div>
        <span class="card-kicker">Last 7 days</span>
        <h2>${formatCurrency(weekTotal)}</h2>
        <p>Collected volume</p>
      </div>
      <span class="chart-badge">${icon('trend')} Live</span>
    </div>
    <div class="bar-chart" role="img" aria-label="Payment volume for the last seven days">
      ${days.map((day) => {
        const height = Math.max(6, Math.round((day.total / max) * 100))
        return `
          <div class="bar-column" title="${formatDate(day.date)}: ${formatCurrency(day.total)}">
            <span class="bar-value">${day.total ? formatCurrency(day.total, 'USD').replace('.00', '') : ''}</span>
            <span class="bar-track"><span class="bar-fill" style="height:${height}%"></span></span>
            <span class="bar-label">${new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date)}</span>
          </div>
        `
      }).join('')}
    </div>
  `
}

function metricMarkup(payments) {
  const successful = payments.filter((payment) => payment.status === 'succeeded')
  const volume = successful.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const average = successful.length ? volume / successful.length : 0
  const notified = successful.filter((payment) => ['delivered', 'simulated'].includes(payment.email?.status)).length
  return [
    { label: 'Gross volume', value: formatCurrency(volume), detail: 'All time', iconName: 'wallet', tone: 'green' },
    { label: 'Successful payments', value: String(successful.length), detail: 'Settled', iconName: 'checkCircle', tone: 'blue' },
    { label: 'Average payment', value: formatCurrency(average), detail: 'Per transaction', iconName: 'chart', tone: 'violet' },
    { label: 'Notifications', value: `${notified}/${successful.length}`, detail: 'Merchant emails', iconName: 'mail', tone: 'amber' }
  ].map(metricCard).join('')
}

function tableRows(payments) {
  return payments.map((payment) => {
    const email = emailMeta(payment)
    return `
      <tr data-payment-id="${escapeHtml(payment.id)}" tabindex="0">
        <td>
          <div class="transaction-cell">
            <span class="transaction-icon">${icon('receipt')}</span>
            <div>
              <strong class="mono">${escapeHtml(payment.transactionId)}</strong>
              <span>${escapeHtml(payment.invoice?.id || 'Payment')}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="customer-cell">
            <span class="avatar">${escapeHtml(initials(payment.customer?.name))}</span>
            <div>
              <strong>${escapeHtml(payment.customer?.name || 'Unknown customer')}</strong>
              <span>${escapeHtml(payment.customer?.email || '')}</span>
            </div>
          </div>
        </td>
        <td><strong class="amount-cell">${formatCurrency(payment.amount, payment.currency)}</strong></td>
        <td>
          <div class="method-cell">
            <span class="method-badge brand-${escapeHtml(payment.card?.brandId || 'card')}">${escapeHtml(payment.card?.brand || 'Card')}</span>
            <span>${maskCard(payment.card?.last4)}</span>
          </div>
        </td>
        <td>
          <div class="date-cell">
            <strong>${relativeDayLabel(payment.createdAt)}</strong>
            <span>${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(payment.createdAt))}</span>
          </div>
        </td>
        <td>
          <span class="email-state email-${email.tone}"><i></i>${email.label}</span>
        </td>
        <td><span class="status-pill status-${escapeHtml(payment.status)}">${statusLabel(payment.status)}</span></td>
        <td><button class="row-button" type="button" aria-label="View ${escapeHtml(payment.transactionId)}">${icon('chevronRight')}</button></td>
      </tr>
    `
  }).join('')
}

function mobileCards(payments) {
  return payments.map((payment) => {
    const email = emailMeta(payment)
    return `
      <button class="mobile-payment" type="button" data-payment-id="${escapeHtml(payment.id)}">
        <span class="mobile-payment-top">
          <span class="avatar">${escapeHtml(initials(payment.customer?.name))}</span>
          <span class="mobile-payment-person">
            <strong>${escapeHtml(payment.customer?.name || 'Unknown customer')}</strong>
            <span>${escapeHtml(payment.customer?.email || '')}</span>
          </span>
          <strong class="mobile-payment-amount">${formatCurrency(payment.amount, payment.currency)}</strong>
        </span>
        <span class="mobile-payment-bottom">
          <span class="mono">${escapeHtml(payment.transactionId)}</span>
          <span class="email-state email-${email.tone}"><i></i>${email.label}</span>
          <span class="status-pill status-${escapeHtml(payment.status)}">${statusLabel(payment.status)}</span>
        </span>
      </button>
    `
  }).join('')
}

function emptyMarkup() {
  return `
    <div class="table-empty">
      <span class="empty-icon">${icon('search')}</span>
      <h3>No matching payments</h3>
      <p>Try a different search or date range.</p>
    </div>
  `
}

function drawerMarkup(payment) {
  const email = emailMeta(payment)
  return `
    <div class="drawer-overlay" id="drawer-overlay">
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div class="drawer-head">
          <div>
            <span class="card-kicker">Transaction details</span>
            <h2 id="drawer-title" class="mono">${escapeHtml(payment.transactionId)}</h2>
          </div>
          <button class="icon-button" type="button" id="drawer-close" aria-label="Close details">${icon('x')}</button>
        </div>
        <div class="drawer-body">
          <div class="drawer-amount">
            <span>Amount</span>
            <strong>${formatCurrency(payment.amount, payment.currency)}</strong>
            <span class="status-pill status-${escapeHtml(payment.status)}">${statusLabel(payment.status)}</span>
          </div>

          <section class="drawer-section">
            <h3>Customer</h3>
            <div class="detail-row"><span>Name</span><strong>${escapeHtml(payment.customer?.name || '—')}</strong></div>
            <div class="detail-row"><span>Email</span><strong>${escapeHtml(payment.customer?.email || '—')}</strong></div>
            <div class="detail-row"><span>Invoice</span><strong>${escapeHtml(payment.invoice?.id || '—')}</strong></div>
          </section>

          <section class="drawer-section">
            <h3>Payment method</h3>
            <div class="detail-row"><span>Card</span><strong>${escapeHtml(payment.card?.brand || 'Card')} ${maskCard(payment.card?.last4)}</strong></div>
            <div class="detail-row"><span>Cardholder</span><strong>${escapeHtml(payment.card?.holderName || '—')}</strong></div>
            <div class="detail-row"><span>Expiry</span><strong>${String(payment.card?.expMonth || '').padStart(2, '0')} / ${payment.card?.expYear || '—'}</strong></div>
          </section>

          <section class="drawer-section">
            <h3>Billing address</h3>
            <address>
              ${escapeHtml(payment.billing?.line1 || '—')}<br />
              ${escapeHtml(payment.billing?.city || '')}${payment.billing?.state ? `, ${escapeHtml(payment.billing.state)}` : ''} ${escapeHtml(payment.billing?.postalCode || '')}<br />
              ${escapeHtml(payment.billing?.country || '')}
            </address>
          </section>

          <section class="drawer-section">
            <h3>Timeline</h3>
            <div class="detail-row"><span>Paid</span><strong>${formatDateTime(payment.createdAt)}</strong></div>
            <div class="detail-row"><span>Notification</span><strong class="email-inline email-${email.tone}"><i></i>${email.label}</strong></div>
          </section>

          <div class="drawer-security">
            ${icon('shield')}
            <p><strong>No sensitive authentication data.</strong> Full card numbers, CVVs and PINs are never collected or stored. Only the card brand, expiry and last four digits are retained.</p>
          </div>
        </div>
      </aside>
    </div>
  `
}

export function renderDashboard() {
  return `
    <main class="dashboard-page">
      <section class="dashboard-hero">
        <div>
          <span class="eyebrow"><span class="eyebrow-dot"></span> Merchant workspace</span>
          <h1>Payments</h1>
          <p>Track successful payments, customer details and merchant notifications from one place.</p>
        </div>
        <div class="dashboard-actions">
          <button class="btn btn-secondary btn-sm" type="button" id="copy-payment-link">${icon('copy')} Copy payment link</button>
          <button class="btn btn-dark btn-sm" type="button" id="export-csv">${icon('download')} Export CSV</button>
        </div>
      </section>

      <div class="metric-grid" id="metric-grid">
        ${Array.from({ length: 4 }, () => '<div class="metric-skeleton"></div>').join('')}
      </div>

      <div class="dashboard-insights">
        <section class="chart-card" id="chart-card">
          <div class="chart-loading"><span class="loading-spinner"></span></div>
        </section>
        <section class="security-summary">
          <span class="security-orb">${icon('shield')}</span>
          <span class="card-kicker">Security posture</span>
          <h2>Card data stays out of your workspace</h2>
          <p>State Coin retains only the metadata needed to recognise a payment. Sensitive authentication data never reaches the dashboard or email inbox.</p>
          <ul>
            <li>${icon('check')} 0 full card numbers stored</li>
            <li>${icon('check')} 0 CVV or PIN values collected</li>
            <li>${icon('check')} Tokenized payment references only</li>
          </ul>
          <span class="security-foot">PCI-aware by design</span>
        </section>
      </div>

      <section class="payments-card">
        <div class="payments-toolbar">
          <div class="toolbar-title">
            <h2>Successful payments</h2>
            <p id="payment-count">Loading transactions…</p>
          </div>
          <div class="toolbar-actions">
            <label class="search-shell" for="payment-search">
              ${icon('search')}
              <input id="payment-search" type="search" placeholder="Search customer or transaction" autocomplete="off" />
            </label>
            <select id="payment-filter" aria-label="Filter payments">
              <option value="all">All payments</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
            <button class="icon-button refresh-button" type="button" id="refresh-payments" aria-label="Refresh payments">${icon('refresh')}</button>
          </div>
        </div>
        <div class="table-wrap" id="table-wrap">
          <div class="table-loading">
            <span class="loading-spinner"></span>
            <span>Loading payments…</span>
          </div>
        </div>
      </section>

      <div class="dashboard-footnote">${icon('lock')} State Coin is a sandbox demonstration. Connect a PCI-compliant payment provider before accepting live payments.</div>
    </main>
    <div id="drawer-root"></div>
  `
}

export function mountDashboard(root) {
  const metricGrid = root.querySelector('#metric-grid')
  const chartCard = root.querySelector('#chart-card')
  const tableWrap = root.querySelector('#table-wrap')
  const countLabel = root.querySelector('#payment-count')
  const search = root.querySelector('#payment-search')
  const filter = root.querySelector('#payment-filter')
  const refresh = root.querySelector('#refresh-payments')
  const drawerRoot = root.querySelector('#drawer-root')
  let payments = []
  let usingFallback = false

  const closeDrawer = () => {
    drawerRoot.innerHTML = ''
    document.body.classList.remove('drawer-open')
  }

  const openDrawer = (id) => {
    const payment = payments.find((item) => item.id === id)
    if (!payment) return
    drawerRoot.innerHTML = drawerMarkup(payment)
    document.body.classList.add('drawer-open')
    const close = drawerRoot.querySelector('#drawer-close')
    close?.focus()
    close?.addEventListener('click', closeDrawer)
    drawerRoot.querySelector('#drawer-overlay')?.addEventListener('click', (event) => {
      if (event.target.id === 'drawer-overlay') closeDrawer()
    })
  }

  const filteredPayments = () => {
    const term = search.value.trim().toLowerCase()
    const range = filter.value
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86400000
    return payments.filter((payment) => {
      if (payment.status !== 'succeeded') return false
      if (cutoff && new Date(payment.createdAt).getTime() < cutoff) return false
      if (!term) return true
      return [
        payment.customer?.name,
        payment.customer?.email,
        payment.transactionId,
        payment.invoice?.id
      ].some((value) => String(value || '').toLowerCase().includes(term))
    })
  }

  const renderTable = () => {
    const visible = filteredPayments()
    countLabel.textContent = `${visible.length} ${visible.length === 1 ? 'payment' : 'payments'} shown${usingFallback ? ' · preview data' : ''}`
    if (!visible.length) {
      tableWrap.innerHTML = emptyMarkup()
      return
    }
    tableWrap.innerHTML = `
      <table class="payments-table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            <th>Email</th>
            <th>Status</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>${tableRows(visible)}</tbody>
      </table>
      <div class="mobile-payment-list">${mobileCards(visible)}</div>
    `

    tableWrap.querySelectorAll('[data-payment-id]').forEach((element) => {
      element.addEventListener('click', () => openDrawer(element.dataset.paymentId))
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDrawer(element.dataset.paymentId)
        }
      })
    })
  }

  const paint = () => {
    metricGrid.innerHTML = metricMarkup(payments)
    chartCard.innerHTML = chartMarkup(payments)
    renderTable()
  }

  const load = async () => {
    refresh.classList.add('is-spinning')
    try {
      const data = await getPayments()
      payments = Array.isArray(data.payments) ? data.payments : []
      usingFallback = false
    } catch {
      payments = demoPayments
      usingFallback = true
      showToast('Showing preview data — API unavailable', 'error')
    } finally {
      refresh.classList.remove('is-spinning')
      paint()
    }
  }

  search.addEventListener('input', renderTable)
  filter.addEventListener('change', renderTable)
  refresh.addEventListener('click', load)

  root.querySelector('#copy-payment-link').addEventListener('click', async () => {
    try {
      await copyText(`${window.location.origin}/?invoice=INV-2048&amount=249.00`)
      showToast('Payment link copied to clipboard')
    } catch {
      showToast('Could not copy the payment link', 'error')
    }
  })

  root.querySelector('#export-csv').addEventListener('click', () => {
    const visible = filteredPayments()
    if (!visible.length) {
      showToast('There are no payments to export', 'error')
      return
    }
    const header = ['transaction_id', 'date', 'customer_name', 'customer_email', 'amount', 'currency', 'card_brand', 'card_last4', 'invoice', 'status', 'email_status']
    const rows = visible.map((payment) => [
      payment.transactionId,
      payment.createdAt,
      payment.customer?.name,
      payment.customer?.email,
      (Number(payment.amount || 0) / 100).toFixed(2),
      payment.currency,
      payment.card?.brand,
      payment.card?.last4,
      payment.invoice?.id,
      payment.status,
      payment.email?.status
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'statecoin-payments.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    showToast(`Exported ${visible.length} payments`)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer()
  })

  load()
}
