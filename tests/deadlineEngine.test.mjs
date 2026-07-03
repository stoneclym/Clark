/**
 * Verification for the deterministic deadline engine — one test per PRD rule.
 * Run with: npm test
 *
 * Frame of reference: Tue 2026-08-25 (a B day; TOK, Lang, Bio meet).
 * Wed 8/26 is an A day (HOTA, Math meet); Thu 8/27 is the next B day.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDeadline, parseExplicitDate, inferKind } from '../supabase/functions/_shared/deadlineEngine.js'

const SETTINGS = {
  first_day: '2026-08-24',
  first_day_type: 'A',
  no_school_dates: ['2026-09-07'],
  a_schedule: [
    { name: 'Period 2', start: '9:35 AM', end: '11:05 AM', class_name: 'History of the Americas' },
    { name: 'Period 3', start: '12:15 PM', end: '1:45 PM', class_name: 'IB Applications and Interpretations' },
    { name: 'Period 4', start: '1:50 PM', end: '3:15 PM', class_name: 'Cape Fear Class' },
  ],
  b_schedule: [
    { name: 'Period 1', start: '8:00 AM', end: '9:30 AM', class_name: 'TOK' },
    { name: 'Period 2', start: '9:35 AM', end: '11:05 AM', class_name: 'IB Lang and Lit' },
    { name: 'Period 3', start: '12:15 PM', end: '1:45 PM', class_name: 'IB Bio' },
    { name: 'Period 4', start: '1:50 PM', end: '3:15 PM', class_name: 'Cape Fear Class' },
  ],
  cape_fear_classes: ['Cape Fear Class'],
}

// "now" = Tuesday 2026-08-25 at 10:00 AM Eastern (EDT, UTC-4)
const NOW = new Date('2026-08-25T10:00:00-04:00')

const eastern = (iso, h, m) => new Date(`${iso}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-04:00`).toISOString()

test('rule: homework "due next class" → 11:59 PM the night before that class', () => {
  // Bio meets on B days; next B day after Tue 8/25 is Thu 8/27 → due Wed 8/26 11:59 PM
  const bio = computeDeadline({ kind: 'assignment', dueText: 'next class', className: 'Bio' }, SETTINGS, NOW)
  assert.equal(bio.due_date_calc, '2026-08-26')
  assert.equal(bio.due_at, eastern('2026-08-26', 23, 59))
  assert.equal(bio.original_due_text, 'next class')

  // HOTA meets on A days; next A day is Wed 8/26 → due Tue 8/25 (tonight) 11:59 PM
  const hota = computeDeadline({ kind: 'assignment', dueText: 'due before class', className: 'HOTA' }, SETTINGS, NOW)
  assert.equal(hota.due_date_calc, '2026-08-25')
  assert.equal(hota.due_at, eastern('2026-08-25', 23, 59))

  // Cape Fear meets every school day → next session Wed → due tonight
  const cf = computeDeadline({ kind: 'assignment', dueText: 'due next class', className: 'Cape Fear Class' }, SETTINGS, NOW)
  assert.equal(cf.due_date_calc, '2026-08-25')

  // Unknown class → falls back to the next school day (Wed) → due tonight
  const unknown = computeDeadline({ kind: 'assignment', dueText: 'next class' }, SETTINGS, NOW)
  assert.equal(unknown.due_date_calc, '2026-08-25')
})

test('rule: "due next class" skips weekends and holidays', () => {
  // Friday 2026-09-04 (B day) after school; Mon 9/7 is Labor Day.
  // Bio's next class is Thu... next B day after Fri 9/4: Tue 9/8 is A, Wed 9/9 is B → due Tue 9/8 night
  const friday = new Date('2026-09-04T16:00:00-04:00')
  const bio = computeDeadline({ kind: 'assignment', dueText: 'next class', className: 'Bio' }, SETTINGS, friday)
  assert.equal(bio.due_date_calc, '2026-09-08')
  assert.equal(bio.due_at, eastern('2026-09-08', 23, 59))
})

test('rule: "due today" / "end of day" → 11:59 PM tonight', () => {
  for (const dueText of ['today', 'due today', 'end of day', 'tonight', 'eod']) {
    const r = computeDeadline({ kind: 'assignment', dueText }, SETTINGS, NOW)
    assert.equal(r.due_date_calc, '2026-08-25', `"${dueText}" should resolve to today`)
    assert.equal(r.due_at, eastern('2026-08-25', 23, 59))
  }
})

test('rule: tests and quizzes land on the actual day, not the night before', () => {
  // "quiz next class" in Bio → the day Bio meets (Thu 8/27), NOT Wed night
  const quiz = computeDeadline({ kind: 'test', dueText: 'next class', className: 'Bio' }, SETTINGS, NOW)
  assert.equal(quiz.due_date_calc, '2026-08-27')

  // "test Friday" → that Friday itself
  const friday = computeDeadline({ kind: 'test', dueText: 'Friday' }, SETTINGS, NOW)
  assert.equal(friday.due_date_calc, '2026-08-28')
})

test('rule: events and meetings use the actual day and time', () => {
  const mtg = computeDeadline({ kind: 'event', dueText: 'tomorrow at 3:30 pm' }, SETTINGS, NOW)
  assert.equal(mtg.due_date_calc, '2026-08-26')
  assert.equal(mtg.due_at, eastern('2026-08-26', 15, 30))

  const fri = computeDeadline({ kind: 'event', dueText: 'Friday after school at 4 pm' }, SETTINGS, NOW)
  assert.equal(fri.due_date_calc, '2026-08-28')
  assert.equal(fri.due_at, eastern('2026-08-28', 16, 0))
})

test('rule: an explicit user date/time always overrides the defaults', () => {
  // Assignment with explicit time on an explicit date — no 11:59 default
  const r = computeDeadline({ kind: 'assignment', dueText: 'Friday at 4 PM' }, SETTINGS, NOW)
  assert.equal(r.due_date_calc, '2026-08-28')
  assert.equal(r.due_at, eastern('2026-08-28', 16, 0))

  // Explicit calendar dates
  assert.equal(computeDeadline({ dueText: '9/14' }, SETTINGS, NOW).due_date_calc, '2026-09-14')
  assert.equal(computeDeadline({ dueText: '2026-10-02' }, SETTINGS, NOW).due_date_calc, '2026-10-02')
  assert.equal(computeDeadline({ dueText: 'September 14' }, SETTINGS, NOW).due_date_calc, '2026-09-14')

  // A bare time means today at that time
  const bare = computeDeadline({ kind: 'assignment', dueText: 'at 5 pm' }, SETTINGS, NOW)
  assert.equal(bare.due_at, eastern('2026-08-25', 17, 0))
})

test('canonical date columns store the Clark-local date (no UTC rollover)', () => {
  // 11:59 PM Eastern is 3:59 AM next-day UTC; the date columns must NOT roll over.
  const r = computeDeadline({ kind: 'assignment', dueText: 'today' }, SETTINGS, NOW)
  assert.equal(r.due_at, eastern('2026-08-25', 23, 59)) // 2026-08-26T03:59Z
  assert.equal(r.due_date, '2026-08-25')
  assert.equal(r.due_date_calc, '2026-08-25')
})

test('unresolvable text falls back to legacy display-string behavior', () => {
  const r = computeDeadline({ kind: 'assignment', dueText: 'whenever I get around to it' }, SETTINGS, NOW)
  assert.equal(r.due_date, 'whenever I get around to it')
  assert.equal(r.due_at, null)
  assert.equal(r.due_date_calc, null)

  const empty = computeDeadline({ kind: 'assignment', dueText: '' }, SETTINGS, NOW)
  assert.equal(empty.due_date, null)
  assert.equal(empty.original_due_text, null)
})

test('helpers: weekday resolution and kind inference', () => {
  // Said on a Tuesday, "Tuesday" means NEXT Tuesday
  assert.equal(parseExplicitDate('Tuesday', NOW), '2026-09-01')
  assert.equal(parseExplicitDate('tomorrow', NOW), '2026-08-26')

  assert.equal(inferKind('Bio quiz on cells', 'next class'), 'test')
  assert.equal(inferKind('NHS meeting', 'tomorrow at 3:30'), 'event')
  assert.equal(inferKind('HOTA essay outline', 'next class'), 'assignment')
})
