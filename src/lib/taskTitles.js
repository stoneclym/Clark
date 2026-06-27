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

  return title
}
