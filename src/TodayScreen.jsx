import { useState } from 'react'
import { useTasks } from './hooks/useTasks.js'
import { useGrades } from './hooks/useGrades.js'
import { useEmails } from './hooks/useEmails.js'
import { useSchedule } from './hooks/useSchedule.js'
import { useBriefing } from './hooks/useBriefing.js'
import { supabase } from './lib/supabase.js'

// ─── Calendar config ───────────────────────────────────────────
const CAL_TODAY = new Date().getDate()
const CAL_MONTH = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const CAL_FIRST_DOW = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()
const CAL_DAYS = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
const CAL_EVENTS = new Set([12, 18, 22, 25, 26, 30]) // populated from tasks in real use

// ─── Shared UI primitives ──────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
      {children}
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: 20, boxShadow: '0 1px 2px rgba(40,36,28,0.05)' }}>
      {children}
    </div>
  )
}

function CheckBox({ done, small = false }) {
  const size = small ? 19 : 20
  return done ? (
    <div style={{ flexShrink: 0, width: size, height: size, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: small ? 0 : 1 }}>
      <svg width={small ? 11 : 12} height={small ? 11 : 12} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  ) : (
    <div style={{ flexShrink: 0, width: size, height: size, borderRadius: 6, border: '1.6px solid var(--borderStrong)', marginTop: small ? 0 : 1 }}/>
  )
}

// ─── Dashboard Card ─────────────────────────────────────────────
function DashboardCard({ priorities, toggleTask }) {
  const { dayType, currentPeriod, dateLabel } = useSchedule()
  const { briefing, generating, generate } = useBriefing()

  const periodDisplay = currentPeriod
    ? { label: currentPeriod.status === 'now' ? `Now · ${currentPeriod.period}` : `Next · ${currentPeriod.period}`, name: currentPeriod.className, time: currentPeriod.remaining, next: currentPeriod.nextClass }
    : { label: 'No class right now', name: 'Free period', time: '', next: null }

  const briefingText = briefing?.content || 'Good morning. Tap the refresh button to generate your morning briefing.'

  return (
    <Card>
      {/* Schedule strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--accentSoft)', color: 'var(--accentText)', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>DAY</span>
          <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 19, fontWeight: 600, lineHeight: 1 }}>{dayType || '—'}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{periodDisplay.label}</div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 500, marginTop: 2, color: 'var(--text)' }}>{periodDisplay.name}</div>
        </div>
        {periodDisplay.time && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accentText)', lineHeight: 1 }}>{periodDisplay.time}</div>
            {periodDisplay.next && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>til {periodDisplay.next}</div>}
          </div>
        )}
      </div>

      {/* AI Briefing */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Label>This morning</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--faint)' }}>
            {briefing && <span style={{ fontSize: 11 }}>{new Date(briefing.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
            <button onClick={generate} disabled={generating} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accentText)', background: 'none', border: 'none', padding: 0, opacity: generating ? 0.5 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }}>
                <path d="M20 11a8 8 0 1 0-1 6"/>
                <path d="M20 4v5h-5"/>
              </svg>
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15.5, lineHeight: 1.62, color: 'var(--text)', letterSpacing: '-0.003em' }}>
          {briefingText}
        </p>
      </div>

      {/* Priorities */}
      {priorities.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label>Priorities</Label>
            <div style={{ fontSize: 11, color: 'var(--faint)' }}>Reordered by Clark</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {priorities.map(item => (
              <div key={item.id} onClick={() => toggleTask(item.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 2px', cursor: 'pointer' }}>
                <CheckBox done={item.done} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--faint)' : 'var(--text)' }}>{item.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.due_date}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1.5px 7px', borderRadius: 999, background: 'var(--accentSoft)', color: 'var(--accentText)' }}>{item.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Brain Dump Card ────────────────────────────────────────────
function BrainDumpCard({ onParsed }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null) // null | 'parsing' | 'done' | 'error'
  const [lastResult, setLastResult] = useState(null)

  const parse = async () => {
    if (!text.trim()) return
    setStatus('parsing')
    try {
      const { data, error } = await supabase.functions.invoke('parse-brain-dump', {
        body: { text },
      })
      if (error) throw error
      setLastResult(data?.parsed)
      setStatus('done')
      setText('')
      onParsed?.()
    } catch {
      setStatus('error')
    }
  }

  const taskCount = lastResult?.tasks?.length || 0
  const gradeCount = lastResult?.grades?.length || 0
  const summary = status === 'done' && lastResult
    ? `Parsed · ${[taskCount && `${taskCount} task${taskCount > 1 ? 's' : ''}`, gradeCount && `${gradeCount} grade${gradeCount > 1 ? 's' : ''}`].filter(Boolean).join(', ')}`
    : 'Use your keyboard mic for voice, or type it out'

  return (
    <Card>
      <Label>Brain Dump</Label>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setStatus(null) }}
        placeholder={'Tell Clark anything — "Bio notes are due next class," "Got an 88 on the HOTA essay," "Remind the Spanish Club about Thursday"…'}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') parse() }}
        style={{
          display: 'block', width: '100%', marginTop: 12,
          background: 'var(--cardAlt)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16, minHeight: 92, resize: 'none',
          fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          fontSize: 14.5, color: text ? 'var(--text)' : 'var(--faint)',
          lineHeight: 1.5, outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <div style={{ fontSize: 11.5, color: status === 'error' ? '#E05252' : 'var(--muted)', lineHeight: 1.4 }}>
          {status === 'parsing' ? 'Parsing…' : status === 'error' ? 'Something went wrong — try again' : summary}
        </div>
        <button
          onClick={parse}
          disabled={!text.trim() || status === 'parsing'}
          style={{
            fontSize: 13, fontWeight: 600, color: text.trim() ? 'var(--accentText)' : 'var(--faint)',
            background: 'var(--accentSoft)', border: 'none', borderRadius: 10,
            cursor: text.trim() ? 'pointer' : 'default', padding: '8px 16px',
            fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          {status === 'parsing' ? 'Sending…' : 'Send'}
        </button>
      </div>
    </Card>
  )
}

// ─── Tasks Card ─────────────────────────────────────────────────
function TasksCard({ tasks, toggleTask, filter, onFilter }) {
  const filtered = tasks.filter(t =>
    filter === 'All' ? true : filter === 'Priority' ? t.priority : t.category === filter
  )

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label>Tasks</Label>
        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{filtered.length} active</div>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
        {['All', 'Class', 'Club', 'Priority'].map(label => (
          <button key={label} onClick={() => onFilter(label)} style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: label === filter ? 'var(--accent)' : 'transparent', color: label === filter ? '#fff' : 'var(--muted)', border: label === filter ? 'none' : '1px solid var(--border)' }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
        {filtered.map(item => (
          <div key={item.id} onClick={() => toggleTask(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 2px', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
            <CheckBox done={item.done} small />
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--faint)' : 'var(--text)' }}>{item.title}</div>
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--cardAlt)', color: 'var(--muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{item.tag}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.due_date}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Calendar Card ───────────────────────────────────────────────
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
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{CAL_MONTH}</div>
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
                    <div style={isToday ? { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff' }
                      : isEvent ? { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--accentText)' }
                      : { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>
                      {day}
                    </div>
                    {hasEvent && <div style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }}/>}
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

// ─── Grades Card ─────────────────────────────────────────────────
const FORMAL_GRADE_NAMES = {
  'history of the americas': 'IB History of the Americas',
  hota: 'IB History of the Americas',
  'biology hl': 'IB Biology',
  biology: 'IB Biology',
  bio: 'IB Biology',
  'theory of knowledge': 'IB Theory of Knowledge',
  tok: 'IB Theory of Knowledge',
  'ib english: lang and lit': 'IB Language and Literature',
  'ib english lang lit': 'IB Language and Literature',
  'ib language and literature': 'IB Language and Literature',
  'language and literature': 'IB Language and Literature',
  'math: analysis and approaches': 'IB Applications and Interpretations',
  'math analysis and approaches': 'IB Applications and Interpretations',
  'ib applications and interpretations': 'IB Applications and Interpretations',
  'applications and interpretations': 'IB Applications and Interpretations',
}

const FORMAL_GRADE_ORDER = [
  'IB History of the Americas',
  'IB Biology',
  'IB Theory of Knowledge',
  'IB Language and Literature',
  'IB Applications and Interpretations',
]

function normalizeClassName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
}

function gradeDisplayName(className) {
  return FORMAL_GRADE_NAMES[normalizeClassName(className)] || null
}

function gradeNumber(percentage) {
  const value = String(percentage || '').match(/\d+(?:\.\d+)?/)
  return value ? value[0] : '—'
}

function GradesCard() {
  const { grades } = useGrades()
  const formattedGrades = grades
    .map(g => ({ ...g, displayName: gradeDisplayName(g.class_name), gradeNumber: gradeNumber(g.percentage) }))
    .filter(g => g.displayName)
    .sort((a, b) => FORMAL_GRADE_ORDER.indexOf(a.displayName) - FORMAL_GRADE_ORDER.indexOf(b.displayName))

  return (
    <Card>
      <div style={{ marginBottom: 6 }}><Label>Grades</Label></div>
      {formattedGrades.map(g => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 500, lineHeight: 1.25, color: 'var(--text)' }}>{g.displayName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
              {g.last_updated ? `Updated ${new Date(g.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No grade yet'}
            </div>
            {g.note && <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3, fontStyle: 'italic' }}>"{g.note}"</div>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 25, fontWeight: 600, color: '#568db3', lineHeight: 1 }}>
              {g.gradeNumber}
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── Inbox Card ──────────────────────────────────────────────────
function InboxCard() {
  const { emails, draftReply } = useEmails()
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState({})
  const [syncing, setSyncing] = useState(false)

  const handleDraftReply = async (emailId) => {
    if (drafts[emailId]) { setDrafts(d => ({ ...d, [emailId]: null })); return }
    setLoading(l => ({ ...l, [emailId]: true }))
    try {
      const draft = await draftReply(emailId)
      setDrafts(d => ({ ...d, [emailId]: draft }))
    } finally {
      setLoading(l => ({ ...l, [emailId]: false }))
    }
  }

  const syncOutlook = async () => {
    setSyncing(true)
    try {
      await supabase.functions.invoke('sync-outlook')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Label>Inbox</Label>
        <button
          onClick={syncOutlook}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, color: 'var(--accentText)',
            background: 'var(--accentSoft)', border: 'none', borderRadius: 7,
            padding: '4px 9px', cursor: syncing ? 'default' : 'pointer',
            fontFamily: 'inherit', opacity: syncing ? 0.6 : 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {syncing ? 'Syncing…' : 'Sync Outlook'}
        </button>
      </div>
      {emails.map(m => (
        <div key={m.id} style={{ padding: '14px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accentSoft)', color: 'var(--accentText)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{m.initials}</div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{m.from_name}</div>
            <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{new Date(m.received_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9, color: 'var(--text)' }}>{m.subject}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{m.snippet}</div>
          {drafts[m.id] && (
            <div style={{ marginTop: 11, background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
              {drafts[m.id]}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 11 }}>
            <div onClick={() => handleDraftReply(m.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent)', padding: '7px 12px', borderRadius: 9, cursor: 'pointer', opacity: loading[m.id] ? 0.6 : 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>
              {loading[m.id] ? 'Drafting…' : drafts[m.id] ? 'Hide draft' : 'Draft reply'}
            </div>
            {m.headers_cleaned && (
              <span style={{ fontSize: 10.5, color: 'var(--faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accentText)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
                headers cleaned
              </span>
            )}
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── Screen ──────────────────────────────────────────────────────
export default function TodayScreen({ filter, onFilter, onCloseQuick }) {
  const { tasks, priorities, toggleTask, refetch } = useTasks()

  return (
    <div onClick={onCloseQuick} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 18px' }}>
      <DashboardCard priorities={priorities} toggleTask={toggleTask} />
      <BrainDumpCard onParsed={refetch} />
      <TasksCard tasks={tasks} toggleTask={toggleTask} filter={filter} onFilter={onFilter} />
      <CalendarCard />
      <GradesCard />
      <InboxCard />
    </div>
  )
}
