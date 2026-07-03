/**
 * Shared schedule context — the single source of truth for Clark's schedule state.
 *
 * Pure JavaScript, no dependencies, no AI. Imported by both the Vite frontend
 * (via src/lib/schedule.js) and the Deno edge functions.
 *
 * All date math is done on ISO "YYYY-MM-DD" strings anchored to Clark's
 * timezone (America/New_York), never on host-local Date fields, so results
 * are identical in the browser and in UTC edge runtimes.
 *
 * Rules encoded here:
 *  - A/B days alternate on school days only.
 *  - Weekends and no-school dates are skipped; the pattern never resets.
 *  - Dates before the first day of school have no day type.
 *  - Cape Fear classes meet every school day regardless of A/B day.
 */

export const CLARK_TIME_ZONE = 'America/New_York'

const DAY_MS = 86_400_000

const ISO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLARK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: CLARK_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Date primitives (ISO string based) ─────────────────────────

/** Current date in Clark's timezone as "YYYY-MM-DD". */
export function todayISO(now = new Date()) {
  return ISO_DATE.format(now)
}

function toISO(value, now = new Date()) {
  if (value instanceof Date) return todayISO(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return todayISO(now)
}

function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS)
}

function isoFromDayNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(iso, days) {
  return isoFromDayNumber(dayNumber(iso) + days)
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isWeekend(iso) {
  const dow = weekdayOf(iso)
  return dow === 0 || dow === 6
}

/** Minutes since midnight in Clark's timezone for a given instant. */
export function clarkMinutes(now = new Date()) {
  const parts = CLOCK.formatToParts(now)
  const get = (type) => Number(parts.find(p => p.type === type)?.value ?? 0)
  return (get('hour') % 24) * 60 + get('minute')
}

// ─── School-day / A-B day logic ─────────────────────────────────

/** True if the date is a weekday and not a no-school date. */
export function isSchoolDay(iso, noSchoolDates = []) {
  return !isWeekend(iso) && !noSchoolDates.includes(iso)
}

/**
 * Day type for a target date.
 *
 * @param {string} firstDay      ISO first day of school
 * @param {'A'|'B'} firstDayType Day type of that first day
 * @param {string[]} noSchoolDates
 * @param {string|Date} [target] Defaults to today in Clark's timezone
 * @returns {'A'|'B'|null} null on weekends, no-school days, or before school starts
 */
export function getDayType(firstDay, firstDayType, noSchoolDates = [], target) {
  if (!firstDay || (firstDayType !== 'A' && firstDayType !== 'B')) return null

  const targetISO = toISO(target)
  if (targetISO < firstDay) return null
  if (!isSchoolDay(targetISO, noSchoolDates)) return null

  const noSchool = new Set(noSchoolDates)
  const start = dayNumber(firstDay)
  const end = dayNumber(targetISO)

  let schoolDays = 0
  for (let n = start; n <= end; n++) {
    const iso = isoFromDayNumber(n)
    const dow = weekdayOf(iso)
    if (dow !== 0 && dow !== 6 && !noSchool.has(iso)) schoolDays++
  }
  if (schoolDays === 0) return null

  // First school day is school day 1; odd school days match the first day's type.
  const matchesFirst = schoolDays % 2 === 1
  if (firstDayType === 'A') return matchesFirst ? 'A' : 'B'
  return matchesFirst ? 'B' : 'A'
}

/**
 * Next school day on or after `fromISO` (exclusive by default).
 * Returns null if none found within a year.
 */
export function nextSchoolDay(fromISO, noSchoolDates = [], { inclusive = false } = {}) {
  let iso = inclusive ? fromISO : addDays(fromISO, 1)
  for (let i = 0; i <= 366; i++) {
    if (isSchoolDay(iso, noSchoolDates)) return iso
    iso = addDays(iso, 1)
  }
  return null
}

// ─── Period / class schedule logic ──────────────────────────────

function timeToMinutes(t) {
  if (!t) return null
  const amPm = String(t).match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (amPm) {
    let h = parseInt(amPm[1], 10)
    const m = parseInt(amPm[2], 10)
    if (amPm[3].toUpperCase() === 'PM' && h !== 12) h += 12
    if (amPm[3].toUpperCase() === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  const [h, m] = String(t).split(':').map(Number)
  return Number.isNaN(h) ? null : h * 60 + (m || 0)
}

function periodStart(p) {
  return p.start_time ?? p.start ?? null
}

function periodEnd(p) {
  return p.end_time ?? p.end ?? null
}

/**
 * Periods for a date, chosen by that date's A/B type.
 * @returns {{ dayType: 'A'|'B'|null, periods: Array }}
 */
export function getScheduleForDate(settings, target) {
  const iso = toISO(target)
  const dayType = getDayType(settings?.first_day, settings?.first_day_type, settings?.no_school_dates || [], iso)
  if (!dayType) return { dayType: null, periods: [] }
  const periods = (dayType === 'A' ? settings.a_schedule : settings.b_schedule) || []
  return { dayType, periods }
}

/**
 * Which period is happening now, or the next one later today.
 * Time-of-day is evaluated in Clark's timezone regardless of host timezone.
 * Supports "H:MM AM/PM" and "HH:MM", and start/end or start_time/end_time keys.
 */
export function getCurrentPeriod(schedule, now = new Date()) {
  const nowMins = clarkMinutes(now)

  for (let i = 0; i < (schedule?.length || 0); i++) {
    const p = schedule[i]
    const label = p.name || (p.period != null ? `Period ${p.period}` : 'Class')
    const className = p.class_name || ''
    const startMins = timeToMinutes(periodStart(p))
    const endMins = timeToMinutes(periodEnd(p))
    if (startMins == null || endMins == null) continue

    if (nowMins >= startMins && nowMins < endMins) {
      const next = schedule[i + 1]
      return {
        status: 'now',
        period: label,
        className,
        remaining: `${endMins - nowMins} min`,
        nextClass: next ? (next.class_name || '') : null,
      }
    }

    if (nowMins < startMins) {
      return {
        status: 'next',
        period: label,
        className,
        remaining: `in ${startMins - nowMins} min`,
        nextClass: null,
      }
    }
  }

  return null
}

/**
 * The current or next class, looking past today if the school day is over.
 * Returns { date, dayType, status, period, className, ... } or null.
 * status: 'now' | 'next' (later today) | 'upcoming' (a future school day)
 */
export function getNextClass(settings, now = new Date()) {
  const today = todayISO(now)
  const todaySchedule = getScheduleForDate(settings, today)
  if (todaySchedule.dayType) {
    const current = getCurrentPeriod(todaySchedule.periods, now)
    if (current) return { date: today, dayType: todaySchedule.dayType, ...current }
  }

  let iso = addDays(today, 1)
  for (let i = 0; i <= 366; i++) {
    const { dayType, periods } = getScheduleForDate(settings, iso)
    if (dayType && periods.length) {
      const first = periods[0]
      return {
        date: iso,
        dayType,
        status: 'upcoming',
        period: first.name || 'Period 1',
        className: first.class_name || '',
        start: periodStart(first),
        remaining: null,
        nextClass: null,
      }
    }
    iso = addDays(iso, 1)
  }
  return null
}

/**
 * Next school day (today included if the class hasn't ended yet) on which the
 * named class meets, e.g. for "due next class". Matching is case-insensitive
 * and tolerant of partial names. Cape Fear classes appear in both A and B
 * schedules, so "every day" falls out naturally.
 * @returns {{ date: string, dayType: 'A'|'B', period: object } | null}
 */
export function nextOccurrenceOfClass(settings, className, now = new Date()) {
  const wanted = String(className || '').trim().toLowerCase()
  if (!wanted) return null

  const matches = (p) => {
    const name = String(p.class_name || '').toLowerCase()
    return name.includes(wanted) || wanted.includes(name)
  }

  const today = todayISO(now)
  const nowMins = clarkMinutes(now)

  let iso = today
  for (let i = 0; i <= 366; i++) {
    const { dayType, periods } = getScheduleForDate(settings, iso)
    if (dayType) {
      const period = periods.find(p => {
        if (!matches(p)) return false
        if (iso !== today) return true
        const endMins = timeToMinutes(periodEnd(p))
        return endMins == null || nowMins < endMins
      })
      if (period) return { date: iso, dayType, period }
    }
    iso = addDays(iso, 1)
  }
  return null
}

/**
 * Monday–Friday schedule for the week containing `target`.
 * @returns Array of { date, weekday, dayType, isSchoolDay, periods }
 */
export function getWeekSchedule(settings, target) {
  const iso = toISO(target)
  const monday = addDays(iso, -((weekdayOf(iso) + 6) % 7))
  const noSchool = settings?.no_school_dates || []

  return [0, 1, 2, 3, 4].map(offset => {
    const date = addDays(monday, offset)
    const { dayType, periods } = getScheduleForDate(settings, date)
    return {
      date,
      weekday: WEEKDAY_NAMES[weekdayOf(date)],
      dayType,
      isSchoolDay: isSchoolDay(date, noSchool),
      periods,
    }
  })
}

// ─── Full context ────────────────────────────────────────────────

/**
 * Everything Clark needs to know about the schedule in one object.
 * Built from the settings row; safe to call with null settings.
 */
export function buildScheduleContext(settings, now = new Date()) {
  const today = todayISO(now)
  const noSchoolDates = settings?.no_school_dates || []
  const { dayType, periods } = settings ? getScheduleForDate(settings, today) : { dayType: null, periods: [] }

  return {
    today,
    weekday: WEEKDAY_NAMES[weekdayOf(today)],
    dayType,
    isSchoolDay: isSchoolDay(today, noSchoolDates),
    currentPeriod: dayType ? getCurrentPeriod(periods, now) : null,
    nextClass: settings ? getNextClass(settings, now) : null,
    week: settings ? getWeekSchedule(settings, today) : [],
    noSchoolDates,
    capeFearClasses: settings?.cape_fear_classes || [],
  }
}

/**
 * Compact human-readable rendering of the context, for AI prompts.
 * The AI only reads this — all values were computed deterministically above.
 */
export function describeScheduleContext(ctx) {
  if (!ctx) return ''
  const lines = []

  lines.push(
    ctx.dayType
      ? `Today (${ctx.weekday} ${ctx.today}) is a ${ctx.dayType} day.`
      : `Today (${ctx.weekday} ${ctx.today}) is not a school day.`,
  )

  if (ctx.currentPeriod) {
    const p = ctx.currentPeriod
    lines.push(
      p.status === 'now'
        ? `Current class: ${p.className || p.period} (${p.remaining} left).`
        : `Next class today: ${p.className || p.period} (${p.remaining}).`,
    )
  } else if (ctx.nextClass) {
    const n = ctx.nextClass
    lines.push(`Next school day: ${n.date} (${n.dayType} day), first class ${n.className || n.period}${n.start ? ` at ${n.start}` : ''}.`)
  }

  const weekLine = ctx.week
    .map(d => `${d.weekday.slice(0, 3)} ${d.date}: ${d.dayType ? `${d.dayType} day` : 'no school'}`)
    .join('; ')
  if (weekLine) lines.push(`This week: ${weekLine}.`)

  if (ctx.capeFearClasses?.length) {
    lines.push(`Cape Fear classes (meet every school day): ${ctx.capeFearClasses.join(', ')}.`)
  }

  return lines.join('\n')
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    timeZone: CLARK_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
