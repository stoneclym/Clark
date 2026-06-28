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
}

export function normalizeClassLabel(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')

  return TASK_CLASS_TAGS[normalized] || null
}
