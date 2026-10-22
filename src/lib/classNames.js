const TASK_CLASS_TAGS = {
  hota: 'HOTA',
  history: 'HOTA',
  'history of the americas': 'HOTA',
  'ib history of the americas': 'HOTA',
  bio: 'Bio',
  biology: 'Bio',
  'ib biology': 'Bio',
  'ib biology hl': 'Bio',
  'biology hl': 'Bio',
  lang: 'Lang',
  english: 'Lang',
  'language and literature': 'Lang',
  'ib language and literature': 'Lang',
  'ib english language and literature': 'Lang',
  'ib english lang lit': 'Lang',
  'ib english lang and lit': 'Lang',
  'ib language and lit': 'Lang',
  'language and lit': 'Lang',
  math: 'Math',
  'applications and interpretations': 'Math',
  'ib applications and interpretations': 'Math',
  'ib math applications and interpretations': 'Math',
  'math applications and interpretations': 'Math',
  'math analysis and approaches': 'Math',
  tok: 'TOK',
  'theory of knowledge': 'TOK',
  'ib theory of knowledge': 'TOK',
  micro: 'Micro',
  microeconomics: 'Micro',
  'principles of microeconomics': 'Micro',
  'eco 251': 'Micro',
  macro: 'Macro',
  macroeconomics: 'Macro',
  'principles of macroeconomics': 'Macro',
  'eco 252': 'Macro',
}

// Fixed display order for the Tasks card's Class-tab grouping. Micro/Macro
// (async CFCC dual-enrollment — see clarkscheduleprompt.md) are grades-only
// and never appear in the A/B schedule, but they still take task tags.
export const CLASS_TAG_ORDER = ['HOTA', 'Bio', 'Lang', 'Math', 'TOK', 'Micro', 'Macro']

export function normalizeClassLabel(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')

  return TASK_CLASS_TAGS[normalized] || null
}
