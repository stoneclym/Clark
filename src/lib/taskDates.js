export const OVERDUE_COLOR = '#C0392B'

const MONTH_NAME_PATTERN = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i

export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDateOnly(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function parseSlashDate(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!match) return null
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
  return new Date(year, Number(match[1]) - 1, Number(match[2]))
}

function parseMonthNameDate(value) {
  if (!MONTH_NAME_PATTERN.test(value) || !/\d{1,2}/.test(value) || !/\d{4}/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseTaskDateValue(value) {
  if (!value || typeof value !== 'string') return null

  const text = value.trim()
  if (!text) return null

  const relative = text.toLowerCase()
  if (['yesterday', 'today', 'tomorrow'].includes(relative)) {
    const date = startOfLocalDay(new Date())
    if (relative === 'yesterday') date.setDate(date.getDate() - 1)
    if (relative === 'tomorrow') date.setDate(date.getDate() + 1)
    return { date, hasTime: false }
  }

  const dateOnly = parseDateOnly(text)
  if (dateOnly) return { date: dateOnly, hasTime: false }

  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(text)) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : { date, hasTime: true }
  }

  const slashDate = parseSlashDate(text)
  if (slashDate) return { date: slashDate, hasTime: false }

  const monthNameDate = parseMonthNameDate(text)
  if (monthNameDate) return { date: monthNameDate, hasTime: /\d{1,2}:\d{2}/.test(text) }

  return null
}

export function getTaskDateInfo(task) {
  const stored = parseTaskDateValue(task?.due_date_calc) || parseTaskDateValue(task?.due_date)
  if (!stored) return { label: task?.due_date || '', isPast: false, hasRealDate: false, date: null }

  const today = startOfLocalDay(new Date())
  const taskDay = startOfLocalDay(stored.date)
  const dayDiff = Math.round((taskDay - today) / 86_400_000)
  const isPast = stored.hasTime ? stored.date < new Date() : dayDiff < 0

  if (dayDiff === 0) return { label: 'Today', isPast, hasRealDate: true, date: stored.date }
  if (dayDiff === 1) return { label: 'Tomorrow', isPast: false, hasRealDate: true, date: stored.date }

  return {
    label: stored.date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    }),
    isPast,
    hasRealDate: true,
    date: stored.date,
  }
}

export function compareTaskDates(a, b) {
  const aInfo = getTaskDateInfo(a)
  const bInfo = getTaskDateInfo(b)

  if (aInfo.isPast !== bInfo.isPast) return aInfo.isPast ? -1 : 1
  if (aInfo.date && bInfo.date) {
    const dateDiff = aInfo.date - bInfo.date
    if (dateDiff !== 0) return dateDiff
  }
  if (aInfo.hasRealDate !== bInfo.hasRealDate) return aInfo.hasRealDate ? -1 : 1
  return 0
}
