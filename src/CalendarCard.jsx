import { useState, useMemo, useRef } from 'react'
import { useClubs } from './hooks/useClubs.js'
import { useSchedule } from './hooks/useSchedule.js'
import { buildMonthData, monthGrid, dayDots, todayISO } from './lib/calendar.js'
import Sheet from './Sheet.jsx'
import { DayAgenda } from './calendarShared.jsx'
import CalendarSheet from './CalendarSheet.jsx'

const SWIPE_THRESHOLD = 48

function clarkYearMonth() {
  const [y, m] = todayISO().split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

export default function CalendarCard({ tasks }) {
  const { clubs } = useClubs()
  const { settings } = useSchedule()
  const [{ year, monthIndex }, setMonth] = useState(clarkYearMonth)
  const [selectedISO, setSelectedISO] = useState(null)
  const [fullOpen, setFullOpen] = useState(false)
  const touch = useRef(null)

  const today = todayISO()
  const monthData = useMemo(
    () => buildMonthData({ year, monthIndex, tasks, clubs, settings }),
    [year, monthIndex, tasks, clubs, settings],
  )
  const weeks = useMemo(() => monthGrid(year, monthIndex), [year, monthIndex])

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

  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      shiftMonth(dx < 0 ? 1 : -1)
    }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: 20, boxShadow: '0 1px 2px rgba(40,36,28,0.05)' }}>
      <div onClick={() => setFullOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, cursor: 'pointer' }}>
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

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{ display: 'flex', marginBottom: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--faint)' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex' }}>
            {week.map((day, di) => {
              if (day == null) return <div key={di} style={{ flex: 1, height: 42 }} />
              const iso = isoFor(day)
              const isToday = iso === today
              const dots = dayDots(monthData.get(iso))
              return (
                <div
                  key={di}
                  onClick={() => setSelectedISO(iso)}
                  style={{ flex: 1, height: 42, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', paddingTop: 3 }}
                >
                  <div style={isToday
                    ? { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff' }
                    : { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>
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

      <Sheet variant="peek" open={!!selectedISO} onClose={() => setSelectedISO(null)} ariaLabel="Day details">
        {selectedISO && (
          <DayAgenda iso={selectedISO} entry={monthData.get(selectedISO)} today={today} />
        )}
      </Sheet>

      <Sheet variant="full" open={fullOpen} onClose={() => setFullOpen(false)} ariaLabel="Full calendar">
        {fullOpen && (
          <CalendarSheet initialYear={year} initialMonthIndex={monthIndex} tasks={tasks} clubs={clubs} settings={settings} />
        )}
      </Sheet>
    </div>
  )
}

export function MonthArrow({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
      style={{
        width: 26, height: 26, borderRadius: 8, padding: 0,
        background: 'var(--cardAlt)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)', cursor: 'pointer',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}


