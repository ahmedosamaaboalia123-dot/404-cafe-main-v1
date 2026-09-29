export const validators = {
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  isPhone(value) {
    return /^[0-9]{10,15}$/.test(value)
  },
  isRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== ''
  },
}
