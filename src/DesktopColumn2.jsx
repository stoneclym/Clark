import { GradesCard } from './TodayScreen.jsx'
import DesktopScheduleCard from './DesktopScheduleCard.jsx'
import DesktopCalendarCard from './DesktopCalendarCard.jsx'

/** Column 2 — Schedule/Briefing (Briefing overlays instead of pushing
    Calendar/Grades down, see DesktopScheduleCard), Calendar (expands
    downward to fill the space Grades normally occupies), Grades (hidden
    while Calendar is expanded). */
export default function DesktopColumn2({ calendarExpanded, onToggleCalendar, dimmed, onDismiss }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <DesktopScheduleCard />
      <DesktopCalendarCard expanded={calendarExpanded} onToggleExpand={onToggleCalendar} />
      {!calendarExpanded && <GradesCard />}

      {dimmed && (
        <div
          onClick={onDismiss}
          style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,0.35)', borderRadius: 22, transition: 'opacity var(--spring)', cursor: 'pointer' }}
        />
      )}
    </div>
  )
}
