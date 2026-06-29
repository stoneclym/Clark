
const TASK_TITLE_CLASS_PHRASES = [
  'IB History of the Americas',
  'History of the Americas',
  'IB Applications and Interpretations',
  'Applications and Interpretations',
  'IB Language and Literature',
  'Language and Literature',
  'IB Theory of Knowledge',
  'Theory of Knowledge',
  'IB Biology',
  'Biology',
  'History',
  'English',
  'Math',
  'HOTA',
  'Bio',
  'Lang',
  'TOK',
]

function stripClassPhrases(value) {
  let title = value
  TASK_TITLE_CLASS_PHRASES.forEach(phrase => {
    const pattern = phrase.replace(/\s+/g, '\\s+')
    title = title.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), ' ')
  })
  return title.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
}
const TASK_TITLE_WORDS = {
  ib: 'IB',
  nhs: 'NHS',
  tok: 'TOK',
  hota: 'HOTA',
  ap: 'AP',
  gpa: 'GPA',
  ia: 'IA',
  ee: 'EE',
  cas: 'CAS',
  sat: 'SAT',
  act: 'ACT',
  ncsis: 'NCSIS',
  bio: 'Bio',
  math: 'Math',
  canvas: 'Canvas',
  instagram: 'Instagram',
}

export function sentenceCaseTaskTitle(value) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ')
  if (!raw) return ''

  const shouldNormalizeCase = raw === raw.toLowerCase() || raw === raw.toUpperCase()
  let title = shouldNormalizeCase ? raw.toLowerCase() : raw

  title = title.replace(/[A-Za-z]/, letter => letter.toUpperCase())
  title = title.replace(/([.!?]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)

  Object.entries(TASK_TITLE_WORDS).forEach(([word, replacement]) => {
    title = title.replace(new RegExp(`\\b${word}\\b`, 'gi'), replacement)
  })

  const cleaned = stripClassPhrases(title) || title
  return cleaned.replace(/[A-Za-z]/, letter => letter.toUpperCase())
}
