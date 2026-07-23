import { useState } from 'react'
import DesktopHeader from './DesktopHeader.jsx'
import DesktopColumn1 from './DesktopColumn1.jsx'
import DesktopColumn2 from './DesktopColumn2.jsx'
import DesktopColumn3 from './DesktopColumn3.jsx'
import DesktopClubs from './DesktopClubs.jsx'

/** Desktop (>=1024px) layout — one continuous scrollable page: header,
    a three-column dashboard grid, and a full-width Clubs band below it.
    No tab bar, no sheets, no Liquid Glass (flat/solid soft-shadow cards,
    per Batch 8) — this is a second, independent layout, not a
    replacement for the mobile one, which App.jsx renders unchanged
    below 1024px. */
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

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <DesktopHeader
        onOpenSettings={onOpenSettings}
        onLock={onLock}
        askExpanded={askExpanded}
        onToggleAsk={toggleAsk}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
        padding: '24px 32px 0', alignItems: 'start',
      }}>
        <DesktopColumn1
          askExpanded={askExpanded}
          onCloseAsk={() => setAskExpanded(false)}
          dimmed={calendarExpanded}
        />
        <DesktopColumn2
          calendarExpanded={calendarExpanded}
          onToggleCalendar={toggleCalendar}
          dimmed={askExpanded}
        />
        <DesktopColumn3
          dimmed={askExpanded || calendarExpanded}
        />
      </div>

      <DesktopClubs />
    </div>
  )
}
