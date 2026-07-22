import { sentenceCaseTaskTitle } from './lib/taskTitles.js'
import { getTaskDateInfo, OVERDUE_COLOR } from './lib/taskDates.js'
import { taskKind, DOT_COLORS } from './lib/calendar.js'

export function Dot({ color }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

export function SheetBlock({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

export function SheetTask({ task, today, iso }) {
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

/** Shared "what's due" content for a given date entry — used by both the
    quick-peek Sheet and the full-calendar in-grid expansion. */
export function DayAgenda({ iso, entry, today }) {
  const meetings = entry?.meetings ?? []
  const tests = entry?.tests ?? []
  const others = entry?.others ?? []
  const noSchool = entry?.dots?.noSchool
  const empty = !meetings.length && !tests.length && !others.length

  const dateLabel = new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div>
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
  )
}
