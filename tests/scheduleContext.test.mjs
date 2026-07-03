/**
 * Verification for the shared schedule context module.
 * Run with: npm test  (plain `node --test tests/`)
 *
 * Uses the real 2026-27 settings shape: first day 2026-08-24 (Monday, A day),
 * Labor Day 2026-09-07 as a no-school date, and the actual A/B period lists.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDayType,
  getCurrentPeriod,
  getNextClass,
  nextOccurrenceOfClass,
  getWeekSchedule,
  buildScheduleContext,
  describeScheduleContext,
  nextSchoolDay,
} from '../supabase/functions/_shared/scheduleContext.js'

const FIRST_DAY = '2026-08-24' // Monday
const NO_SCHOOL = ['2026-09-07', '2026-10-26'] // Labor Day (Mon), teacher workday

const A_SCHEDULE = [
  { name: 'Period 1', start: '8:00 AM', end: '9:30 AM', class_name: 'Free Period' },
  { name: 'Period 2', start: '9:35 AM', end: '11:05 AM', class_name: 'History of the Americas' },
  { name: 'Advisory', start: '11:05 AM', end: '11:25 AM', class_name: 'Advisory' },
  { name: 'Lunch', start: '11:25 AM', end: '12:10 PM', class_name: 'Lunch' },
  { name: 'Period 3', start: '12:15 PM', end: '1:45 PM', class_name: 'IB Applications and Interpretations' },
  { name: 'Period 4', start: '1:50 PM', end: '3:15 PM', class_name: 'Cape Fear Class' },
]

const B_SCHEDULE = [
  { name: 'Period 1', start: '8:00 AM', end: '9:30 AM', class_name: 'TOK' },
  { name: 'Period 2', start: '9:35 AM', end: '11:05 AM', class_name: 'IB Lang and Lit' },
  { name: 'Advisory', start: '11:05 AM', end: '11:25 AM', class_name: 'Advisory' },
  { name: 'Lunch', start: '11:25 AM', end: '12:10 PM', class_name: 'Lunch' },
  { name: 'Period 3', start: '12:15 PM', end: '1:45 PM', class_name: 'IB Bio' },
  { name: 'Period 4', start: '1:50 PM', end: '3:15 PM', class_name: 'Cape Fear Class' },
]

const SETTINGS = {
  first_day: FIRST_DAY,
  first_day_type: 'A',
  no_school_dates: NO_SCHOOL,
  a_schedule: A_SCHEDULE,
  b_schedule: B_SCHEDULE,
  cape_fear_classes: ['Cape Fear Class'],
}

// Instants in Eastern time (EDT in early September)
const eastern = (iso, time) => new Date(`${iso}T${time}:00-04:00`)

test('normal A/B alternation across the first two weeks', () => {
  // Week 1: Mon A, Tue B, Wed A, Thu B, Fri A
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-24'), 'A')
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-25'), 'B')
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-26'), 'A')
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-27'), 'B')
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-28'), 'A')
  // Weekend has no day type, and the pattern continues Monday
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-29'), null)
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-30'), null)
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-08-31'), 'B')
})

test('day type is null before the first day of school', () => {
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-07-03'), null)
})

test('a B-type first day inverts the pattern', () => {
  assert.equal(getDayType(FIRST_DAY, 'B', NO_SCHOOL, '2026-08-24'), 'B')
  assert.equal(getDayType(FIRST_DAY, 'B', NO_SCHOOL, '2026-08-25'), 'A')
})

test('no-school dates are skipped and the pattern does not reset', () => {
  // Fri 2026-09-04 is the 10th school day → B
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-09-04'), 'B')
  // Labor Day Monday is a no-school date → null
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-09-07'), null)
  // Tuesday continues from B → A; the holiday did not reset anything
  assert.equal(getDayType(FIRST_DAY, 'A', NO_SCHOOL, '2026-09-08'), 'A')
  // nextSchoolDay hops over the weekend AND the holiday
  assert.equal(nextSchoolDay('2026-09-04', NO_SCHOOL), '2026-09-08')
})

test('determining the current and next class within a school day', () => {
  // Tue 2026-08-25 is a B day. 10:00 AM → in Period 2, IB Lang and Lit
  const midMorning = getCurrentPeriod(B_SCHEDULE, eastern('2026-08-25', '10:00'))
  assert.equal(midMorning.status, 'now')
  assert.equal(midMorning.className, 'IB Lang and Lit')
  assert.equal(midMorning.remaining, '65 min')
  assert.equal(midMorning.nextClass, 'Advisory')

  // 7:30 AM → next is Period 1 in 30 min
  const beforeSchool = getCurrentPeriod(B_SCHEDULE, eastern('2026-08-25', '07:30'))
  assert.equal(beforeSchool.status, 'next')
  assert.equal(beforeSchool.className, 'TOK')
  assert.equal(beforeSchool.remaining, 'in 30 min')

  // After 3:15 PM → nothing left today
  assert.equal(getCurrentPeriod(B_SCHEDULE, eastern('2026-08-25', '16:00')), null)
})

test('getNextClass looks past the end of the day to the next school day', () => {
  // Tue 2026-08-25 at 4 PM: school day over → Wednesday (A day), Period 1
  const next = getNextClass(SETTINGS, eastern('2026-08-25', '16:00'))
  assert.equal(next.status, 'upcoming')
  assert.equal(next.date, '2026-08-26')
  assert.equal(next.dayType, 'A')
  assert.equal(next.period, 'Period 1')

  // Fri 2026-09-04 at 4 PM: weekend + Labor Day skipped → Tue 2026-09-08 (A day)
  const afterHoliday = getNextClass(SETTINGS, eastern('2026-09-04', '16:00'))
  assert.equal(afterHoliday.date, '2026-09-08')
  assert.equal(afterHoliday.dayType, 'A')
})

test('nextOccurrenceOfClass finds the next meeting of a specific class', () => {
  // From Tue 2026-08-25 (B day) morning: HOTA is an A-day class → Wed 2026-08-26
  const hota = nextOccurrenceOfClass(SETTINGS, 'History of the Americas', eastern('2026-08-25', '08:00'))
  assert.equal(hota.date, '2026-08-26')
  assert.equal(hota.dayType, 'A')

  // TOK meets today (B day) but has already ended by 4 PM → next B day, Thu
  const tok = nextOccurrenceOfClass(SETTINGS, 'TOK', eastern('2026-08-25', '16:00'))
  assert.equal(tok.date, '2026-08-27')

  // TOK at 7 AM → still today
  const tokEarly = nextOccurrenceOfClass(SETTINGS, 'TOK', eastern('2026-08-25', '07:00'))
  assert.equal(tokEarly.date, '2026-08-25')

  // Cape Fear meets every school day → today at 8 AM, today
  const cf = nextOccurrenceOfClass(SETTINGS, 'Cape Fear Class', eastern('2026-08-25', '08:00'))
  assert.equal(cf.date, '2026-08-25')
})

test('generating a full week schedule', () => {
  // Week containing Wed 2026-09-09 → Mon 9/7 (holiday) through Fri 9/11
  const week = getWeekSchedule(SETTINGS, '2026-09-09')
  assert.equal(week.length, 5)
  assert.deepEqual(week.map(d => d.date), ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'])
  assert.deepEqual(week.map(d => d.dayType), [null, 'A', 'B', 'A', 'B'])
  assert.equal(week[0].isSchoolDay, false)
  assert.equal(week[1].weekday, 'Tuesday')
  assert.equal(week[1].periods[1].class_name, 'History of the Americas')
  assert.equal(week[2].periods[0].class_name, 'TOK')
})

test('buildScheduleContext + describeScheduleContext produce a coherent snapshot', () => {
  const ctx = buildScheduleContext(SETTINGS, eastern('2026-08-25', '10:00'))
  assert.equal(ctx.today, '2026-08-25')
  assert.equal(ctx.weekday, 'Tuesday')
  assert.equal(ctx.dayType, 'B')
  assert.equal(ctx.isSchoolDay, true)
  assert.equal(ctx.currentPeriod.className, 'IB Lang and Lit')
  assert.equal(ctx.week.length, 5)
  assert.deepEqual(ctx.capeFearClasses, ['Cape Fear Class'])

  const text = describeScheduleContext(ctx)
  assert.match(text, /Tuesday 2026-08-25.*B day/)
  assert.match(text, /Current class: IB Lang and Lit/)
  assert.match(text, /Mon 2026-08-24: A day/)
  assert.match(text, /Cape Fear/)

  // Null settings must not throw (fresh install)
  const empty = buildScheduleContext(null, eastern('2026-08-25', '10:00'))
  assert.equal(empty.dayType, null)
  assert.equal(describeScheduleContext(empty).includes('not a school day'), true)
})
