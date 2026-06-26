const PRIORITIES = [
  { id: 'p1', title: 'Finish HOTA essay outline', meta: 'Due today', source: 'Canvas' },
  { id: 'p2', title: 'Post NHS blood-drive flyer to Instagram', meta: 'Before lunch', source: 'NHS' },
  { id: 'p3', title: 'Revise UNC supplemental essay', meta: 'Due Fri', source: 'College' },
  { id: 'p4', title: 'Bio IA — data analysis section', meta: 'Next Bio class', source: 'Canvas' },
  { id: 'p5', title: 'Email Spanish Club meeting reminder', meta: 'Tomorrow', source: 'Spanish' },
]

const ALL_TASKS = [
  { id: 't1', title: 'HOTA essay outline', cat: 'Class', tag: 'HOTA', due: 'Today', high: true },
  { id: 't2', title: 'Bio IA — data analysis', cat: 'Class', tag: 'Biology HL', due: 'Next class', high: true },
  { id: 't3', title: 'UNC supplemental — revise draft', cat: 'College', tag: 'College', due: 'Fri', high: true },
  { id: 't4', title: 'NHS blood-drive flyer → Instagram', cat: 'Club', tag: 'NHS', due: 'Today', high: true },
  { id: 't5', title: 'Spanish Club reminder email', cat: 'Club', tag: 'Spanish Club', due: 'Tomorrow', high: false },
  { id: 't6', title: 'Read Pachinko ch. 7–9', cat: 'Class', tag: 'IB Lang', due: 'Mon', high: false },
  { id: 't7', title: 'Collect prom venue quotes', cat: 'Club', tag: 'Senior Class', due: 'Wed', high: false },
  { id: 't8', title: 'Math AA — problem set 14', cat: 'Class', tag: 'Math AA', due: 'Next class', high: false },
]

const GRADES = [
  { id: 'g1', name: 'IB English: Lang & Lit', score: '6', pct: '92%', upd: 'Updated 2d ago', note: 'Paper 1 returned — strong analysis', ph: false },
  { id: 'g2', name: 'History of the Americas', score: '5', pct: '87%', upd: 'Updated today', note: 'Essay rubric feedback posted', ph: false },
  { id: 'g3', name: 'Math: Analysis & Approaches', score: '6', pct: '90%', upd: 'Updated 4d ago', note: '', ph: false },
  { id: 'g4', name: 'Biology HL', score: '5', pct: '85%', upd: 'Updated 1d ago', note: 'IA draft due next class', ph: false },
  { id: 'g5', name: 'Theory of Knowledge', score: 'A', pct: '', upd: 'Updated 1w ago', note: 'Exhibition on track', ph: false },
  { id: 'g6', name: 'Cape Fear CC — Course I', score: '—', pct: '', upd: 'No grade yet', note: 'Add a grade via brain dump', ph: true },
  { id: 'g7', name: 'Cape Fear CC — Course II', score: '—', pct: '', upd: 'No grade yet', note: 'Add a grade via brain dump', ph: true },
]

const EMAILS = [
  { id: 'e1', from: 'Ms. Reyes · IB Coordinator', init: 'R', time: '8:14 AM', subj: 'EE final submission — deadline moved', snippet: 'The Extended Essay final upload has moved to Monday. Please confirm your supervisor sign-off before then.' },
  { id: 'e2', from: 'Beta Club Secretary', init: 'B', time: 'Yesterday', subj: 'October service-hours form', snippet: 'Attaching the service-hours form for this month. VPs please review before the next meeting and flag discrepancies.' },
  { id: 'e3', from: 'Counseling Office', init: 'C', time: 'Mon', subj: 'Senior transcript request window open', snippet: 'Transcript requests for early-action applications are open in Naviance. Submit by Oct 20 to guarantee processing.' },
]

const CAL_EVENTS = new Set([12, 18, 22, 25, 26, 30])
const CAL_TODAY = 26
const CAL_FIRST_DOW = 1  // June 2026: June 1 = Monday
const CAL_DAYS = 30

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
      {children}
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 20, boxShadow: '0 1px 2px rgba(40,36,28,0.05)',
    }}>
      {children}
    </div>
  )
}

function CheckBox({ done, small = false }) {
  const size = small ? 19 : 20
  return done ? (
    <div style={{
      flexShrink: 0, width: size, height: size, borderRadius: 6,
      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginTop: small ? 0 : 1,
    }}>
      <svg width={small ? 11 : 12} height={small ? 11 : 12} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  ) : (
    <div style={{
      flexShrink: 0, width: size, height: size, borderRadius: 6,
      border: '1.6px solid var(--borderStrong)', marginTop: small ? 0 : 1,
    }}/>
  )
}

function DashboardCard({ checked, onToggle }) {
  return (
    <Card>
      {/* Schedule strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--cardAlt)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 14px',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--accentSoft)', color: 'var(--accentText)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>DAY</span>
          <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 19, fontWeight: 600, lineHeight: 1 }}>B</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Now · Period 2
          </div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 500, marginTop: 2, color: 'var(--text)' }}>
            History of the Americas
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accentText)', lineHeight: 1 }}>
            22<span style={{ fontSize: 11, fontWeight: 600 }}> min</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>til Bio HL</div>
        </div>
      </div>

      {/* AI Briefing */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Label>This morning</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--faint)' }}>
            <span style={{ fontSize: 11 }}>7:42 AM</span>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accentText)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 11a8 8 0 1 0-1 6"/>
                <path d="M20 4v5h-5"/>
              </svg>
            </div>
          </div>
        </div>
        <p style={{
          margin: 0,
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 15.5, lineHeight: 1.62, color: 'var(--text)', letterSpacing: '-0.003em',
        }}>
          Good morning. It's a B day — History of the Americas, Biology HL, then Spanish Club after school. Two things are time-sensitive: your HOTA essay outline is due by end of day, and the NHS blood-drive flyer should go up on Instagram before lunch. Your UNC supplemental is still a rough draft with a Friday deadline, so thirty focused minutes today would help. Everything else is on track.
        </p>
      </div>

      {/* Priorities */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Label>Priorities</Label>
          <div style={{ fontSize: 11, color: 'var(--faint)' }}>Reordered by Clark · 8m ago</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PRIORITIES.map(item => {
            const done = !!checked[item.id]
            return (
              <div key={item.id} onClick={() => onToggle(item.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 2px', cursor: 'pointer' }}>
                <CheckBox done={done} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--faint)' : 'var(--text)' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.meta}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1.5px 7px', borderRadius: 999, background: 'var(--accentSoft)', color: 'var(--accentText)' }}>
                      {item.source}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function BrainDumpCard() {
  return (
    <Card>
      <Label>Brain Dump</Label>
      <div style={{
        marginTop: 12, background: 'var(--cardAlt)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, minHeight: 92,
      }}>
        <div style={{ fontSize: 14.5, color: 'var(--faint)', lineHeight: 1.5 }}>
          Tell Clark anything — "Bio notes are due next class," "Got an 88 on the HOTA essay," "Remind the Spanish Club about Thursday"…
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          Last parsed · 3 tasks, 1 grade<br />8:02 AM
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accentText)' }}>Hold to speak</span>
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'clarkPulse 2.4s ease-out infinite',
            }}/>
            <div style={{
              position: 'relative', width: 52, height: 52, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(86,141,179,0.35)', cursor: 'pointer',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/>
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function TasksCard({ filter, onFilter, checked, onToggle }) {
  const tasks = ALL_TASKS.filter(t =>
    filter === 'All' ? true : filter === 'Priority' ? t.high : t.cat === filter
  )

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label>Tasks</Label>
        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{tasks.length} active</div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
        {['All', 'Class', 'Club', 'Priority'].map(label => (
          <button
            key={label}
            onClick={() => onFilter(label)}
            style={{
              padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              background: label === filter ? 'var(--accent)' : 'transparent',
              color: label === filter ? '#fff' : 'var(--muted)',
              border: label === filter ? 'none' : '1px solid var(--border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
        {tasks.map(item => {
          const done = !!checked[item.id]
          return (
            <div key={item.id} onClick={() => onToggle(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '11px 2px', borderTop: '1px solid var(--border)', cursor: 'pointer',
            }}>
              <CheckBox done={done} small />
              <div style={{
                flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500,
                textDecoration: done ? 'line-through' : 'none',
                color: done ? 'var(--faint)' : 'var(--text)',
              }}>
                {item.title}
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: 'var(--cardAlt)', color: 'var(--muted)',
                border: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>
                {item.tag}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {item.due}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function CalendarCard() {
  const cells = []
  for (let i = 0; i < CAL_FIRST_DOW; i++) cells.push(null)
  for (let d = 1; d <= CAL_DAYS; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <Label>Calendar</Label>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>June 2026</div>
      </div>
      <div style={{ display: 'flex', marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--faint)' }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex' }}>
          {week.map((day, di) => {
            const isToday = day === CAL_TODAY
            const hasEvent = day != null && CAL_EVENTS.has(day) && !isToday
            const isEvent = day != null && CAL_EVENTS.has(day)
            return (
              <div key={di} style={{ flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {day != null && (
                  <>
                    <div style={isToday ? {
                      width: 30, height: 30, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff',
                    } : isEvent ? {
                      width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12.5, fontWeight: 600, color: 'var(--accentText)',
                    } : {
                      width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12.5, fontWeight: 500, color: 'var(--text)',
                    }}>
                      {day}
                    </div>
                    {hasEvent && (
                      <div style={{
                        position: 'absolute', bottom: 4,
                        width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
                      }}/>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </Card>
  )
}

function GradesCard() {
  return (
    <Card>
      <div style={{ marginBottom: 6 }}>
        <Label>Grades</Label>
      </div>
      {GRADES.map(g => (
        <div key={g.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '13px 0', borderTop: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 500, lineHeight: 1.25, color: 'var(--text)' }}>
              {g.name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{g.upd}</div>
            {g.note && (
              <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3, fontStyle: 'italic' }}>"{g.note}"</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: g.ph ? 22 : 25, fontWeight: g.ph ? 500 : 600,
              color: g.ph ? 'var(--faint)' : 'var(--accentText)', lineHeight: 1,
            }}>
              {g.score}
            </div>
            {g.pct && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{g.pct}</div>}
          </div>
        </div>
      ))}
    </Card>
  )
}

function InboxCard() {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Label>Inbox</Label>
        <div style={{ fontSize: 11, color: 'var(--faint)' }}>via Gmail</div>
      </div>
      {EMAILS.map(m => (
        <div key={m.id} style={{ padding: '14px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--accentSoft)', color: 'var(--accentText)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {m.init}
            </div>
            <div style={{
              flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: 'var(--text)',
            }}>
              {m.from}
            </div>
            <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{m.time}</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9, color: 'var(--text)' }}>{m.subj}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{m.snippet}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 11 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: '#fff',
              background: 'var(--accent)', padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4L19 9l-4-4L4 16v4z"/>
                <path d="M14 6l4 4"/>
              </svg>
              Draft reply
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accentText)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7"/>
              </svg>
              headers cleaned
            </span>
          </div>
        </div>
      ))}
    </Card>
  )
}

export default function TodayScreen({ checked, filter, onToggle, onFilter, onCloseQuick }) {
  return (
    <div onClick={onCloseQuick} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 18px' }}>
      <DashboardCard checked={checked} onToggle={onToggle} />
      <BrainDumpCard />
      <TasksCard filter={filter} onFilter={onFilter} checked={checked} onToggle={onToggle} />
      <CalendarCard />
      <GradesCard />
      <InboxCard />
    </div>
  )
}
