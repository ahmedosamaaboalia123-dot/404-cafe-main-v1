import { format } from 'date-fns'

export function formatDate(date, dateFormat = 'yyyy-MM-dd') {
  if (!date) return ''
  return format(new Date(date), dateFormat)
}
