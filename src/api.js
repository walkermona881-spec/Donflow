async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }
  return data
}

export function createPayment(payload) {
  return request('/api/payments', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function getPayments() {
  return request('/api/payments')
}

export function getPayment(id) {
  return request(`/api/payments/${encodeURIComponent(id)}`)
}

export function checkHealth() {
  return request('/api/health')
}
