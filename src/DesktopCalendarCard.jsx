import { useState, useMemo, useRef, useEffect } from 'react'
import { useTasks } from './hooks/useTasks.js'
import { useClubs } from './hooks/useClubs.js'
import { useSchedule } from './hooks/useSchedule.js'
import { buildMonthData, monthGrid, dayDots, todayISO } from './lib/calendar.js'
import { DayAgenda } from './calendarShared.jsx'
import { MonthArrow } from './CalendarCard.jsx'
import { triggerHaptic } from './lib/haptics.js'

function clarkYearMonth() {
  const [y, m] = todayISO().split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

/** Desktop's Calendar card — same underlying month/day-detail logic
    (buildMonthData, which already sorts tests/others by the Tasks-card
    priority order on each date's deadline-logic date) as the mobile
    Calendar tab. Clicking a date expands an in-flow accordion below the
    month grid showing that date's full agenda — same max-height/
    scrollHeight transition pattern as mobile's BriefingSection — which
    grows this card's own height in normal document flow, pushing Grades
    further down column 2. No overlay, no absolute positioning, no
    dimming of anything.

    `expanded`/`onToggleExpand` are controlled props, driven by the
    mutual-exclusion accordion hook in DesktopApp.jsx, so expanding this
    collapses Briefing if it was open (and vice versa). */
export default function DesktopCalendarCard({ expanded, onToggleExpand }) {
  const { tasks } = useTasks()
  const { clubs } = useClubs()
  const { settings } = useSchedule()
  const [{ year, monthIndex }, setMonth] = useState(clarkYearMonth)
  const [selectedISO, setSelectedISO] = useState(todayISO())
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(0)

  const today = todayISO()
  const monthData = useMemo(
    () => buildMonthData({ year, monthIndex, tasks, clubs, settings }),
    [year, monthIndex, tasks, clubs, settings],
  )
  const weeks = useMemo(() => monthGrid(year, monthIndex), [year, monthIndex])

  useEffect(() => {
    if (!expanded || !contentRef.current) { setMaxHeight(0); return }
    setMaxHeight(contentRef.current.scrollHeight + 8)
    document.fonts?.ready?.then(() => {
      if (contentRef.current) setMaxHeight(contentRef.current.scrollHeight + 8)
    })
  }, [expanded, selectedISO, monthData])

  const shiftMonth = (delta) => {
    setMonth(prev => {
      const next = new Date(Date.UTC(prev.year, prev.monthIndex + delta, 1))
      return { year: next.getUTCFullYear(), monthIndex: next.getUTCMonth() }
    })
  }

  const monthLabel = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'long', year: 'numeric',
  })
  const isoFor = (day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div style={{ background: 'var(--card)', border: 'var(--card-border)', borderRadius: 22, boxShadow: 'var(--card-shadow)', padding: 20, boxSizing: 'border-box' }}>
      <div onClick={() => { triggerHaptic(); onToggleExpand() }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
          Calendar
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MonthArrow dir="prev" onClick={() => shiftMonth(-1)} />
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 500, color: 'var(--text)', minWidth: 118, textAlign: 'center' }}>
            {monthLabel}
          </div>
          <MonthArrow dir="next" onClick={() => shiftMonth(1)} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', marginBottom: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--faint)' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex' }}>
            {week.map((day, di) => {
              if (day == null) return <div key={di} style={{ flex: 1, height: 40 }} />
              const iso = isoFor(day)
              const isToday = iso === today
              const isSelected = expanded && iso === selectedISO
              const dots = dayDots(monthData.get(iso))
              return (
                <div
                  key={di}
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerHaptic()
                    setSelectedISO(iso)
                    if (!expanded) onToggleExpand()
                  }}
                  style={{
                    flex: 1, height: 40, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', paddingTop: 3,
                    background: isSelected ? 'var(--accentSoft)' : 'transparent', borderRadius: 10,
                  }}
                >
                  <div style={isToday
                    ? { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: '#fff' }
                    : { width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accentText)' : 'var(--text)' }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', gap: 2.5, height: 5, marginTop: 1.5 }}>
                    {dots.map((color, i) => (
                      <div key={i} style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: color }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ overflow: 'hidden', maxHeight, opacity: expanded ? 1 : 0, transition: 'max-height 0.25s ease, opacity 0.2s ease' }}>
        <div ref={contentRef} style={{ background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginTop: 16, boxSizing: 'border-box' }}>
          <DayAgenda iso={selectedISO} entry={monthData.get(selectedISO)} today={today} />
        </div>
      </div>
    </div>
  )
}
