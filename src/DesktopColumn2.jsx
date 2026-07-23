import { useState, useRef, useEffect } from 'react'
import { GradesCard } from './TodayScreen.jsx'
import DesktopScheduleCard from './DesktopScheduleCard.jsx'
import DesktopCalendarCard from './DesktopCalendarCard.jsx'
import { SPACE } from './lib/spacing.js'

const FALLBACK_FILL_HEIGHT = 340

/** Column 2 — Schedule/Briefing, Calendar, Grades. This is the reference
    height for the whole row (Calendar's grid is a large fixed element,
    so this column is naturally the tallest). Its own rendered height is
    measured (ResizeObserver) and reported up via `onHeightChange` so
    DesktopApp can hand columns 1 and 3 that exact pixel height — CSS
    Grid's align-items: stretch alone isn't enough here, since a flex
    filler's height:100% inside a grid item creates a circular sizing
    dependency that lets uncapped content (e.g. Inbox's full email list)
    inflate the row's auto-computed height instead of scrolling within
    it. An explicit measured height breaks that cycle. Nothing in this
    column needs to grow to fill extra space itself.

    Grades' rendered height is measured (ResizeObserver) so that when
    Calendar expands and Grades disappears, the day-detail panel can fill
    almost exactly the space Grades used to occupy, keeping this
    column's total height essentially unchanged either way. */
export default function DesktopColumn2({ briefingExpanded, onToggleBriefing, calendarExpanded, onToggleCalendar, dimmed, onDismiss, onHeightChange }) {
  const columnRef = useRef(null)
  const gradesRef = useRef(null)
  const [gradesHeight, setGradesHeight] = useState(FALLBACK_FILL_HEIGHT)

  useEffect(() => {
    if (!gradesRef.current) return
    const el = gradesRef.current
    const measure = () => setGradesHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!columnRef.current || !onHeightChange) return
    const el = columnRef.current
    const measure = () => onHeightChange(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeightChange])

  return (
    <div ref={columnRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: SPACE.card }}>
      <DesktopScheduleCard expanded={briefingExpanded} onToggleExpand={onToggleBriefing} />
      <DesktopCalendarCard expanded={calendarExpanded} onToggleExpand={onToggleCalendar} fillHeight={gradesHeight} />
      {!calendarExpanded && (
        <div ref={gradesRef}>
          <GradesCard />
        </div>
      )}

      {dimmed && (
        <div
          onClick={onDismiss}
          style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,0.35)', borderRadius: 22, transition: 'opacity var(--spring)', cursor: 'pointer' }}
        />
      )}
    </div>
  )
}
