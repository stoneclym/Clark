/**
 * Verification that club meeting times display in the exact same format as
 * task due dates, regardless of how the meeting time was phrased — both
 * paths go through computeDeadline() + getTaskDateInfo(), mirroring the
 * logic in ClubsScreen.jsx's meetingDateInfo().
 * Run with: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeDeadline } from '../supabase/functions/_shared/deadlineEngine.js'
import { getTaskDateInfo } from '../src/lib/taskDates.js'

const SETTINGS = {
  first_day: '2026-08-24',
  first_day_type: 'A',
  no_school_dates: [],
  a_schedule: { tuesFri: [] },
  b_schedule: { tuesFri: [] },
}

// "now" = Tuesday 2026-08-25 at 10:00 AM Eastern
const NOW = new Date('2026-08-25T10:00:00-04:00')

function meetingDateInfo(whenText) {
  const deadline = computeDeadline({ kind: 'event', dueText: whenText }, SETTINGS, NOW)
  return getTaskDateInfo(deadline)
}

function taskDateInfo(whenText) {
  const deadline = computeDeadline({ kind: 'assignment', dueText: whenText }, SETTINGS, NOW)
  return getTaskDateInfo(deadline)
}

test('a meeting and a task with the same natural-language time render an identical label', () => {
  for (const phrase of ['tomorrow at 3:30 pm', 'Friday at 4 PM', 'next Tuesday']) {
    assert.equal(meetingDateInfo(phrase).label, taskDateInfo(phrase).label, `"${phrase}" should format identically`)
  }
})

test('differently-phrased meeting times normalize to the same displayed format', () => {
  // "tomorrow at 3:30 pm" (relative to NOW = 2026-08-25) and the explicit
  // date/time it resolves to (2026-08-26) render identically, regardless of
  // how the user phrased it — both flow through the same due_date_calc/due_at
  // columns and the same getTaskDateInfo label logic.
  const viaRelative = meetingDateInfo('tomorrow at 3:30 pm')
  const viaExplicit = meetingDateInfo('8/26 at 3:30 pm')
  assert.equal(viaRelative.label, viaExplicit.label)
  assert.match(viaRelative.label, /3:30 PM$/)
})

test('a meeting time with no explicit clock time still gets the "same format" date label', () => {
  const info = meetingDateInfo('Friday')
  assert.equal(info.hasRealDate, true)
  assert.match(info.label, /^\d{2}\/\d{2}\/\d{2}$/)
})

test('unresolvable meeting text falls back to the raw phrase, same as a task would', () => {
  const info = meetingDateInfo('whenever works')
  assert.equal(info.hasRealDate, false)
  assert.equal(info.label, 'whenever works')
})
