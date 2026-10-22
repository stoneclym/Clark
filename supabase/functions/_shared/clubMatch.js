// Deterministic safety net for club-task routing. The AI classifiers in
// parse-brain-dump and ask-clark are told to route club-associated items
// to club_tasks, but nothing catches it if they misclassify — this is a
// second, non-AI check run against free text (title/tag/category/club_name)
// before deciding which table an item lands in.
const CLUB_ALIASES = {
  'National Honor Society': ['nhs', 'national honor society'],
  'Beta Club': ['beta club'],
  'Spanish Club': ['spanish club'],
  'Student Council': ['student council', 'senior class', 'class president'],
}

/** Case-insensitive match of free text against known club names/aliases. */
export function matchClub(text, clubs) {
  const haystack = String(text || '').toLowerCase()
  if (!haystack) return null
  for (const club of clubs) {
    if (haystack.includes(String(club.name).toLowerCase())) return club
    const aliases = CLUB_ALIASES[club.name] || []
    if (aliases.some(alias => haystack.includes(alias))) return club
  }
  return null
}
