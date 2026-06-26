/**
 * Pure-JS A/B day calculator.
 * Given a first school day, its type (A or B), and a list of no-school dates,
 * returns the day type for any target date — holidays are simply skipped,
 * the pattern never resets.
 */

/**
 * @param {string} firstDay    ISO date of first day of school (e.g. "2025-08-25")
 * @param {'A'|'B'} firstType  Whether that day is an A or B day
 * @param {string[]} noSchool  Array of ISO dates that are no-school days
 * @param {string} target      ISO date to query (default: today)
 * @returns {'A'|'B'|null}     Day type, or null if target is a no-school day
 */
export function getDayType(firstDay, firstType, noSchool, target) {
  const noSchoolSet = new Set(noSchool)
  const start = new Date(firstDay)
  const end = new Date(target || new Date().toISOString().split('T')[0])

  if (noSchoolSet.has(end.toISOString().split('T')[0])) return null

  let schoolDays = 0
  const cur = new Date(start)
  while (cur <= end) {
    const iso = cur.toISOString().split('T')[0]
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6 && !noSchoolSet.has(iso)) {
      schoolDays++
    }
    cur.setDate(cur.getDate() + 1)
  }

  // First school day is day 1. A/B alternates from there.
  const isA = firstType === 'A' ? schoolDays % 2 === 1 : schoolDays % 2 === 0
  return isA ? 'A' : 'B'
}

/**
 * Returns which period is current or next, plus time remaining.
 * @param {Array<{period: number, class_name: string, start_time: string, end_time: string}>} schedule
 * @param {Date} now
 * @returns {{ status: 'now'|'next', period: number, className: string, remaining: string, nextClass: string|null }}
 */
export function getCurrentPeriod(schedule, now = new Date()) {
  const timeToMinutes = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const nowMins = now.getHours() * 60 + now.getMinutes()

  for (let i = 0; i < schedule.length; i++) {
    const { period, class_name, start_time, end_time } = schedule[i]
    const start = timeToMinutes(start_time)
    const end = timeToMinutes(end_time)

    if (nowMins >= start && nowMins < end) {
      const remaining = end - nowMins
      const next = schedule[i + 1]
      return {
        status: 'now',
        period,
        className: class_name,
        remaining: `${remaining} min`,
        nextClass: next ? next.class_name : null,
      }
    }

    if (nowMins < start) {
      const minsUntil = start - nowMins
      return {
        status: 'next',
        period,
        className: class_name,
        remaining: `in ${minsUntil} min`,
        nextClass: null,
      }
    }
  }

  return null
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
