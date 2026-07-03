/**
 * Deterministic deadline engine.
 *
 * AI (Haiku/Sonnet) extracts scheduling INTENT: what kind of item it is
 * (assignment / test / event), the user's own due words verbatim, and which
 * class it belongs to. This module — pure JavaScript, no AI — turns that
 * intent into the canonical stored date/time, using the shared schedule
 * context for A/B-day awareness.
 *
 * Rules (from the PRD):
 *  - "due before class" / "due next class"  → 11:59 PM the night before that class
 *  - "due today" / "due end of day"         → 11:59 PM tonight
 *  - tests and quizzes                      → the actual day of the test
 *  - events and meetings                    → the actual day and time
 *  - an explicit user-specified date/time always overrides the defaults
 */

import {
  CLARK_TIME_ZONE,
  todayISO,
  addDays,
  nextSchoolDay,
  nextOccurrenceOfClass,
} from './scheduleContext.js'

// ─── Clark-timezone instant construction ─────────────────────────

const OFFSET_PROBE = new Intl.DateTimeFormat('en-US', {
  timeZone: CLARK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function clarkOffsetMs(date) {
  const parts = OFFSET_PROBE.formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = Number(p.value)
    return acc
  }, {})
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second, 0)
  return asUtc - date.getTime()
}

/** Date instant for a wall-clock time in Clark's timezone (DST-safe two-pass). */
export function clarkDateTime(iso, hours = 0, minutes = 0) {
  const [y, m, d] = iso.split('-').map(Number)
  const utcGuess = Date.UTC(y, m - 1, d, hours, minutes, 0, 0)
  const firstPass = new Date(utcGuess - clarkOffsetMs(new Date(utcGuess)))
  return new Date(utcGuess - clarkOffsetMs(firstPass))
}

// ─── Text-pattern extraction (deterministic, no AI) ──────────────

export const TIME_PATTERN = /\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i

const WEEKDAYS = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

const MONTH_NAME_PATTERN = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i

const NEXT_CLASS_PATTERN = /\b(?:(?:due|by|for)\s+)?(?:before\s+(?:the\s+)?(?:next\s+)?class|(?:the\s+)?next\s+class|before\s+class)\b/i

const TODAY_PATTERN = /\b(?:today|tonight|end of (?:the )?day|eod)\b/i

/** Extract an explicit "3:30 PM"-style time. Returns {hours, minutes} or null. */
export function parseTimeOfDay(text) {
  const match = String(text || '').match(TIME_PATTERN)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2] || 0)
  const meridiem = match[3].toLowerCase()
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

export function hasExplicitTime(text) {
  return TIME_PATTERN.test(String(text || ''))
}

/**
 * Resolve an explicit calendar date mentioned in the text, if any.
 * Handles: today/tonight/tomorrow/yesterday, weekday names ("Friday",
 * "next Friday", "Thursday at 3:30"), ISO dates, M/D(/YY) dates, and
 * month-name dates. Returns "YYYY-MM-DD" or null.
 */
export function parseExplicitDate(text, now = new Date()) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const today = todayISO(now)
  const lower = raw.toLowerCase().replace(/^(?:due|by|on)\s+/, '')
  const withoutTime = lower.replace(/\s+at\s+.*$/, '').replace(TIME_PATTERN, '').trim()

  if (withoutTime === 'yesterday') return addDays(today, -1)
  if (withoutTime === 'tomorrow') return addDays(today, 1)
  if (['today', 'tonight', 'end of day', 'end of the day', 'eod'].includes(withoutTime)) return today

  const isoMatch = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const slashMatch = raw.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/)
  if (slashMatch) {
    const year = slashMatch[3]
      ? Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
      : Number(today.slice(0, 4))
    const mm = String(slashMatch[1]).padStart(2, '0')
    const dd = String(slashMatch[2]).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  if (MONTH_NAME_PATTERN.test(raw) && /\d{1,2}/.test(raw)) {
    const dateText = raw.replace(/\s+at\s+.*$/i, '')
    const withYear = /\d{4}/.test(dateText) ? dateText : `${dateText} ${today.slice(0, 4)}`
    const parsed = new Date(withYear)
    if (!Number.isNaN(parsed.getTime())) {
      const iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
      // A month-name date without a year that already passed means next year
      return !/\d{4}/.test(dateText) && iso < today ? addDays(iso, 365) : iso
    }
  }

  const weekdayMatch = withoutTime.match(/^(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (weekdayMatch) {
    const target = WEEKDAYS[weekdayMatch[1]]
    let diff = (target - dowOf(today)) % 7
    if (diff <= 0) diff += 7 // "Friday" said on a Friday means next week's
    return addDays(today, diff)
  }

  return null
}

function dowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Deterministic fallback when the AI didn't classify the item. */
export function inferKind(title = '', dueText = '') {
  const text = `${title} ${dueText}`.toLowerCase()
  if (/\b(test|quiz|exam|midterm|final)\b/.test(text)) return 'test'
  if (/\b(meeting|meets|event|rehearsal|game|ceremony|banquet|dance|assembly)\b/.test(text)) return 'event'
  return 'assignment'
}

// Task tags → search terms that match class_name entries in the A/B schedules.
const TAG_SCHEDULE_SEARCH = {
  hota: 'History of the Americas',
  bio: 'Bio',
  lang: 'Lang',
  math: 'Applications and Interpretations',
  tok: 'TOK',
}

export function scheduleSearchTermForClass(classNameOrTag) {
  const key = String(classNameOrTag || '').trim().toLowerCase()
  if (!key) return null
  return TAG_SCHEDULE_SEARCH[key] || classNameOrTag
}

// ─── The engine ──────────────────────────────────────────────────

const END_OF_DAY = { hours: 23, minutes: 59 }

/**
 * Compute the canonical deadline for an extracted item.
 *
 * @param {object} intent
 * @param {'assignment'|'test'|'event'} [intent.kind]  What the item is (AI-extracted; inferred if missing)
 * @param {string} [intent.dueText]     The user's scheduling words, verbatim ("next class", "Friday at 4 PM")
 * @param {string} [intent.className]   Class the item belongs to (tag or full name), for next-class resolution
 * @param {string} [intent.title]       Used only for kind inference fallback
 * @param {object|null} settings        The settings row (schedules, no-school dates)
 * @param {Date} [now]
 * @returns {{ due_date: string|null, due_date_calc: string|null, due_at: string|null, original_due_text: string|null }}
 *          Same column payload shape the edge functions already insert.
 */
export function computeDeadline(intent, settings, now = new Date()) {
  const originalDueText = String(intent?.dueText || '').trim()
  const kind = intent?.kind === 'test' || intent?.kind === 'event'
    ? intent.kind
    : intent?.kind === 'assignment' ? 'assignment' : inferKind(intent?.title, originalDueText)

  if (!originalDueText) {
    return { due_date: null, due_date_calc: null, due_at: null, original_due_text: null }
  }

  const today = todayISO(now)
  const explicitTime = parseTimeOfDay(originalDueText)
  const noSchool = settings?.no_school_dates || []

  let dateISO = null

  // 1. An explicit date always wins over rule-based resolution.
  dateISO = parseExplicitDate(originalDueText, now)

  // 2. "next class" / "before class": find the class's next session strictly
  //    after today, then (for produced work) shift to the night before.
  if (!dateISO && NEXT_CLASS_PATTERN.test(originalDueText)) {
    const startOfTomorrow = clarkDateTime(addDays(today, 1), 0, 0)
    const term = scheduleSearchTermForClass(intent?.className)
    const occurrence = term && settings
      ? nextOccurrenceOfClass(settings, term, startOfTomorrow)
      : null
    const classDate = occurrence?.date || (settings ? nextSchoolDay(today, noSchool) : null)

    if (classDate) {
      if (kind === 'assignment') {
        // Due 11:59 PM the night before that class.
        const nightBefore = addDays(classDate, -1)
        return finalize(nightBefore, END_OF_DAY, originalDueText)
      }
      // A test/quiz "next class" happens the day of that class.
      dateISO = classDate
    }
  }

  // 3. "due today" / "end of day" / "tonight" → tonight.
  if (!dateISO && TODAY_PATTERN.test(originalDueText)) {
    dateISO = today
  }

  // 4. A bare time ("at 4 PM") means today at that time.
  if (!dateISO && explicitTime && /^(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)$/i.test(originalDueText)) {
    dateISO = today
  }

  if (!dateISO) {
    // Could not resolve deterministically — legacy passthrough: keep the
    // display string, store no canonical value rather than a guessed one.
    return { due_date: originalDueText, due_date_calc: null, due_at: null, original_due_text: originalDueText }
  }

  // Explicit user time overrides everything; otherwise items default to
  // end-of-day on their resolved date (tests/events on the actual day,
  // assignments on the date the user named — "due Friday" means Friday night).
  return finalize(dateISO, explicitTime || END_OF_DAY, originalDueText)
}

function finalize(dateISO, time, originalDueText) {
  const dueAt = clarkDateTime(dateISO, time.hours, time.minutes)
  // The date columns store the Clark-local date. (Using toISOString()'s date
  // here would roll 11:59 PM Eastern into the next UTC day.)
  return {
    due_date: dateISO,
    due_date_calc: dateISO,
    due_at: dueAt.toISOString(),
    original_due_text: originalDueText,
  }
}
