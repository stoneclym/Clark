import { useState, useCallback } from 'react'

/** Mutual-exclusion state for the desktop dashboard's two in-flow
    accordion cards — Briefing and Calendar. Expanding one collapses the
    other; each also collapses on an outside click (see DesktopColumn2,
    which owns both cards and does the outside-click detection).

    Ask Clark is intentionally NOT part of this hook — it's a simple
    independent toggle local to DesktopColumn1 with no dimming and no
    coordination with these two. */
export function useAccordion() {
  const [expandedKey, setExpandedKey] = useState(null)

  const toggle = useCallback((key) => {
    setExpandedKey(current => (current === key ? null : key))
  }, [])

  const collapse = useCallback(() => setExpandedKey(null), [])
  const isExpanded = useCallback((key) => expandedKey === key, [expandedKey])

  return { toggle, collapse, isExpanded }
}
