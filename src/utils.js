export function formatCurrency(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(Number(cents || 0) / 100)
}

export function formatDate(value, options = {}) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  }).format(date)
}

export function formatDateTime(value) {
  return formatDate(value, { hour: 'numeric', minute: '2-digit' })
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

export function luhnCheck(number) {
  const digits = digitsOnly(number)
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let double = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

export function detectCardBrand(number) {
  const digits = digitsOnly(number)
  if (/^4/.test(digits)) return { id: 'visa', label: 'Visa', short: 'VISA' }
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return { id: 'mastercard', label: 'Mastercard', short: 'MC' }
  if (/^3[47]/.test(digits)) return { id: 'amex', label: 'American Express', short: 'AMEX' }
  if (/^(6011|65|64[4-9])/.test(digits)) return { id: 'discover', label: 'Discover', short: 'DISC' }
  return { id: 'card', label: 'Card', short: 'CARD' }
}

export function formatCardNumber(value) {
  const digits = digitsOnly(value).slice(0, 19)
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ')
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`
}

export function parseExpiry(value) {
  const digits = digitsOnly(value)
  if (digits.length !== 4) return null
  const month = Number(digits.slice(0, 2))
  const year = 2000 + Number(digits.slice(2))
  if (month < 1 || month > 12) return null
  return { month, year }
}

export function isExpiryFuture(value) {
  const expiry = parseExpiry(value)
  if (!expiry) return false
  const now = new Date()
  const endOfMonth = new Date(expiry.year, expiry.month, 1)
  return endOfMonth > now
}

export function maskCard(last4) {
  return `•••• ${last4 || '••••'}`
}

export function getInvoiceFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const rawAmount = Number(params.get('amount'))
  const amount = Number.isFinite(rawAmount) && rawAmount >= 1 && rawAmount <= 100000
    ? Math.round(rawAmount * 100)
    : 24900
  const id = (params.get('invoice') || 'INV-2048').replace(/[^A-Za-z0-9-_]/g, '').slice(0, 32) || 'INV-2048'
  return {
    id,
    amount,
    currency: 'USD',
    description: params.get('description')?.slice(0, 80) || 'State Coin Growth Plan',
    detail: 'Annual subscription',
    merchant: 'State Coin Labs',
    dueDate: new Date().toISOString()
  }
}

export function navigate(path, options = {}) {
  if (path === window.location.pathname + window.location.search) {
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  if (!options.preserveScroll) window.scrollTo({ top: 0, behavior: 'auto' })
}

export function readSession(key, fallback = null) {
  try {
    const value = sessionStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    return false
  }
  return true
}

export function statusLabel(status) {
  if (status === 'succeeded') return 'Successful'
  if (status === 'pending') return 'Pending'
  if (status === 'refunded') return 'Refunded'
  return status ? status[0].toUpperCase() + status.slice(1) : 'Unknown'
}

export function relativeDayLabel(value) {
  const date = new Date(value)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((start - target) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return formatDate(value, { month: 'short', day: 'numeric' })
}

export function showToast(message, tone = 'success') {
  let toast = document.querySelector('.toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  toast.dataset.tone = tone
  toast.innerHTML = `<span class="toast-icon">${tone === 'success' ? '✓' : '!'}</span><span>${escapeHtml(message)}</span>`
  toast.classList.add('is-visible')
  window.clearTimeout(showToast.timeout)
  showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3600)
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const input = document.createElement('textarea')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  input.remove()
}
