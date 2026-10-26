const now = Date.now()
const hoursAgo = (hours) => new Date(now - hours * 3600000).toISOString()

export const demoPayments = [
  {
    id: 'pay_demo_maya',
    transactionId: 'TXN-8F2K9Q',
    status: 'succeeded',
    amount: 24900,
    currency: 'USD',
    createdAt: hoursAgo(1.2),
    customer: { name: 'Maya Chen', email: 'maya@northstar.studio' },
    card: { brand: 'Visa', brandId: 'visa', last4: '4242', expMonth: 8, expYear: 2029, holderName: 'Maya Chen' },
    billing: { line1: '88 King Street West', city: 'Toronto', state: 'ON', postalCode: 'M5H 1J9', country: 'Canada' },
    invoice: { id: 'INV-2048', description: 'State Coin Growth Plan' },
    email: { status: 'delivered', recipient: 'merchant@statecoin.dev', sentAt: hoursAgo(1.1) }
  },
  {
    id: 'pay_demo_daniel',
    transactionId: 'TXN-4M7P2D',
    status: 'succeeded',
    amount: 120000,
    currency: 'USD',
    createdAt: hoursAgo(19),
    customer: { name: 'Daniel Okafor', email: 'daniel@oke.studio' },
    card: { brand: 'Mastercard', brandId: 'mastercard', last4: '4444', expMonth: 11, expYear: 2028, holderName: 'Daniel Okafor' },
    billing: { line1: '14 Admiralty Way', city: 'Lagos', state: 'Lagos', postalCode: '106104', country: 'Nigeria' },
    invoice: { id: 'INV-2047', description: 'State Coin Enterprise' },
    email: { status: 'delivered', recipient: 'merchant@statecoin.dev', sentAt: hoursAgo(18.9) }
  },
  {
    id: 'pay_demo_sofia',
    transactionId: 'TXN-9C1R6S',
    status: 'succeeded',
    amount: 8900,
    currency: 'USD',
    createdAt: hoursAgo(44),
    customer: { name: 'Sofia Martinez', email: 'sofia@atelier-m.co' },
    card: { brand: 'American Express', brandId: 'amex', last4: '0005', expMonth: 3, expYear: 2027, holderName: 'Sofia Martinez' },
    billing: { line1: '701 Congress Avenue', city: 'Austin', state: 'TX', postalCode: '78701', country: 'United States' },
    invoice: { id: 'INV-2046', description: 'State Coin Starter' },
    email: { status: 'delivered', recipient: 'merchant@statecoin.dev', sentAt: hoursAgo(43.9) }
  },
  {
    id: 'pay_demo_noah',
    transactionId: 'TXN-2L5V8N',
    status: 'succeeded',
    amount: 24900,
    currency: 'USD',
    createdAt: hoursAgo(68),
    customer: { name: 'Noah Williams', email: 'noah@fieldwork.io' },
    card: { brand: 'Visa', brandId: 'visa', last4: '1881', expMonth: 6, expYear: 2030, holderName: 'Noah Williams' },
    billing: { line1: '22 Shoreditch High Street', city: 'London', state: 'England', postalCode: 'E1 6PJ', country: 'United Kingdom' },
    invoice: { id: 'INV-2045', description: 'State Coin Growth Plan' },
    email: { status: 'delivered', recipient: 'merchant@statecoin.dev', sentAt: hoursAgo(67.9) }
  },
  {
    id: 'pay_demo_priya',
    transactionId: 'TXN-7H3B5K',
    status: 'succeeded',
    amount: 42000,
    currency: 'USD',
    createdAt: hoursAgo(96),
    customer: { name: 'Priya Raman', email: 'priya@lumenlabs.in' },
    card: { brand: 'Mastercard', brandId: 'mastercard', last4: '9321', expMonth: 1, expYear: 2029, holderName: 'Priya Raman' },
    billing: { line1: '91 Residency Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560025', country: 'India' },
    invoice: { id: 'INV-2044', description: 'State Coin Scale' },
    email: { status: 'delivered', recipient: 'merchant@statecoin.dev', sentAt: hoursAgo(95.9) }
  }
]
