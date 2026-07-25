import { useRef, useEffect } from 'react'
import { GradesCard } from './TodayScreen.jsx'
import DesktopScheduleCard from './DesktopScheduleCard.jsx'
import DesktopCalendarCard from './DesktopCalendarCard.jsx'
import { SPACE } from './lib/spacing.js'

/** Column 2 — Schedule/Briefing, Calendar, Grades. This is the reference
    height for the whole row (Calendar's grid is a large fixed element,
    so this column is naturally the tallest). Its own rendered height is
    measured (ResizeObserver) and reported up via `onHeightChange` so
    DesktopApp can hand columns 1 and 3 that exact pixel height — CSS
    Grid's align-items: stretch alone isn't enough here, since a flex
    filler's height:100% inside a grid item creates a circular sizing
    dependency that lets uncapped content (e.g. Inbox's full email list)
    inflate the row's auto-computed height instead of scrolling within
    it. An explicit measured height breaks that cycle.

    Briefing and Calendar are in-flow accordions (own max-height
    transitions inside DesktopScheduleCard/DesktopCalendarCard) — no
    overlay, no absolute positioning, no dimming. Expanding either one
    simply grows that card's own height in normal block flow, which
    pushes Calendar/Grades further down the column exactly like any
    other content getting taller would. Grades always stays mounted and
    visible; it's just pushed down rather than hidden.

    Outside-click-to-collapse: while either card is expanded, a
    document-level mousedown listener collapses it if the click lands
    outside BOTH cards' own DOM nodes (scheduleRef and calendarRef) —
    not just outside whichever one is currently expanded. Clicking the
    *other* card's own trigger (e.g. a date on a collapsed Calendar
    while Briefing is expanded) must be left entirely to that card's own
    onClick, which already switches the mutual-exclusion key atomically;
    collapsing on mousedown first (before that click fires) would shrink
    Briefing and shift the layout under the pointer between mousedown
    and mouseup, so the click could land on whatever scrolled into that
    spot instead of the date the user meant to hit. Only clicks that
    land somewhere else entirely (column 1, column 3, blank space, etc)
    should trigger this fallback collapse. */
export default function DesktopColumn2({ briefingExpanded, onToggleBriefing, calendarExpanded, onToggleCalendar, onCollapse, onHeightChange }) {
  const columnRef = useRef(null)
  const scheduleRef = useRef(null)
  const calendarRef = useRef(null)

  useEffect(() => {
    if (!columnRef.current || !onHeightChange) return
    const el = columnRef.current
    const measure = () => onHeightChange(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeightChange])

  useEffect(() => {
    if (!briefingExpanded && !calendarExpanded) return
    const handlePointerDown = (e) => {
      const insideSchedule = scheduleRef.current?.contains(e.target)
      const insideCalendar = calendarRef.current?.contains(e.target)
      if (!insideSchedule && !insideCalendar) onCollapse()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [briefingExpanded, calendarExpanded, onCollapse])

  return (
    <div ref={columnRef} style={{ display: 'flex', flexDirection: 'column', gap: SPACE.card, minWidth: 0 }}>
      <div ref={scheduleRef}>
        <DesktopScheduleCard expanded={briefingExpanded} onToggleExpand={onToggleBriefing} />
      </div>
      <div ref={calendarRef}>
        <DesktopCalendarCard expanded={calendarExpanded} onToggleExpand={onToggleCalendar} />
      </div>
      <GradesCard />
    </div>
  )
}
