import { useState, useCallback } from 'react'

/** Shared expand-and-dim mechanism for the desktop dashboard's three
    expand-in-place interactions (Ask Clark, Briefing, Calendar) — one
    piece of state (`expandedKey`) rather than a separate boolean per
    card, so they're automatically mutually exclusive and every column
    dims/dismisses the same way.

    - `isExpanded(key)` — is this specific card the one that's open.
    - `isDimmed(ownKeys)` — should THIS column show the dim scrim: true
      whenever something is expanded and it isn't one of this column's
      own keys (e.g. column 2 owns both 'briefing' and 'calendar').
    - `toggle(key)` — open this card (closing whatever else was open),
      or close it if it's already the open one.
    - `collapse()` — close whatever's open; used by every scrim's
      tap-anywhere-to-dismiss and by each card's own explicit close
      affordance. */
export function useExpandDim() {
  const [expandedKey, setExpandedKey] = useState(null)

  const toggle = useCallback((key) => {
    setExpandedKey(current => (current === key ? null : key))
  }, [])

  const collapse = useCallback(() => setExpandedKey(null), [])

  const isExpanded = useCallback((key) => expandedKey === key, [expandedKey])
  const isDimmed = useCallback(
    (ownKeys) => expandedKey != null && !ownKeys.includes(expandedKey),
    [expandedKey],
  )

  return { expandedKey, toggle, collapse, isExpanded, isDimmed }
}
