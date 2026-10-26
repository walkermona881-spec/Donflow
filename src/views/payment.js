import { createPayment } from '../api.js'
import { icon } from '../icons.js'
import {
  detectCardBrand,
  digitsOnly,
  escapeHtml,
  formatCardNumber,
  formatCurrency,
  formatDate,
  formatExpiry,
  getInvoiceFromUrl,
  isExpiryFuture,
  luhnCheck,
  navigate,
  parseExpiry,
  showToast,
  writeSession
} from '../utils.js'

function field({ name, label, type = 'text', placeholder = '', autocomplete = '', full = false, inputmode = '', maxlength = '', iconName = '', trailing = '' }) {
  return `
    <label class="field${full ? ' field-full' : ''}" for="${name}">
      <span class="field-label">${label}</span>
      <span class="input-shell">
        ${iconName ? icon(iconName, 'input-icon') : ''}
        <input
          id="${name}"
          name="${name}"
          type="${type}"
          placeholder="${placeholder}"
          ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
          ${inputmode ? `inputmode="${inputmode}"` : ''}
          ${maxlength ? `maxlength="${maxlength}"` : ''}
          aria-describedby="${name}-error"
        />
        ${trailing}
      </span>
      <span class="field-error" id="${name}-error" aria-live="polite"></span>
    </label>
  `
}

export function renderPayment() {
  const invoice = getInvoiceFromUrl()
  const amount = formatCurrency(invoice.amount, invoice.currency)
  return `
    <main class="payment-page">
      <div class="payment-grid">
        <section class="payment-main">
          <div class="eyebrow"><span class="eyebrow-dot"></span> Secure payment request</div>
          <h1>Complete your payment</h1>
          <p class="page-lede">Pay <strong>${amount}</strong> to <strong>${escapeHtml(invoice.merchant)}</strong>. Your card details are encrypted and never stored in full.</p>

          <form id="payment-form" class="payment-card" novalidate>
            <div class="sandbox-banner">
              ${icon('info', 'sandbox-icon')}
              <div>
                <strong>Sandbox checkout</strong>
                <span>Use test card 4242 4242 4242 4242. Never enter real card details.</span>
              </div>
              <button type="button" class="text-button" id="fill-test-card">Use test card</button>
            </div>

            <div class="card-heading">
              <div>
                <h2>Payment details</h2>
                <p>Fields marked <span class="required">*</span> are required</p>
              </div>
              <span class="secure-chip">${icon('lock')} 256-bit SSL</span>
            </div>

            <section class="form-section" aria-labelledby="contact-heading">
              <div class="section-title">
                <span class="section-number">01</span>
                <div>
                  <h3 id="contact-heading">Contact information</h3>
                  <p>We'll use this to send your payment confirmation.</p>
                </div>
              </div>
              <div class="field-grid">
                ${field({ name: 'customerName', label: 'Full name *', placeholder: 'Jordan Lee', autocomplete: 'name', iconName: 'user' })}
                ${field({ name: 'email', label: 'Email address *', type: 'email', placeholder: 'jordan@company.com', autocomplete: 'email', inputmode: 'email', iconName: 'mail' })}
              </div>
            </section>

            <section class="form-section" aria-labelledby="card-heading">
              <div class="section-title">
                <span class="section-number">02</span>
                <div>
                  <h3 id="card-heading">Card information</h3>
                  <p>Your full card number, CVV and PIN are never saved.</p>
                </div>
              </div>
              <div class="field-grid">
                ${field({ name: 'holderName', label: 'Name on card *', placeholder: 'JORDAN LEE', autocomplete: 'cc-name', full: true, iconName: 'credit-card' })}
                ${field({
                  name: 'cardNumber',
                  label: 'Card number *',
                  placeholder: '4242 4242 4242 4242',
                  autocomplete: 'cc-number',
                  inputmode: 'numeric',
                  maxlength: '23',
                  full: true,
                  iconName: 'credit-card',
                  trailing: '<span class="card-brand" id="card-brand" data-brand="card">CARD</span>'
                })}
                ${field({ name: 'expiry', label: 'Expiry date *', placeholder: 'MM / YY', autocomplete: 'cc-exp', inputmode: 'numeric', maxlength: '7', iconName: 'calendar' })}
                <label class="field" for="cvv">
                  <span class="field-label">Security code * <span class="label-hint" title="The 3-digit code on the back of your card">${icon('info')}</span></span>
                  <span class="input-shell">
                    ${icon('lock', 'input-icon')}
                    <input id="cvv" name="cvv" type="password" placeholder="123" autocomplete="cc-csc" inputmode="numeric" maxlength="4" aria-describedby="cvv-error" />
                    <span class="cvv-hint">3 digits</span>
                  </span>
                  <span class="field-error" id="cvv-error" aria-live="polite"></span>
                </label>
              </div>
            </section>

            <section class="form-section" aria-labelledby="billing-heading">
              <div class="section-title">
                <span class="section-number">03</span>
                <div>
                  <h3 id="billing-heading">Billing address</h3>
                  <p>This must match the address on your card statement.</p>
                </div>
              </div>
              <div class="field-grid">
                ${field({ name: 'address', label: 'Street address *', placeholder: '123 Market Street', autocomplete: 'street-address', full: true, iconName: 'map-pin' })}
                ${field({ name: 'city', label: 'City *', placeholder: 'San Francisco', autocomplete: 'address-level2' })}
                ${field({ name: 'state', label: 'State / Province *', placeholder: 'CA', autocomplete: 'address-level1' })}
                ${field({ name: 'postal', label: 'ZIP / Postal code *', placeholder: '94103', autocomplete: 'postal-code', inputmode: 'numeric', maxlength: '12' })}
                <label class="field" for="country">
                  <span class="field-label">Country *</span>
                  <span class="input-shell">
                    ${icon('globe', 'input-icon')}
                    <select id="country" name="country" autocomplete="country-name">
                      <option value="">Select country</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Ireland">Ireland</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="India">India</option>
                      <option value="Singapore">Singapore</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Other">Other</option>
                    </select>
                  </span>
                  <span class="field-error" id="country-error" aria-live="polite"></span>
                </label>
              </div>
            </section>

            <div class="form-status" id="form-status" role="alert" aria-live="assertive"></div>

            <div class="pay-area">
              <div class="pay-total">
                <span>Total due</span>
                <strong>${amount}</strong>
              </div>
              <button class="btn btn-primary btn-pay" type="submit" id="pay-button">
                <span class="button-label">${icon('lock')} Pay ${amount}</span>
                <span class="button-spinner" aria-hidden="true"></span>
                ${icon('arrowRight', 'button-arrow')}
              </button>
              <p class="secure-note">${icon('shield')} Protected with 256-bit encryption. State Coin never stores your full card number, CVV or PIN.</p>
            </div>
          </form>

          <div class="accepted-cards">
            <span>Accepted methods</span>
            <div class="card-logos" aria-label="Visa, Mastercard, American Express, Discover">
              <span class="card-logo visa">VISA</span>
              <span class="card-logo mastercard"><i></i><i></i></span>
              <span class="card-logo amex">AMEX</span>
              <span class="card-logo discover">DISC</span>
            </div>
          </div>
        </section>

        <aside class="payment-side" aria-label="Order summary">
          <div class="summary-card">
            <div class="summary-glow"></div>
            <div class="summary-topline">
              <span class="summary-label">Payment summary</span>
              <span class="summary-status"><span></span> Awaiting payment</span>
            </div>
            <div class="summary-invoice">
              <span>Invoice</span>
              <strong>${escapeHtml(invoice.id)}</strong>
            </div>
            <div class="summary-merchant">
              <span class="merchant-mark">SC</span>
              <div>
                <strong>${escapeHtml(invoice.merchant)}</strong>
                <span>Verified merchant ${icon('checkCircle')}</span>
              </div>
            </div>
            <div class="summary-rule"></div>
            <div class="summary-item">
              <span>${escapeHtml(invoice.description)}</span>
              <strong>${amount}</strong>
            </div>
            <div class="summary-item summary-item-muted">
              <span>${escapeHtml(invoice.detail)}</span>
              <span>1 year</span>
            </div>
            <div class="summary-total">
              <span>Total due</span>
              <strong>${amount}</strong>
            </div>
            <div class="summary-dates">
              <span>${icon('clock')} Due today</span>
              <span>${icon('calendar')} ${formatDate(invoice.dueDate)}</span>
            </div>
          </div>

          <div class="assurance-card" id="security">
            <div class="assurance-title">
              <span class="assurance-icon">${icon('shield')}</span>
              <div>
                <h3>Why you can trust this payment</h3>
                <p>Security is built into every step.</p>
              </div>
            </div>
            <ul class="assurance-list">
              <li>${icon('lock')} <span><strong>Encrypted end to end.</strong> Card data is protected with TLS 1.3 and tokenization.</span></li>
              <li>${icon('credit-card')} <span><strong>Never stored in full.</strong> Only the card brand and last four digits are retained.</span></li>
              <li>${icon('mail')} <span><strong>Instant confirmation.</strong> The merchant is notified the moment payment succeeds.</span></li>
            </ul>
          </div>

          <div class="help-card">
            <div>
              <span>Questions about this invoice?</span>
              <a href="mailto:support@statecoin.dev">support@statecoin.dev</a>
            </div>
            ${icon('mail')}
          </div>
        </aside>
      </div>
    </main>
  `
}

export function mountPayment(root) {
  const form = root.querySelector('#payment-form')
  if (!form) return
  const invoice = getInvoiceFromUrl()
  const cardNumber = form.elements.cardNumber
  const expiry = form.elements.expiry
  const cvv = form.elements.cvv
  const brandBadge = root.querySelector('#card-brand')
  const payButton = root.querySelector('#pay-button')
  const formStatus = root.querySelector('#form-status')

  const updateBrand = () => {
    const brand = detectCardBrand(cardNumber.value)
    brandBadge.textContent = brand.short
    brandBadge.dataset.brand = brand.id
  }

  cardNumber.addEventListener('input', (event) => {
    event.target.value = formatCardNumber(event.target.value)
    updateBrand()
  })

  expiry.addEventListener('input', (event) => {
    event.target.value = formatExpiry(event.target.value)
  })

  cvv.addEventListener('input', (event) => {
    event.target.value = digitsOnly(event.target.value).slice(0, 4)
  })

  root.querySelector('#fill-test-card').addEventListener('click', () => {
    cardNumber.value = formatCardNumber('4242424242424242')
    expiry.value = formatExpiry('1230')
    cvv.value = '123'
    updateBrand()
    setError('cardNumber', '')
    setError('expiry', '')
    setError('cvv', '')
    showToast('Test card details added')
  })

  function setError(name, message) {
    const input = form.elements[name]
    if (!input) return
    const field = input.closest('.field')
    field?.classList.toggle('has-error', Boolean(message))
    const error = form.querySelector(`#${name}-error`)
    if (error) error.textContent = message || ''
    input.setAttribute('aria-invalid', message ? 'true' : 'false')
  }

  function validate() {
    const values = Object.fromEntries(new FormData(form).entries())
    const errors = {}
    if ((values.customerName || '').trim().length < 2) errors.customerName = 'Enter the customer’s full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((values.email || '').trim())) errors.email = 'Enter a valid email address.'
    if ((values.holderName || '').trim().length < 2) errors.holderName = 'Enter the name shown on the card.'
    if (!luhnCheck(values.cardNumber || '')) errors.cardNumber = 'Enter a valid card number.'
    if (!isExpiryFuture(values.expiry || '')) errors.expiry = 'Enter a valid future expiry date.'
    if (!/^\d{3,4}$/.test(values.cvv || '')) errors.cvv = 'Enter the 3 or 4 digit security code.'
    if ((values.address || '').trim().length < 4) errors.address = 'Enter your street address.'
    if ((values.city || '').trim().length < 2) errors.city = 'Enter your city.'
    if ((values.state || '').trim().length < 2) errors.state = 'Enter your state or province.'
    if ((values.postal || '').trim().length < 3) errors.postal = 'Enter your ZIP or postal code.'
    if (!values.country) errors.country = 'Select your country.'

    ;['customerName', 'email', 'holderName', 'cardNumber', 'expiry', 'cvv', 'address', 'city', 'state', 'postal', 'country'].forEach((name) => {
      setError(name, errors[name] || '')
    })

    const firstError = Object.keys(errors)[0]
    if (firstError) {
      form.elements[firstError]?.focus()
      formStatus.textContent = 'Please check the highlighted fields and try again.'
      formStatus.classList.add('is-visible')
      return null
    }

    formStatus.textContent = ''
    formStatus.classList.remove('is-visible')
    const parsedExpiry = parseExpiry(values.expiry)
    const brand = detectCardBrand(values.cardNumber)
    return {
      amount: invoice.amount,
      currency: invoice.currency,
      invoice: { id: invoice.id, description: invoice.description },
      customer: {
        name: values.customerName.trim(),
        email: values.email.trim()
      },
      card: {
        brand: brand.label,
        brandId: brand.id,
        last4: digitsOnly(values.cardNumber).slice(-4),
        expMonth: parsedExpiry.month,
        expYear: parsedExpiry.year,
        holderName: values.holderName.trim()
      },
      billing: {
        line1: values.address.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        postalCode: values.postal.trim(),
        country: values.country
      }
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (payButton.disabled) return
    const payload = validate()
    if (!payload) return

    payButton.disabled = true
    payButton.classList.add('is-loading')
    payButton.querySelector('.button-label').textContent = 'Processing payment'
    formStatus.textContent = ''
    formStatus.classList.remove('is-visible')

    try {
      const payment = await createPayment(payload)
      writeSession('statecoin:last-payment', payment)
      cardNumber.value = ''
      cvv.value = ''
      navigate(`/success?id=${encodeURIComponent(payment.id)}`)
    } catch (error) {
      payButton.disabled = false
      payButton.classList.remove('is-loading')
      payButton.querySelector('.button-label').innerHTML = `${icon('lock')} Pay ${formatCurrency(invoice.amount, invoice.currency)}`
      formStatus.textContent = error.message || 'We could not process this payment. Please try again.'
      formStatus.classList.add('is-visible')
      showToast(error.message || 'Payment failed', 'error')
    }
  })
}
