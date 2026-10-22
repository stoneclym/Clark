/**
 * Unit tests for the deterministic club-name matching safety net used by
 * parse-brain-dump and ask-clark to route club-associated tasks to the
 * right club instead of the main tasks list.
 *
 * Run with: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { matchClub } from '../supabase/functions/_shared/clubMatch.js'

const CLUBS = [
  { id: '1', name: 'Student Council' },
  { id: '2', name: 'Beta Club' },
  { id: '3', name: 'National Honor Society' },
  { id: '4', name: 'Spanish Club' },
]

test('matchClub matches the exact club name', () => {
  const club = matchClub('Order shirts for Beta Club', CLUBS)
  assert.equal(club.name, 'Beta Club')
})

test('matchClub matches the NHS alias for National Honor Society', () => {
  const club = matchClub('NHS blood drive signup sheet', CLUBS)
  assert.equal(club.name, 'National Honor Society')
})

test('matchClub matches Student Council via its aliases', () => {
  assert.equal(matchClub('Student council dance decorations', CLUBS).name, 'Student Council')
  assert.equal(matchClub('Senior class fundraiser', CLUBS).name, 'Student Council')
  assert.equal(matchClub('as class president I need to', CLUBS).name, 'Student Council')
})

test('matchClub is case-insensitive', () => {
  assert.equal(matchClub('SPANISH CLUB skit lines', CLUBS).name, 'Spanish Club')
})

test('matchClub returns null when no club is mentioned', () => {
  assert.equal(matchClub('Finish math homework', CLUBS), null)
})

test('matchClub returns null for empty/missing text', () => {
  assert.equal(matchClub('', CLUBS), null)
  assert.equal(matchClub(null, CLUBS), null)
})
