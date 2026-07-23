import { useState } from 'react'
import DesktopHeader from './DesktopHeader.jsx'
import DesktopColumn1 from './DesktopColumn1.jsx'
import DesktopColumn2 from './DesktopColumn2.jsx'
import DesktopColumn3 from './DesktopColumn3.jsx'
import DesktopClubs from './DesktopClubs.jsx'

const GRID_COLUMNS = 'repeat(3, 1fr)'
const GRID_GAP = 24

/** Desktop (>=1024px) layout — one continuous scrollable page: header,
    a three-column dashboard grid, and a full-width Clubs band below it.
    No tab bar, no sheets, no Liquid Glass (flat/solid soft-shadow cards,
    per Batch 8) — this is a second, independent layout, not a
    replacement for the mobile one, which App.jsx renders unchanged
    below 1024px.

    Batch 9 root fix: the header row and the content row are two rows of
    the SAME CSS Grid (not a separate flex row above an unrelated grid),
    so column widths can never drift between them — the header card is
    explicitly placed in column 1's track, nothing more. */
export default function DesktopApp({ onOpenSettings, onLock }) {
  const [askExpanded, setAskExpanded] = useState(false)
  const [calendarExpanded, setCalendarExpanded] = useState(false)

  // Only one column expands at a time — opening one collapses the other,
  // so the "dim the other two columns" behavior always stays coherent.
  const toggleAsk = () => setAskExpanded(e => {
    const next = !e
    if (next) setCalendarExpanded(false)
    return next
  })
  const toggleCalendar = () => setCalendarExpanded(e => {
    const next = !e
    if (next) setAskExpanded(false)
    return next
  })
  // Tapping the dimmed area of whichever columns aren't expanded closes
  // whichever is open — only one can ever be true, so this is safe from
  // either side.
  const dismissExpanded = () => {
    setAskExpanded(false)
    setCalendarExpanded(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: GRID_GAP,
        padding: '28px 32px 32px',
      }}>
        <div style={{ gridColumn: '1', gridRow: '1' }}>
          <DesktopHeader
            onOpenSettings={onOpenSettings}
            onLock={onLock}
            askExpanded={askExpanded}
            onToggleAsk={toggleAsk}
          />
        </div>

        <div style={{ gridColumn: '1', gridRow: '2' }}>
          <DesktopColumn1
            askExpanded={askExpanded}
            onCloseAsk={() => setAskExpanded(false)}
            dimmed={calendarExpanded}
            onDismiss={dismissExpanded}
          />
        </div>
        <div style={{ gridColumn: '2', gridRow: '2' }}>
          <DesktopColumn2
            calendarExpanded={calendarExpanded}
            onToggleCalendar={toggleCalendar}
            dimmed={askExpanded}
            onDismiss={dismissExpanded}
          />
        </div>
        <div style={{ gridColumn: '3', gridRow: '2' }}>
          <DesktopColumn3
            dimmed={askExpanded || calendarExpanded}
            onDismiss={dismissExpanded}
          />
        </div>
      </div>

      <DesktopClubs />
    </div>
  )
}
