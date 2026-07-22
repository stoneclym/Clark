import { useState } from 'react'
import { useTasks } from './hooks/useTasks.js'
import { useClubs } from './hooks/useClubs.js'
import { useSchedule } from './hooks/useSchedule.js'
import CalendarSheet from './CalendarSheet.jsx'
import { todayISO } from './lib/calendar.js'

/** The Calendar tab — same content/logic as the near-fullscreen sheet
    from Batch 2 (day-detail panel below a static grid), now a standalone
    page instead of something opened from Today. */
export default function CalendarScreen() {
  const { tasks } = useTasks()
  const { clubs } = useClubs()
  const { settings } = useSchedule()
  const [{ year, monthIndex }] = useState(() => {
    const [y, m] = todayISO().split('-').map(Number)
    return { year: y, monthIndex: m - 1 }
  })

  return (
    <div style={{ padding: '16px 0 18px' }}>
      <CalendarSheet
        initialYear={year}
        initialMonthIndex={monthIndex}
        tasks={tasks}
        clubs={clubs}
        settings={settings}
      />
    </div>
  )
}
