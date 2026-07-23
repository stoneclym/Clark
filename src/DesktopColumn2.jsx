import { useTasks } from './hooks/useTasks.js'
import { DashboardCard, GradesCard } from './TodayScreen.jsx'
import DesktopCalendarCard from './DesktopCalendarCard.jsx'

/** Column 2 — Schedule/Briefing (unchanged, reused wholesale from mobile,
    Briefing already nests as a collapsible dropdown there), Calendar
    (expands downward into Grades' space), Grades (hidden while Calendar
    is expanded). */
export default function DesktopColumn2({ calendarExpanded, onToggleCalendar, dimmed }) {
  const { priorities, toggleTask } = useTasks()

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <DashboardCard priorities={priorities} toggleTask={toggleTask} />
      <DesktopCalendarCard expanded={calendarExpanded} onToggleExpand={onToggleCalendar} />
      {!calendarExpanded && <GradesCard />}

      {dimmed && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,0.35)', borderRadius: 22, transition: 'opacity var(--spring)' }} />
      )}
    </div>
  )
}
