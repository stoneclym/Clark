import { useRef, useEffect, useState } from 'react'
import { GradesCard } from './TodayScreen.jsx'
import DesktopScheduleCard from './DesktopScheduleCard.jsx'
import DesktopCalendarCard from './DesktopCalendarCard.jsx'
import { SPACE } from './lib/spacing.js'

const FALLBACK_COLUMN_HEIGHT = 700

/** Column 2 — Schedule/Briefing, Calendar, Grades. The dashboard's max
    height is fixed at this column's own COLLAPSED (baseline) height —
    Briefing collapsed + Calendar's month grid + Grades — never the
    taller height either accordion reaches while expanded. Columns 1
    and 3 (Tasks, Inbox) are pinned to that same fixed baseline via
    `onHeightChange` (see DesktopApp.jsx) so they never grow past where
    Grades bottoms out, even while Briefing/Calendar are expanded.

    Briefing and Calendar expand as absolutely-positioned overlays
    anchored to their own card (each card's own outer element is
    `position: relative` — see DesktopScheduleCard.jsx/
    DesktopCalendarCard.jsx), so expanding never changes this column's
    own flow height — that's what keeps the baseline measurement stable
    without needing to freeze anything mid-animation. Each overlay's
    height animates from 0 up to a precomputed pixel target that always
    reaches exactly the bottom of the baseline column (i.e. where Grades
    ends) — never content-sized, so it reaches full depth even with
    little text — hiding whatever sits below the expanding card (Grades,
    and for Briefing, Calendar too, since Briefing sits above both).
    Grades unmounts while either is expanded (truly hidden, not merely
    covered) and remounts on collapse.

    The measurement effect only runs while both are collapsed: since
    expanding never changes flow height in principle, this is mostly
    belt-and-suspenders, but it also means Grades unmounting the instant
    something expands can't itself feed back into the target height.

    Outside-click-to-collapse: while either card is expanded, a
    document-level mousedown listener collapses it if the click lands
    outside BOTH cards' own DOM nodes (scheduleRef and calendarRef) —
    not just outside whichever one is currently expanded. Clicking the
    *other* card's own trigger (e.g. a date on a collapsed Calendar
    while Briefing is expanded) must be left entirely to that card's own
    onClick, which already switches the mutual-exclusion key atomically;
    collapsing on mousedown first (before that click fires) would shift
    the layout under the pointer between mousedown and mouseup, so the
    click could land on whatever scrolled into that spot instead of the
    date the user meant to hit. Only clicks that land somewhere else
    entirely (column 1, column 3, blank space, etc) trigger this
    fallback collapse. */
export default function DesktopColumn2({ briefingExpanded, onToggleBriefing, calendarExpanded, onToggleCalendar, onCollapse, onHeightChange }) {
  const columnRef = useRef(null)
  const scheduleRef = useRef(null)
  const calendarRef = useRef(null)
  const [baseline, setBaseline] = useState({
    columnHeight: FALLBACK_COLUMN_HEIGHT,
    scheduleOverlayHeight: 0,
    calendarOverlayHeight: 0,
  })

  const expanded = briefingExpanded || calendarExpanded

  useEffect(() => {
    if (expanded || !columnRef.current) return
    const measure = () => {
      const columnHeight = columnRef.current.getBoundingClientRect().height
      const scheduleBottom = scheduleRef.current ? scheduleRef.current.offsetTop + scheduleRef.current.offsetHeight : 0
      const calendarBottom = calendarRef.current ? calendarRef.current.offsetTop + calendarRef.current.offsetHeight : 0
      setBaseline({
        columnHeight,
        scheduleOverlayHeight: Math.max(0, columnHeight - scheduleBottom - SPACE.card),
        calendarOverlayHeight: Math.max(0, columnHeight - calendarBottom - SPACE.card),
      })
      onHeightChange?.(columnHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(columnRef.current)
    return () => ro.disconnect()
  }, [expanded, onHeightChange])

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
    <div ref={columnRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: SPACE.card, minWidth: 0 }}>
      <div ref={scheduleRef}>
        <DesktopScheduleCard expanded={briefingExpanded} onToggleExpand={onToggleBriefing} overlayHeight={baseline.scheduleOverlayHeight} />
      </div>
      <div ref={calendarRef}>
        <DesktopCalendarCard expanded={calendarExpanded} onToggleExpand={onToggleCalendar} overlayHeight={baseline.calendarOverlayHeight} />
      </div>
      {!expanded && <GradesCard />}
    </div>
  )
}
