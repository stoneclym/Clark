import { useState, useMemo } from 'react'
import { buildMonthData, monthGrid, dayDots, todayISO } from './lib/calendar.js'
import { DayAgenda } from './calendarShared.jsx'
import { MonthArrow } from './CalendarCard.jsx'

/** Full-calendar view rendered inside a near-fullscreen Sheet. Tapping a
    day expands it in place within the grid, instead of opening a popup. */
export default function CalendarSheet({ initialYear, initialMonthIndex, tasks, clubs, settings }) {
  const [{ year, monthIndex }, setMonth] = useState({ year: initialYear, monthIndex: initialMonthIndex })
  const [expandedISO, setExpandedISO] = useState(null)

  const today = todayISO()
  const monthData = useMemo(
    () => buildMonthData({ year, monthIndex, tasks, clubs, settings }),
    [year, monthIndex, tasks, clubs, settings],
  )
  const weeks = useMemo(() => monthGrid(year, monthIndex), [year, monthIndex])

  const shiftMonth = (delta) => {
    setExpandedISO(null)
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
    <div style={{ padding: '4px 20px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          Calendar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MonthArrow dir="prev" onClick={() => shiftMonth(-1)} />
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 500, color: 'var(--text)', minWidth: 118, textAlign: 'center' }}>
            {monthLabel}
          </div>
          <MonthArrow dir="next" onClick={() => shiftMonth(1)} />
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--faint)' }}>{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => {
        const weekHasExpanded = expandedISO != null && week.some(day => day != null && isoFor(day) === expandedISO)
        return (
          <div key={wi}>
            <div style={{ display: 'flex' }}>
              {week.map((day, di) => {
                if (day == null) return <div key={di} style={{ flex: 1, height: 46 }} />
                const iso = isoFor(day)
                const isToday = iso === today
                const isExpanded = iso === expandedISO
                const dots = dayDots(monthData.get(iso))
                return (
                  <div
                    key={di}
                    onClick={() => setExpandedISO(isExpanded ? null : iso)}
                    style={{
                      flex: 1, height: 46, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', paddingTop: 4,
                      background: isExpanded ? 'var(--accentSoft)' : 'transparent', borderRadius: 12,
                    }}
                  >
                    <div style={isToday
                      ? { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff' }
                      : { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: isExpanded ? 700 : 500, color: isExpanded ? 'var(--accentText)' : 'var(--text)' }}>
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
            {weekHasExpanded && (
              <div style={{ background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', margin: '6px 0 10px' }}>
                <DayAgenda iso={expandedISO} entry={monthData.get(expandedISO)} today={today} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
