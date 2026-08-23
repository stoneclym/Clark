/**
 * Verification for the shared schedule context module.
 * Run with: npm test  (plain `node --test tests/`)
 *
 * Uses the real 2026-27 settings shape: first day 2026-08-24 (Monday, A day),
 * Labor Day 2026-09-07 as a no-school date, and the actual A/B block times —
 * each keyed by weekday variant (`monday` has homeroom and different block
 * windows than `tuesFri`), per clarkscheduleprompt.md.
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

const A_SCHEDULE = {
  monday: [
    { name: 'Homeroom', start: '8:35 AM', end: '9:05 AM', class_name: 'Homeroom' },
    { name: 'Block 1', start: '9:10 AM', end: '10:35 AM', class_name: 'TOK' },
    { name: 'Block 2', start: '10:40 AM', end: '12:05 PM', class_name: 'History' },
    { name: 'Block 3', start: '12:10 PM', end: '1:30 PM', class_name: 'Biology' },
  ],
  tuesFri: [
    { name: 'Block 1', start: '8:35 AM', end: '10:10 AM', class_name: 'TOK' },
    { name: 'Block 2', start: '10:15 AM', end: '11:50 AM', class_name: 'History' },
    { name: 'Block 3', start: '11:55 AM', end: '1:25 PM', class_name: 'Biology' },
  ],
}

const B_SCHEDULE = {
  monday: [
    { name: 'Block 2', start: '10:40 AM', end: '12:05 PM', class_name: 'English' },
    { name: 'Block 3', start: '12:45 PM', end: '2:05 PM', class_name: 'Math' },
  ],
  tuesFri: [
    { name: 'Block 2', start: '10:15 AM', end: '11:50 AM', class_name: 'English' },
    { name: 'Block 3', start: '12:25 PM', end: '1:55 PM', class_name: 'Math' },
  ],
}

const SETTINGS = {
  first_day: FIRST_DAY,
  first_day_type: 'A',
  no_school_dates: NO_SCHOOL,
  a_schedule: A_SCHEDULE,
  b_schedule: B_SCHEDULE,
  cape_fear_classes: ['Microeconomics', 'Macroeconomics'],
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
  // Tue 2026-08-25 is a B day (Tue–Fri variant). 10:30 AM → in Block 2, English
  const midMorning = getCurrentPeriod(B_SCHEDULE.tuesFri, eastern('2026-08-25', '10:30'))
  assert.equal(midMorning.status, 'now')
  assert.equal(midMorning.className, 'English')
  assert.equal(midMorning.remaining, '80 min')
  assert.equal(midMorning.nextClass, 'Math')

  // 8:00 AM → next is Block 2 in 135 min (starts 10:15)
  const beforeSchool = getCurrentPeriod(B_SCHEDULE.tuesFri, eastern('2026-08-25', '08:00'))
  assert.equal(beforeSchool.status, 'next')
  assert.equal(beforeSchool.className, 'English')
  assert.equal(beforeSchool.remaining, 'in 135 min')

  // After 2:00 PM → nothing left today
  assert.equal(getCurrentPeriod(B_SCHEDULE.tuesFri, eastern('2026-08-25', '14:00')), null)
})

test('getNextClass looks past the end of the day to the next school day', () => {
  // Tue 2026-08-25 at 4 PM: school day over → Wednesday (A day, Tue–Fri variant), Block 1
  const next = getNextClass(SETTINGS, eastern('2026-08-25', '16:00'))
  assert.equal(next.status, 'upcoming')
  assert.equal(next.date, '2026-08-26')
  assert.equal(next.dayType, 'A')
  assert.equal(next.period, 'Block 1')

  // Fri 2026-09-04 at 4 PM: weekend + Labor Day skipped → Tue 2026-09-08 (A day)
  const afterHoliday = getNextClass(SETTINGS, eastern('2026-09-04', '16:00'))
  assert.equal(afterHoliday.date, '2026-09-08')
  assert.equal(afterHoliday.dayType, 'A')
})

test('nextOccurrenceOfClass finds the next meeting of a specific class', () => {
  // From Tue 2026-08-25 (B day) morning: History is an A-day class → Wed 2026-08-26
  const history = nextOccurrenceOfClass(SETTINGS, 'History', eastern('2026-08-25', '08:00'))
  assert.equal(history.date, '2026-08-26')
  assert.equal(history.dayType, 'A')

  // English meets today (B day) but has already ended by 4 PM → next B day, Thu
  const english = nextOccurrenceOfClass(SETTINGS, 'English', eastern('2026-08-25', '16:00'))
  assert.equal(english.date, '2026-08-27')

  // English at 9 AM → still today (hasn't ended yet)
  const englishEarly = nextOccurrenceOfClass(SETTINGS, 'English', eastern('2026-08-25', '09:00'))
  assert.equal(englishEarly.date, '2026-08-25')

  // Micro/Macro never appear in the A/B schedule at all (async CFCC
  // dual-enrollment, grades-only) — no occurrence is ever found.
  const micro = nextOccurrenceOfClass(SETTINGS, 'Micro', eastern('2026-08-25', '08:00'))
  assert.equal(micro, null)
})

test('generating a full week schedule', () => {
  // Week containing Wed 2026-09-09 → Mon 9/7 (holiday) through Fri 9/11
  const week = getWeekSchedule(SETTINGS, '2026-09-09')
  assert.equal(week.length, 5)
  assert.deepEqual(week.map(d => d.date), ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'])
  assert.deepEqual(week.map(d => d.dayType), [null, 'A', 'B', 'A', 'B'])
  assert.equal(week[0].isSchoolDay, false)
  assert.equal(week[1].weekday, 'Tuesday')
  assert.equal(week[1].periods[1].class_name, 'History')
  assert.equal(week[2].periods[0].class_name, 'English')
})

test('buildScheduleContext + describeScheduleContext produce a coherent snapshot', () => {
  const ctx = buildScheduleContext(SETTINGS, eastern('2026-08-25', '10:30'))
  assert.equal(ctx.today, '2026-08-25')
  assert.equal(ctx.weekday, 'Tuesday')
  assert.equal(ctx.dayType, 'B')
  assert.equal(ctx.isSchoolDay, true)
  assert.equal(ctx.currentPeriod.className, 'English')
  assert.equal(ctx.week.length, 5)
  assert.deepEqual(ctx.capeFearClasses, ['Microeconomics', 'Macroeconomics'])

  const text = describeScheduleContext(ctx)
  assert.match(text, /Tuesday 2026-08-25.*B day/)
  assert.match(text, /Current class: English/)
  assert.match(text, /Mon 2026-08-24: A day/)
  assert.match(text, /Cape Fear/)

  // Null settings must not throw (fresh install)
  const empty = buildScheduleContext(null, eastern('2026-08-25', '10:30'))
  assert.equal(empty.dayType, null)
  assert.equal(describeScheduleContext(empty).includes('not a school day'), true)
})

test('Monday has different block times than Tuesday–Friday under the same A/B day type', () => {
  // 2026-08-24 is the first day of school: a Monday, A day.
  const mondayFirst = getCurrentPeriod(A_SCHEDULE.monday, eastern('2026-08-24', '08:45'))
  assert.equal(mondayFirst.status, 'now')
  assert.equal(mondayFirst.className, 'Homeroom')

  // Wed 2026-08-26 is also an A day but Tue–Fri variant — no homeroom, and
  // Block 1 (TOK) starts at 8:35 instead of 9:10.
  const wedSameTime = getCurrentPeriod(A_SCHEDULE.tuesFri, eastern('2026-08-26', '08:45'))
  assert.equal(wedSameTime.status, 'now')
  assert.equal(wedSameTime.className, 'TOK')

  // getScheduleForDate (via buildScheduleContext) picks the right variant
  // automatically from the date's weekday.
  const mondayCtx = buildScheduleContext(SETTINGS, eastern('2026-08-24', '08:45'))
  assert.equal(mondayCtx.currentPeriod.className, 'Homeroom')
  const wedCtx = buildScheduleContext(SETTINGS, eastern('2026-08-26', '08:45'))
  assert.equal(wedCtx.currentPeriod.className, 'TOK')
})
