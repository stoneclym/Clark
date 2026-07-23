import DesktopColumn1 from './DesktopColumn1.jsx'
import DesktopColumn2 from './DesktopColumn2.jsx'
import DesktopColumn3 from './DesktopColumn3.jsx'
import DesktopClubs from './DesktopClubs.jsx'
import { useExpandDim } from './lib/useExpandDim.js'
import { SPACE } from './lib/spacing.js'

/** Desktop (>=1024px) layout — one continuous scrollable page: a
    three-column dashboard grid (the header is the first item of column
    1's own stack, not a separate row — see DesktopColumn1) and a
    full-width Clubs band below it. No tab bar, no sheets, no Liquid
    Glass (flat/solid soft-shadow cards, per Batch 8) — this is a second,
    independent layout, not a replacement for the mobile one, which
    App.jsx renders unchanged below 1024px.

    Batch 10: exactly one grid row now (3 auto-placed columns, no
    gridColumn bookkeeping needed), with `align-items: stretch` (the
    grid default) so columns 1 and 3 stretch to match column 2's natural
    height — the reference height, since Calendar's grid is a large
    fixed element — and one shared useExpandDim() hook drives all three
    expand-in-place interactions (Ask Clark, Briefing, Calendar)
    identically instead of three one-off implementations. */
export default function DesktopApp({ onOpenSettings, onLock }) {
  const { isExpanded, isDimmed, toggle, collapse } = useExpandDim()

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.column,
        padding: `${SPACE.section}px 32px 32px`,
      }}>
        <DesktopColumn1
          onOpenSettings={onOpenSettings}
          onLock={onLock}
          askExpanded={isExpanded('ask')}
          onToggleAsk={() => toggle('ask')}
          onCloseAsk={collapse}
          dimmed={isDimmed(['ask'])}
          onDismiss={collapse}
        />
        <DesktopColumn2
          briefingExpanded={isExpanded('briefing')}
          onToggleBriefing={() => toggle('briefing')}
          calendarExpanded={isExpanded('calendar')}
          onToggleCalendar={() => toggle('calendar')}
          dimmed={isDimmed(['briefing', 'calendar'])}
          onDismiss={collapse}
        />
        <DesktopColumn3
          dimmed={isDimmed([])}
          onDismiss={collapse}
        />
      </div>

      <DesktopClubs />
    </div>
  )
}
