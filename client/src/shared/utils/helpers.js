export function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

export function toQueryString(params) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (!isEmpty(value)) searchParams.set(key, value)
  })
  return searchParams.toString()
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}
