import { useState, useCallback } from 'react'
import DesktopColumn1 from './DesktopColumn1.jsx'
import DesktopColumn2 from './DesktopColumn2.jsx'
import DesktopColumn3 from './DesktopColumn3.jsx'
import DesktopClubs from './DesktopClubs.jsx'
import { useAccordion } from './lib/useAccordion.js'
import { SPACE } from './lib/spacing.js'

// Reasonable pre-measurement height for columns 1/3, so they never
// briefly render at their own (uncapped) content height before column
// 2's real height is measured on mount — see DesktopColumn2.jsx.
const FALLBACK_COLUMN_HEIGHT = 700

/** Desktop (>=1024px) layout — one continuous scrollable page: a
    three-column dashboard grid (the header is the first item of column
    1's own stack, not a separate row — see DesktopColumn1) and a
    full-width Clubs band below it. No tab bar, no sheets, no Liquid
    Glass (flat/solid soft-shadow cards, per Batch 8) — this is a second,
    independent layout, not a replacement for the mobile one, which
    App.jsx renders unchanged below 1024px.

    Expand behavior: Briefing and Calendar are in-flow accordions (see
    DesktopScheduleCard/DesktopCalendarCard) that grow column 2's own
    height in normal document flow — no overlay, no dimming of any
    column. useAccordion() only coordinates mutual exclusivity between
    those two. Ask Clark (column 1) is a fully independent local toggle
    with no relationship to this hook at all — see DesktopColumn1.

    Column heights: column 2's rendered height (measured in
    DesktopColumn2 and reported here) is the reference height for the
    row; columns 1 and 3 are given that exact pixel height explicitly
    rather than relying on grid stretch, so their own flex fillers
    (Tasks, Inbox) resolve to a definite height and scroll internally
    instead of growing past it — see DesktopColumn2.jsx for why stretch
    alone wasn't sufficient. This also means columns 1/3 grow along with
    column 2 when Briefing/Calendar expand, keeping all three level. */
export default function DesktopApp({ onOpenSettings, onLock }) {
  const { isExpanded, toggle, collapse } = useAccordion()
  const [columnHeight, setColumnHeight] = useState(FALLBACK_COLUMN_HEIGHT)
  const handleColumn2Height = useCallback((height) => setColumnHeight(height), [])

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.column,
        padding: `${SPACE.section}px 32px 32px`,
      }}>
        <DesktopColumn1
          onOpenSettings={onOpenSettings}
          onLock={onLock}
          columnHeight={columnHeight}
        />
        <DesktopColumn2
          briefingExpanded={isExpanded('briefing')}
          onToggleBriefing={() => toggle('briefing')}
          calendarExpanded={isExpanded('calendar')}
          onToggleCalendar={() => toggle('calendar')}
          onCollapse={collapse}
          onHeightChange={handleColumn2Height}
        />
        <DesktopColumn3
          columnHeight={columnHeight}
        />
      </div>

      <DesktopClubs />
    </div>
  )
}
