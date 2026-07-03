import { useState, useMemo, useRef } from 'react'
import { useClubs } from './hooks/useClubs.js'
import { useSchedule } from './hooks/useSchedule.js'
import { sentenceCaseTaskTitle } from './lib/taskTitles.js'
import { getTaskDateInfo, OVERDUE_COLOR } from './lib/taskDates.js'
import { buildMonthData, monthGrid, dayDots, taskKind, todayISO, DOT_COLORS } from './lib/calendar.js'

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
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

      {selectedISO && (
        <DaySheet
          iso={selectedISO}
          entry={monthData.get(selectedISO)}
          today={today}
          onClose={() => setSelectedISO(null)}
        />
      )}
    </div>
  )
}

function MonthArrow({ dir, onClick }) {
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

// ─── Day detail bottom sheet ─────────────────────────────────────
function DaySheet({ iso, entry, today, onClose }) {
  const touch = useRef(null)

  const dateLabel = new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  })

  const meetings = entry?.meetings ?? []
  const tests = entry?.tests ?? []
  const others = entry?.others ?? []
  const noSchool = entry?.dots.noSchool
  const empty = !meetings.length && !tests.length && !others.length

  const onTouchStart = (e) => { touch.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dy = e.changedTouches[0].clientY - touch.current
    touch.current = null
    if (dy > SWIPE_THRESHOLD) onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(20,18,14,0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          background: 'var(--card)', borderRadius: '22px 22px 0 0',
          padding: '10px 20px 30px', maxHeight: '70vh', overflowY: 'auto',
          boxShadow: '0 -6px 30px rgba(20,18,14,0.18)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Dismiss"
          style={{ display: 'flex', justifyContent: 'center', width: '100%', background: 'none', border: 'none', padding: '4px 0 10px', cursor: 'pointer', color: 'var(--faint)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            {dateLabel}
          </div>
          {noSchool && (
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: 'rgba(154,86,179,0.14)', color: DOT_COLORS.noSchool, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              No school
            </span>
          )}
        </div>

        {empty ? (
          <div style={{ fontSize: 13.5, color: 'var(--faint)', padding: '18px 0 8px', textAlign: 'center' }}>
            Nothing scheduled this day
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {meetings.length > 0 && (
              <SheetBlock title="Meetings" color={DOT_COLORS.meeting}>
                {meetings.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <Dot color={DOT_COLORS.meeting} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.clubName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{m.when}</div>
                    </div>
                  </div>
                ))}
              </SheetBlock>
            )}

            {tests.length > 0 && (
              <SheetBlock title="Tests" color={DOT_COLORS.due}>
                {tests.map(task => <SheetTask key={task.id} task={task} today={today} iso={iso} />)}
              </SheetBlock>
            )}

            {others.length > 0 && (
              <SheetBlock title="Due & to do" color={DOT_COLORS.due}>
                {others.map(task => <SheetTask key={task.id} task={task} today={today} iso={iso} />)}
              </SheetBlock>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SheetBlock({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function Dot({ color }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function SheetTask({ task, today, iso }) {
  const dateInfo = getTaskDateInfo(task)
  const overdue = iso < today
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <Dot color={overdue ? DOT_COLORS.overdue : DOT_COLORS.due} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
          {sentenceCaseTaskTitle(task.title)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11.5, color: overdue ? OVERDUE_COLOR : 'var(--muted)' }}>
            {overdue ? `Overdue · ${dateInfo.label}` : dateInfo.label}
          </span>
          {task.tag && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1.5px 7px', borderRadius: 999, background: 'var(--accentSoft)', color: 'var(--accentText)' }}>
              {task.tag}
            </span>
          )}
          {taskKind(task) === 'test' && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1.5px 7px', borderRadius: 999, background: 'rgba(86,141,179,0.12)', color: 'var(--accentText)' }}>
              Test
            </span>
          )}
        </div>
      </div>
      {task.priority && (
        <span style={{ fontSize: 12, color: 'var(--accentText)', flexShrink: 0 }}>★</span>
      )}
    </div>
  )
}
