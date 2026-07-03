/**
 * Verification for the calendar month logic — required scenarios:
 * a no-school day, an overdue item, a meeting + test on the same day,
 * and a day with 3+ dot types stacked. Run with: npm test
 *
 * Frame of reference: "now" = Friday 2026-07-03 (matches live data shape).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMonthData,
  monthGrid,
  dayDots,
  taskDateISO,
  taskKind,
  resolveClubMeetings,
  DOT_COLORS,
} from '../src/lib/calendar.js'

const NOW = new Date('2026-07-03T10:00:00-04:00')

const SETTINGS = {
  first_day: '2026-08-24',
  first_day_type: 'A',
  no_school_dates: ['2026-06-29', '2026-07-06', '2026-09-07'],
  a_schedule: [],
  b_schedule: [],
  cape_fear_classes: [],
}

const task = (over) => ({
  id: over.id || over.title,
  title: 'Task',
  kind: null,
  due_date: null,
  due_date_calc: null,
  due_at: null,
  priority: false,
  priority_rank: null,
  done: false,
  created_at: '2026-07-01T12:00:00Z',
  ...over,
})

test('purple dot on a no-school day', () => {
  const days = buildMonthData({ year: 2026, monthIndex: 6, tasks: [], clubs: [], settings: SETTINGS, now: NOW })
  const entry = days.get('2026-07-06')
  assert.equal(entry.dots.noSchool, true)
  assert.deepEqual(dayDots(entry), [DOT_COLORS.noSchool])
})

test('overdue item shows red on its original date — including in a fully past month', () => {
  const tasks = [task({ title: 'Old essay', due_date_calc: '2026-06-30' })]
  const june = buildMonthData({ year: 2026, monthIndex: 5, tasks, clubs: [], settings: SETTINGS, now: NOW })
  const entry = june.get('2026-06-30')
  assert.equal(entry.dots.overdue, true)
  assert.equal(entry.dots.due, false) // overdue is red, not blue
  assert.deepEqual(dayDots(entry), [DOT_COLORS.overdue])

  // Rebuilding weeks later (now far in the future) still shows the record
  const muchLater = new Date('2026-11-20T10:00:00-05:00')
  const stillThere = buildMonthData({ year: 2026, monthIndex: 5, tasks, clubs: [], settings: SETTINGS, now: muchLater })
  assert.equal(stillThere.get('2026-06-30').dots.overdue, true)
})

test('meeting + test on the same day: green + blue dots, sheet orders meetings first then tests', () => {
  // "Thursday at 8am" from Fri 2026-07-03 resolves to Thu 2026-07-09
  const clubs = [{ id: 'beta', name: 'Beta Club', next_meeting: 'Thursday at 8am' }]
  const tasks = [
    task({ title: 'Spanish test', kind: 'test', due_date_calc: '2026-07-09' }),
    task({ title: 'Read chapter 4', due_date_calc: '2026-07-09' }),
  ]
  const days = buildMonthData({ year: 2026, monthIndex: 6, tasks, clubs, settings: SETTINGS, now: NOW })
  const entry = days.get('2026-07-09')

  assert.equal(entry.dots.meeting, true)
  assert.equal(entry.dots.due, true)
  assert.deepEqual(dayDots(entry), [DOT_COLORS.due, DOT_COLORS.meeting])

  // Flat blocks: meetings, then tests, then everything else
  assert.equal(entry.meetings.length, 1)
  assert.equal(entry.meetings[0].clubName, 'Beta Club')
  assert.deepEqual(entry.tests.map(t => t.title), ['Spanish test'])
  assert.deepEqual(entry.others.map(t => t.title), ['Read chapter 4'])
})

test('3+ dot types stack side by side on one day (past: purple + red + green)', () => {
  // 2026-06-29 is a no-school day, holds an overdue task, and a club meeting
  // pinned there by an explicit date — three independent dots, none merged.
  const clubs = [{ id: 'sc', name: 'Student Council', next_meeting: '6/29 at 3:40pm' }]
  const tasks = [task({ title: 'Overdue lab', due_date_calc: '2026-06-29' })]
  const days = buildMonthData({ year: 2026, monthIndex: 5, tasks, clubs, settings: SETTINGS, now: NOW })
  const entry = days.get('2026-06-29')

  assert.deepEqual(entry.dots, { due: false, overdue: true, noSchool: true, meeting: true })
  const dots = dayDots(entry)
  assert.equal(dots.length, 3)
  assert.deepEqual(dots, [DOT_COLORS.noSchool, DOT_COLORS.overdue, DOT_COLORS.meeting])
})

test('3+ dot types stack on a future day (blue + purple + green)', () => {
  // "next Monday" from Fri 7/3 → Mon 2026-07-06, which is also a no-school day
  const clubs = [{ id: 'nhs', name: 'National Honor Society', next_meeting: 'next Monday at 9am' }]
  const tasks = [task({ title: 'College essay draft', due_date_calc: '2026-07-06' })]
  const days = buildMonthData({ year: 2026, monthIndex: 6, tasks, clubs, settings: SETTINGS, now: NOW })
  const entry = days.get('2026-07-06')

  assert.deepEqual(dayDots(entry), [DOT_COLORS.due, DOT_COLORS.noSchool, DOT_COLORS.meeting])
})

test('day-sheet "everything else" uses the Tasks-card priority ordering', () => {
  const tasks = [
    task({ id: 'c', title: 'No priority', due_date_calc: '2026-07-10' }),
    task({ id: 'a', title: 'Priority rank 2', due_date_calc: '2026-07-10', priority: true, priority_rank: 2 }),
    task({ id: 'b', title: 'Priority rank 1', due_date_calc: '2026-07-10', priority: true, priority_rank: 1 }),
  ]
  const days = buildMonthData({ year: 2026, monthIndex: 6, tasks, clubs: [], settings: SETTINGS, now: NOW })
  assert.deepEqual(days.get('2026-07-10').others.map(t => t.title), ['Priority rank 1', 'Priority rank 2', 'No priority'])
})

test('dates come from stored deadline-engine values, with legacy fallback', () => {
  // Canonical column wins
  assert.equal(taskDateISO(task({ due_date_calc: '2026-07-09', due_at: '2026-07-10T03:59:00Z' })), '2026-07-09')
  // due_at converts to the Clark-local date (03:59Z = 11:59 PM Eastern the day before)
  assert.equal(taskDateISO(task({ due_at: '2026-07-10T03:59:00Z' })), '2026-07-09')
  // Legacy display string still parses
  assert.equal(taskDateISO(task({ due_date: '07/09' })), '2026-07-09')
  // Unresolvable → no dot
  assert.equal(taskDateISO(task({ due_date: 'whenever' })), null)
})

test('done tasks and clubs without meetings contribute nothing', () => {
  const tasks = [task({ title: 'Finished', due_date_calc: '2026-07-08', done: true })]
  const clubs = [{ id: 'sp', name: 'Spanish Club', next_meeting: null }]
  const days = buildMonthData({ year: 2026, monthIndex: 6, tasks, clubs, settings: SETTINGS, now: NOW })
  assert.equal(days.get('2026-07-08'), undefined)
  assert.deepEqual(resolveClubMeetings(clubs, SETTINGS, NOW), [])
})

test('kind falls back to deterministic inference for legacy rows', () => {
  assert.equal(taskKind(task({ kind: 'test' })), 'test')
  assert.equal(taskKind(task({ title: 'Bio quiz', kind: null })), 'test')
  assert.equal(taskKind(task({ title: 'Essay outline', kind: null })), 'assignment')
})

test('month grid aligns weekdays (July 2026 starts on Wednesday)', () => {
  const weeks = monthGrid(2026, 6)
  assert.deepEqual(weeks[0], [null, null, null, 1, 2, 3, 4])
  assert.equal(weeks.flat().filter(Boolean).length, 31)
})
