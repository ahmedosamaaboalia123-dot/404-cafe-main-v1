export function formatPrice(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
