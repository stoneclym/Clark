/**
 * Verification that tasks tagged with a class actually land in the right
 * group when the Tasks card's "Class" filter is active. This mirrors the
 * exact grouping algorithm in TasksCard (src/TodayScreen.jsx): tags are
 * normalized via normalizeClassLabel, then bucketed into CLASS_TAG_ORDER
 * groups (or "Other" if unrecognized).
 * Run with: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeClassLabel, CLASS_TAG_ORDER } from '../src/lib/classNames.js'

// Mirrors TasksCard's displayTaskTag: strip status words, then normalize.
function displayTaskTag(tag) {
  const value = String(tag || '').trim()
  if (!value || /^(overdue|late|past due|past-due|yesterday|today|tomorrow)$/i.test(value)) return ''
  return normalizeClassLabel(value) || ''
}

// Mirrors TasksCard's classGroups computation exactly.
function groupByClass(tasks) {
  const byTag = new Map(CLASS_TAG_ORDER.map(tag => [tag, []]))
  const other = []
  for (const t of tasks) {
    const label = displayTaskTag(t.tag)
    if (label && byTag.has(label)) byTag.get(label).push(t)
    else other.push(t)
  }
  return { byTag, other }
}

test('normalizeClassLabel maps every real-world tag variant to its canonical class', () => {
  const cases = [
    ['HOTA', 'HOTA'], ['hota', 'HOTA'], ['History', 'HOTA'], ['IB History of the Americas', 'HOTA'],
    ['Bio', 'Bio'], ['biology', 'Bio'], ['IB Biology HL', 'Bio'],
    ['Lang', 'Lang'], ['english', 'Lang'], ['IB Language and Literature', 'Lang'],
    ['Math', 'Math'], ['Applications and Interpretations', 'Math'],
    ['TOK', 'TOK'], ['theory of knowledge', 'TOK'],
    ['Micro', 'Micro'], ['microeconomics', 'Micro'], ['Principles of Microeconomics', 'Micro'],
    ['Macro', 'Macro'], ['macroeconomics', 'Macro'],
  ]
  for (const [input, expected] of cases) {
    assert.equal(normalizeClassLabel(input), expected, `"${input}" should normalize to ${expected}`)
  }
  assert.equal(normalizeClassLabel('Student Council'), null)
  assert.equal(normalizeClassLabel(''), null)
})

test('tasks with class tags are grouped into the correct Class-tab section', () => {
  const tasks = [
    { id: 1, title: 'HOTA essay', tag: 'HOTA' },
    { id: 2, title: 'Bio lab report', tag: 'Biology' },
    { id: 3, title: 'Lang reading', tag: 'english' },
    { id: 4, title: 'Math problem set', tag: 'Math' },
    { id: 5, title: 'TOK reflection', tag: 'Theory of Knowledge' },
    { id: 6, title: 'Micro homework', tag: 'Microeconomics' },
    { id: 7, title: 'Macro homework', tag: 'macro' },
    { id: 8, title: 'Bake sale signup', tag: 'Student Council' }, // not a class → Other
    { id: 9, title: 'No tag task', tag: null }, // → Other
  ]

  const { byTag, other } = groupByClass(tasks)

  assert.deepEqual(byTag.get('HOTA').map(t => t.id), [1])
  assert.deepEqual(byTag.get('Bio').map(t => t.id), [2])
  assert.deepEqual(byTag.get('Lang').map(t => t.id), [3])
  assert.deepEqual(byTag.get('Math').map(t => t.id), [4])
  assert.deepEqual(byTag.get('TOK').map(t => t.id), [5])
  assert.deepEqual(byTag.get('Micro').map(t => t.id), [6])
  assert.deepEqual(byTag.get('Macro').map(t => t.id), [7])
  assert.deepEqual(other.map(t => t.id), [8, 9])
})

test('a task never appears in more than one class group, and every class-tagged task appears somewhere', () => {
  const tasks = [
    { id: 1, tag: 'HOTA' },
    { id: 2, tag: 'Bio' },
    { id: 3, tag: 'Lang' },
    { id: 4, tag: 'Math' },
    { id: 5, tag: 'TOK' },
    { id: 6, tag: 'Micro' },
    { id: 7, tag: 'Macro' },
  ]
  const { byTag, other } = groupByClass(tasks)
  const allGrouped = [...byTag.values()].flat().concat(other)
  assert.equal(allGrouped.length, tasks.length)
  // Each task shows up in exactly the group matching its own tag.
  for (const t of tasks) {
    assert.deepEqual(byTag.get(t.tag).map(x => x.id), [t.id])
  }
})
