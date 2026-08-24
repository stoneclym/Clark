/**
 * Verification for the formalGradeName ECO-class bug: the AI is told to echo
 * back the closest class_name from FORMAL_GRADE_ORDER, and for the two CFCC
 * dual-enrollment classes that closest match IS the full formal string
 * itself ("ECO 251 – Principles of Microeconomics"), not a short alias. The
 * lookup table only had short aliases as keys, so any grade update naming an
 * ECO class by its full formal name failed with "class not recognized" —
 * this silently broke every "change all grades" batch that touched an ECO
 * class, and any individual ECO grade update.
 * Run with: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const FORMAL_GRADE_NAMES = {
  'ib history of the americas': 'IB History of the Americas',
  hota: 'IB History of the Americas',
  micro: 'ECO 251 – Principles of Microeconomics',
  microeconomics: 'ECO 251 – Principles of Microeconomics',
  'principles of microeconomics': 'ECO 251 – Principles of Microeconomics',
  'eco 251': 'ECO 251 – Principles of Microeconomics',
  macro: 'ECO 252 – Principles of Macroeconomics',
  macroeconomics: 'ECO 252 – Principles of Macroeconomics',
  'principles of macroeconomics': 'ECO 252 – Principles of Macroeconomics',
  'eco 252': 'ECO 252 – Principles of Macroeconomics',
}

const FORMAL_GRADE_ORDER = [
  'IB History of the Americas',
  'IB Biology',
  'IB Theory of Knowledge',
  'IB Language and Literature',
  'IB Applications and Interpretations',
  'ECO 251 – Principles of Microeconomics',
  'ECO 252 – Principles of Macroeconomics',
]

function normalizeClassName(name) {
  return String(name || '').trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ')
}

// The fixed lookup — mirrors src/TodayScreen.jsx and parse-brain-dump/index.ts.
function formalGradeName(name) {
  const key = normalizeClassName(name)
  if (FORMAL_GRADE_NAMES[key]) return FORMAL_GRADE_NAMES[key]
  return FORMAL_GRADE_ORDER.find(formal => normalizeClassName(formal) === key) || null
}

test('short aliases still resolve (unaffected by the fix)', () => {
  assert.equal(formalGradeName('HOTA'), 'IB History of the Americas')
  assert.equal(formalGradeName('Micro'), 'ECO 251 – Principles of Microeconomics')
  assert.equal(formalGradeName('ECO 252'), 'ECO 252 – Principles of Macroeconomics')
})

test('the AI echoing the full formal ECO name back verbatim now resolves', () => {
  assert.equal(formalGradeName('ECO 251 – Principles of Microeconomics'), 'ECO 251 – Principles of Microeconomics')
  assert.equal(formalGradeName('ECO 252 – Principles of Macroeconomics'), 'ECO 252 – Principles of Macroeconomics')
})

test('a stored grade row\'s own class_name (the formal string) matches itself for update-vs-insert lookup', () => {
  const storedRow = { class_name: 'ECO 251 – Principles of Microeconomics' }
  assert.equal(formalGradeName(storedRow.class_name), 'ECO 251 – Principles of Microeconomics')
})

test('an unrecognized class name still returns null', () => {
  assert.equal(formalGradeName('Astronomy'), null)
  assert.equal(formalGradeName(''), null)
})
