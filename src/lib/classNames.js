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
  'cfcc 1': 'CFCC 1',
  'cfcc1': 'CFCC 1',
  'cfcc 2': 'CFCC 2',
  'cfcc2': 'CFCC 2',
  'cfcc 3': 'CFCC 3',
  'cfcc3': 'CFCC 3',
}

// Fixed display order for the Tasks card's Class-tab grouping.
export const CLASS_TAG_ORDER = ['HOTA', 'Bio', 'Lang', 'Math', 'TOK', 'CFCC 1', 'CFCC 2', 'CFCC 3']

export function normalizeClassLabel(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')

  return TASK_CLASS_TAGS[normalized] || null
}
