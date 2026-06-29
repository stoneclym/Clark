export const OVERDUE_COLOR = '#C0392B'

const CLARK_TIME_ZONE = 'America/New_York'
const DAY_MS = 86_400_000
const CLARK_DATE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: CLARK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function clarkParts(date) {
  return CLARK_DATE_PARTS.formatToParts(date).reduce((parts, part) => {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
    return parts
  }, {})
}

function clarkOffsetMs(date) {
  const parts = clarkParts(date)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second, 0)
  return asUtc - date.getTime()
}
const MONTH_NAME_PATTERN = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i

export function startOfLocalDay(date) {
  return dateFromClarkParts(clarkYear(date), clarkMonth(date), clarkDay(date))
}

function clarkYear(date) {
  return clarkParts(date).year
}

function clarkMonth(date) {
  return clarkParts(date).month - 1
}

function clarkDay(date) {
  return clarkParts(date).day
}

function clarkDayNumber(date) {
  return Math.floor(Date.UTC(clarkYear(date), clarkMonth(date), clarkDay(date)) / DAY_MS)
}

function dateFromClarkParts(year, monthIndex, day, hours = 0, minutes = 0) {
  const utcGuess = Date.UTC(year, monthIndex, day, hours, minutes, 0, 0)
  const firstPass = new Date(utcGuess - clarkOffsetMs(new Date(utcGuess)))
  return new Date(utcGuess - clarkOffsetMs(firstPass))
}

function parseDateOnly(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:\b|\s)/)
  if (!match) return null
  return dateFromClarkParts(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function hasExplicitTime(value) {
  return /\b(?:at\s*)?\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(String(value || ''))
}

function parseTime(value) {
  const match = value.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  const meridiem = match[3].toLowerCase()

  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null

  return { hours, minutes }
}

function applyTime(date, time) {
  if (time) {
    return {
      date: dateFromClarkParts(clarkYear(date), clarkMonth(date), clarkDay(date), time.hours, time.minutes),
      hasTime: true,
    }
  }
  return { date, hasTime: false }
}

function parseSlashDate(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?:\b|\s)/)
  if (!match) return null
  const year = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : clarkYear(new Date())
  return dateFromClarkParts(year, Number(match[1]) - 1, Number(match[2]))
}

function parseMonthNameDate(value) {
  if (!MONTH_NAME_PATTERN.test(value) || !/\d{1,2}/.test(value) || !/\d{4}/.test(value)) return null
  const dateText = value.replace(/\s+at\s+.*$/i, '')
  const parsed = new Date(dateText)
  if (Number.isNaN(parsed.getTime())) return null
  return dateFromClarkParts(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

export function parseTaskDateValue(value) {
  if (!value || typeof value !== 'string') return null

  const text = value.trim()
  if (!text) return null

  const time = parseTime(text)
  const relative = text.toLowerCase()
  if (['yesterday', 'today', 'tomorrow'].includes(relative.replace(/\s+at\s+.*$/i, ''))) {
    const now = new Date()
    const date = dateFromClarkParts(clarkYear(now), clarkMonth(now), clarkDay(now))
    if (relative.startsWith('yesterday')) date.setUTCDate(date.getUTCDate() - 1)
    if (relative.startsWith('tomorrow')) date.setUTCDate(date.getUTCDate() + 1)
    return applyTime(date, time)
  }

  const dateOnly = parseDateOnly(text)
  if (dateOnly) return applyTime(dateOnly, time)

  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(text)) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : { date, hasTime: true }
  }

  const slashDate = parseSlashDate(text)
  if (slashDate) return applyTime(slashDate, time)

  const monthNameDate = parseMonthNameDate(text)
  if (monthNameDate) return applyTime(monthNameDate, time)

  return null
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    timeZone: CLARK_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getTaskDateInfo(task) {
  const stored = parseTaskDateValue(task?.due_at) || parseTaskDateValue(task?.due_date_calc) || parseTaskDateValue(task?.due_date)
  if (!stored) return { label: task?.due_date || '', isPast: false, hasRealDate: false, date: null }

  if (task?.due_at && !hasExplicitTime(task.original_due_text || task.due_date)) {
    stored.hasTime = false
  }

  const todayDayNumber = clarkDayNumber(new Date())
  const taskDayNumber = clarkDayNumber(stored.date)
  const dayDiff = taskDayNumber - todayDayNumber
  const isPast = stored.hasTime ? stored.date < new Date() : dayDiff < 0

  if (dayDiff === 0) return { label: stored.hasTime ? `Today, ${formatTime(stored.date)}` : 'Today', isPast, hasRealDate: true, date: stored.date }
  if (dayDiff === 1) return { label: stored.hasTime ? `Tomorrow, ${formatTime(stored.date)}` : 'Tomorrow', isPast: false, hasRealDate: true, date: stored.date }

  const dateLabel = stored.date.toLocaleDateString('en-US', {
    timeZone: CLARK_TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  })

  return {
    label: stored.hasTime ? `${dateLabel}, ${formatTime(stored.date)}` : dateLabel,
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
