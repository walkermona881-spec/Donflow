import { getPayment } from '../api.js'
import { icon } from '../icons.js'
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  maskCard,
  readSession,
  showToast,
  statusLabel,
  writeSession
} from '../utils.js'

function notificationText(payment) {
  const status = payment.email?.status
  const recipient = payment.email?.recipient || 'merchant@statecoin.dev'
  if (status === 'delivered') return { tone: 'success', label: 'Merchant notified', detail: `A payment notification was emailed to ${recipient}.` }
  if (status === 'failed') return { tone: 'warning', label: 'Notification delayed', detail: 'Payment succeeded, but the merchant email could not be delivered.' }
  return { tone: 'info', label: 'Merchant notification logged', detail: `Sandbox email notification recorded for ${recipient}.` }
}

function resultMarkup(payment) {
  const note = notificationText(payment)
  const firstName = payment.customer?.name?.split(' ')[0] || 'there'
  const emailNote = note.tone === 'success' ? 'A confirmation was sent to the merchant.' : note.detail
  return `
    <div class="result-card">
      <div class="success-orbit" aria-hidden="true">
        <span class="orbit-ring"></span>
        <span class="orbit-ring orbit-ring-two"></span>
        <span class="success-check">${icon('check')}</span>
      </div>
      <span class="eyebrow result-eyebrow"><span class="eyebrow-dot"></span> Payment complete</span>
      <h1>Payment successful</h1>
      <p class="result-lede">Thank you, ${escapeHtml(firstName)}. Your payment to <strong>State Coin Labs</strong> has been confirmed.</p>

      <div class="result-amount">
        <span>Amount paid</span>
        <strong>${formatCurrency(payment.amount, payment.currency)}</strong>
        <span class="result-status">${icon('checkCircle')} ${statusLabel(payment.status)}</span>
      </div>

      <div class="receipt-grid">
        <div class="receipt-item">
          <span>Transaction ID</span>
          <strong class="mono">${escapeHtml(payment.transactionId)}</strong>
        </div>
        <div class="receipt-item">
          <span>Date & time</span>
          <strong>${formatDateTime(payment.createdAt)}</strong>
        </div>
        <div class="receipt-item">
          <span>Payment method</span>
          <strong>${escapeHtml(payment.card?.brand || 'Card')} ${maskCard(payment.card?.last4)}</strong>
        </div>
        <div class="receipt-item">
          <span>Customer</span>
          <strong>${escapeHtml(payment.customer?.email || '')}</strong>
        </div>
      </div>

      <div class="notification-banner notification-${note.tone}">
        <span class="notification-icon">${icon(note.tone === 'success' ? 'mail' : 'info')}</span>
        <div>
          <strong>${escapeHtml(note.label)}</strong>
          <span>${escapeHtml(emailNote)}</span>
        </div>
        <span class="notification-tag">${note.tone === 'success' ? 'Delivered' : note.tone === 'warning' ? 'Retry queued' : 'Sandbox'}</span>
      </div>

      <div class="result-actions">
        <button class="btn btn-primary" type="button" id="print-receipt">${icon('receipt')} View receipt</button>
        <a class="btn btn-secondary" href="/dashboard" data-link>${icon('chart')} Open dashboard</a>
        <a class="text-link" href="/" data-link>Make another payment ${icon('arrowRight')}</a>
      </div>

      <div class="result-footnote">
        ${icon('lock')}
        <span>For your security, only the card brand and last four digits were retained. Your full card number, CVV and PIN were never stored.</span>
      </div>
    </div>
  `
}

export function renderSuccess() {
  return `
    <main class="result-page">
      <div class="result-shell" id="result-content">
        <div class="result-card result-loading" aria-live="polite">
          <div class="loading-spinner"></div>
          <p>Retrieving your payment confirmation…</p>
        </div>
      </div>
      <div class="result-next">
        <div class="next-card">
          <span class="next-icon">${icon('mail')}</span>
          <div>
            <strong>Merchant notification</strong>
            <p>Transaction details are sent to the merchant automatically. Card authentication data is never included.</p>
          </div>
        </div>
        <div class="next-card">
          <span class="next-icon">${icon('shield')}</span>
          <div>
            <strong>Protected by State Coin</strong>
            <p>Only non-sensitive card metadata is stored to help you recognise this payment.</p>
          </div>
        </div>
      </div>
    </main>
  `
}

export function mountSuccess(root) {
  const container = root.querySelector('#result-content')
  const params = new URLSearchParams(window.location.search)
  const paymentId = params.get('id')
  const cached = readSession('statecoin:last-payment')
  let payment = cached && (!paymentId || cached.id === paymentId) ? cached : null

  const paint = () => {
    if (!payment) return
    container.innerHTML = resultMarkup(payment)
    container.querySelector('#print-receipt')?.addEventListener('click', () => window.print())
    writeSession('statecoin:last-payment', payment)
  }

  paint()

  if (!paymentId && !payment) {
    container.innerHTML = `
      <div class="result-card result-empty">
        <span class="empty-icon">${icon('alert')}</span>
        <h1>No payment selected</h1>
        <p>Open the confirmation link from your receipt, or return to the payment page to get started.</p>
        <a class="btn btn-primary" href="/" data-link>Return to payment page ${icon('arrowRight')}</a>
      </div>
    `
    return
  }

  if (!paymentId) return

  getPayment(paymentId)
    .then((fresh) => {
      payment = fresh
      paint()
    })
    .catch((error) => {
      if (payment) return
      container.innerHTML = `
        <div class="result-card result-empty">
          <span class="empty-icon">${icon('alert')}</span>
          <h1>We couldn't find that payment</h1>
          <p>${escapeHtml(error.message || 'The confirmation link may have expired.')}</p>
          <a class="btn btn-primary" href="/" data-link>Return to payment page ${icon('arrowRight')}</a>
        </div>
      `
      showToast('Payment confirmation unavailable', 'error')
    })
}
