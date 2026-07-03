/**
 * Calendar month logic — pure functions, no React, no queries.
 *
 * buildMonthData() makes one pass over the already-fetched tasks, clubs, and
 * settings and returns a per-day map for the visible month, so the grid and
 * the day-detail sheet both do O(1) lookups. Dates come from the deadline
 * engine's stored values (due_date_calc / due_at) — never recomputed here —
 * with the legacy display-string parser as fallback for old rows.
 */

import { todayISO, addDays, weekdayOf } from '../../supabase/functions/_shared/scheduleContext.js'
import { computeDeadline, inferKind } from '../../supabase/functions/_shared/deadlineEngine.js'
import { getTaskDateInfo } from './taskDates.js'

export const DOT_COLORS = {
  due: '#568db3',
  noSchool: '#9a56b3',
  overdue: '#b35656',
  meeting: '#64b356',
}

const CLARK_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Deadline-logic date of a task as Clark-local "YYYY-MM-DD", or null. */
export function taskDateISO(task) {
  if (task?.due_date_calc) return String(task.due_date_calc).slice(0, 10)
  if (task?.due_at) return CLARK_ISO.format(new Date(task.due_at))
  const legacy = getTaskDateInfo(task)
  return legacy.hasRealDate && legacy.date ? CLARK_ISO.format(legacy.date) : null
}

export function taskKind(task) {
  if (['assignment', 'test', 'event'].includes(task?.kind)) return task.kind
  return inferKind(task?.title || '', task?.original_due_text || task?.due_date || '')
}

/**
 * Resolve each club's current next_meeting text to a calendar date via the
 * deadline engine (kind 'event' → actual day, explicit time preserved).
 * The club-card model stores no absolute date, so this is relative to now —
 * only the upcoming occurrence of each club's active meeting is placeable.
 */
export function resolveClubMeetings(clubs, settings, now = new Date()) {
  return (clubs || [])
    .filter(c => c.next_meeting)
    .map(club => {
      const deadline = computeDeadline({ kind: 'event', dueText: club.next_meeting }, settings, now)
      return deadline.due_date_calc
        ? { clubId: club.id, clubName: club.name, when: club.next_meeting, date: deadline.due_date_calc, dueAt: deadline.due_at }
        : null
    })
    .filter(Boolean)
}

// Same priority ordering as the Tasks card applies within a single date.
function priorityRank(task) {
  return Number.isFinite(Number(task.priority_rank)) ? Number(task.priority_rank) : Number.MAX_SAFE_INTEGER
}

export function comparePriority(a, b) {
  if (a.priority !== b.priority) return a.priority ? -1 : 1
  const rankDiff = priorityRank(a) - priorityRank(b)
  if (rankDiff !== 0) return rankDiff
  return new Date(a.created_at || 0) - new Date(b.created_at || 0)
}

/** Month grid cells: leading nulls to align weekday, then 1..daysInMonth. */
export function monthGrid(year, monthIndex) {
  const firstISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const cells = []
  for (let i = 0; i < weekdayOf(firstISO); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/**
 * One pass over tasks + clubs + no-school dates for a visible month.
 *
 * @returns Map<"YYYY-MM-DD", {
 *   dots: { due, overdue, noSchool, meeting },   // independent booleans
 *   meetings: [...], tests: [...], others: [...] // day-sheet blocks, in order
 * }>
 */
export function buildMonthData({ year, monthIndex, tasks, clubs, settings, now = new Date() }) {
  const today = todayISO(now)
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
  const days = new Map()

  const dayEntry = (iso) => {
    if (!days.has(iso)) {
      days.set(iso, {
        dots: { due: false, overdue: false, noSchool: false, meeting: false },
        meetings: [],
        tests: [],
        others: [],
      })
    }
    return days.get(iso)
  }

  // No-school days (purple) — settings drive these for any month.
  for (const iso of settings?.no_school_dates || []) {
    if (iso.startsWith(prefix)) dayEntry(iso).dots.noSchool = true
  }

  // Open tasks on their deadline-logic date. Overdue is derived from the
  // stored date being before today, so the red dot is permanent record —
  // nothing ever clears it while the item stays open.
  for (const task of tasks || []) {
    if (task.done) continue
    const iso = taskDateISO(task)
    if (!iso || !iso.startsWith(prefix)) continue

    const entry = dayEntry(iso)
    const overdue = iso < today
    if (overdue) entry.dots.overdue = true
    else entry.dots.due = true

    if (taskKind(task) === 'test') entry.tests.push(task)
    else entry.others.push(task)
  }

  // Club meetings (green) from the club-card data model.
  for (const meeting of resolveClubMeetings(clubs, settings, now)) {
    if (!meeting.date.startsWith(prefix)) continue
    const entry = dayEntry(meeting.date)
    entry.dots.meeting = true
    entry.meetings.push(meeting)
  }

  // Day-sheet ordering: meetings first, then tests, then the rest by the
  // Tasks-card priority logic. Meetings/tests keep priority order internally.
  for (const entry of days.values()) {
    entry.tests.sort(comparePriority)
    entry.others.sort(comparePriority)
  }

  return days
}

/** Dots for a day in fixed display order — all shown, never merged. */
export function dayDots(entry) {
  if (!entry) return []
  const { dots } = entry
  const list = []
  if (dots.due) list.push(DOT_COLORS.due)
  if (dots.noSchool) list.push(DOT_COLORS.noSchool)
  if (dots.overdue) list.push(DOT_COLORS.overdue)
  if (dots.meeting) list.push(DOT_COLORS.meeting)
  return list
}

export { todayISO, addDays }
