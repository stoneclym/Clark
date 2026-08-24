/**
 * Verification that club tasks are mapped into the same shape the Tasks
 * card renders, so they actually show up there instead of only on the
 * Clubs page. Run with: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mapClubTask } from '../src/lib/clubTaskAdapter.js'

test('a club_tasks row maps to a task-shaped object the Tasks card can render', () => {
  const row = {
    id: 'abc-123',
    task_text: 'Draft October email announcement',
    done: false,
    due_date: '2026-09-01',
    due_date_calc: '2026-09-01',
    due_at: '2026-09-01T23:59:00.000Z',
    original_due_text: 'next Tuesday',
    created_at: '2026-08-20T00:00:00.000Z',
    clubs: { name: 'National Honor Society' },
  }

  const mapped = mapClubTask(row)

  assert.equal(mapped.id, 'club-abc-123')
  assert.equal(mapped.title, 'Draft October email announcement')
  assert.equal(mapped.done, false)
  assert.equal(mapped.category, 'Club')
  assert.equal(mapped.tag, 'National Honor Society')
  assert.equal(mapped.source, 'National Honor Society')
  assert.equal(mapped.due_date_calc, '2026-09-01')
  assert.equal(mapped.due_at, '2026-09-01T23:59:00.000Z')
  assert.equal(mapped.original_due_text, 'next Tuesday')
})

test('a club_tasks row with no joined club name still maps safely', () => {
  const mapped = mapClubTask({ id: 'x', task_text: 'Print forms', done: false, clubs: null, created_at: null })
  assert.equal(mapped.id, 'club-x')
  assert.equal(mapped.tag, null)
  assert.equal(mapped.source, 'Club')
})

test('mapped club task ids are distinguishable from main-table task ids for toggle routing', () => {
  const mapped = mapClubTask({ id: 'uuid-1', task_text: 't', done: false, clubs: { name: 'Beta Club' } })
  assert.equal(mapped.id.startsWith('club-'), true)
  assert.equal(mapped.id.slice('club-'.length), 'uuid-1')
})
