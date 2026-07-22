import { useState, useRef, useEffect } from 'react'
import { useTasks } from './hooks/useTasks.js'
import { useGrades } from './hooks/useGrades.js'
import { useEmails } from './hooks/useEmails.js'
import { useSchedule } from './hooks/useSchedule.js'
import { useBriefing } from './hooks/useBriefing.js'
import { supabase } from './lib/supabase.js'
import { sentenceCaseTaskTitle } from './lib/taskTitles.js'
import { getTaskDateInfo, OVERDUE_COLOR } from './lib/taskDates.js'
import { normalizeClassLabel, CLASS_TAG_ORDER } from './lib/classNames.js'
import { timeOfDayLabel } from './lib/greeting.js'
import CalendarCard from './CalendarCard.jsx'
import TopPills from './TopPills.jsx'

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

function displayTaskTag(tag) {
  const value = String(tag || '').trim()
  if (!value || /^(overdue|late|past due|past-due|yesterday|today|tomorrow)$/i.test(value)) return ''
  return normalizeClassLabel(value) || ''
}

// ─── Briefing sub-card (nested inside DashboardCard) ─────────────
function BriefingSection({ briefing, generating, generate }) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(0)

  useEffect(() => {
    if (!expanded || !contentRef.current) { setMaxHeight(0); return }
    setMaxHeight(contentRef.current.scrollHeight + 8)
    // Source Serif 4 may still be swapping in when we first measure —
    // re-measure once it's actually loaded so the last line doesn't clip.
    document.fonts?.ready?.then(() => {
      if (contentRef.current) setMaxHeight(contentRef.current.scrollHeight + 8)
    })
  }, [expanded, briefing])

  const briefingText = briefing?.content || 'Tap the refresh button to generate your morning briefing.'
  const condensed = briefingText.split(/(?<=[.!?])\s+/)[0]

  return (
    <div style={{ marginTop: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <Label>{timeOfDayLabel()}</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--faint)' }}>
          {briefing && <span style={{ fontSize: 11 }}>{new Date(briefing.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
          <button onClick={(e) => { e.stopPropagation(); generate() }} disabled={generating} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accentText)', background: 'none', border: 'none', padding: 0, opacity: generating ? 0.5 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M20 11a8 8 0 1 0-1 6"/>
              <path d="M20 4v5h-5"/>
            </svg>
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      {!expanded && (
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {condensed}
        </p>
      )}
      <div style={{ overflow: 'hidden', maxHeight, opacity: expanded ? 1 : 0, transition: 'max-height 0.25s ease, opacity 0.2s ease' }}>
        <div ref={contentRef}>
          <p style={{ margin: '8px 0 0', fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15.5, fontWeight: 480, lineHeight: 1.62, color: 'var(--text)', letterSpacing: '-0.003em' }}>
            {briefingText}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Card ─────────────────────────────────────────────
function DashboardCard({ priorities, toggleTask }) {
  const { dayType, currentPeriod, dateLabel } = useSchedule()
  const { briefing, generating, generate } = useBriefing()

  const periodDisplay = currentPeriod
    ? { label: currentPeriod.status === 'now' ? `Now · ${currentPeriod.period}` : `Next · ${currentPeriod.period}`, name: currentPeriod.className, time: currentPeriod.remaining, next: currentPeriod.nextClass }
    : { label: 'No class right now', name: 'Free period', time: '', next: null }

  return (
    <Card>
      {/* Schedule strip */}
      <div style={{ background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

        <BriefingSection briefing={briefing} generating={generating} generate={generate} />
      </div>

      {/* Priorities */}
      {priorities.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label>Priorities</Label>
            <div style={{ fontSize: 11, color: 'var(--faint)' }}>Reordered by Clark</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {priorities.map(item => {
              const dateInfo = getTaskDateInfo(item)
              return (
                <div key={item.id} onClick={() => toggleTask(item.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 2px', cursor: 'pointer' }}>
                  <CheckBox done={item.done} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--faint)' : 'var(--text)' }}>{sentenceCaseTaskTitle(item.title)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11.5, color: dateInfo.isPast ? OVERDUE_COLOR : 'var(--muted)' }}>{dateInfo.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1.5px 7px', borderRadius: 999, background: 'var(--accentSoft)', color: 'var(--accentText)' }}>{item.source}</span>
                    </div>
                  </div>
                </div>
              )
            })}
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
  const meetingCount = lastResult?.club_meetings?.length || 0
  const clubTaskCount = lastResult?.club_tasks?.length || 0
  const summary = status === 'done' && lastResult
    ? `Parsed · ${[
        taskCount && `${taskCount} task${taskCount > 1 ? 's' : ''}`,
        gradeCount && `${gradeCount} grade${gradeCount > 1 ? 's' : ''}`,
        meetingCount && `${meetingCount} meeting${meetingCount > 1 ? 's' : ''}`,
        clubTaskCount && `${clubTaskCount} club task${clubTaskCount > 1 ? 's' : ''}`,
      ].filter(Boolean).join(', ') || 'nothing new'}`
    : 'Use your keyboard mic for voice, or type it out'

  return (
    <Card>
      <Label>Brain Dump</Label>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setStatus(null) }}
        placeholder="Tell Clark anything"
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
function isClubTask(task) {
  const values = [task.category, task.tag, task.source].map(value => String(value || '').toLowerCase())
  return values.some(value =>
    value === 'club' ||
    value === 'clubs' ||
    value.includes('national honor society') ||
    value.includes('nhs') ||
    value.includes('beta club') ||
    value.includes('spanish club') ||
    value.includes('student council')
  )
}

function TaskRow({ item, toggleTask }) {
  const dateInfo = getTaskDateInfo(item)
  const tagLabel = displayTaskTag(item.tag)
  return (
    <div onClick={() => toggleTask(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 2px', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
      <CheckBox done={item.done} small />
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--faint)' : 'var(--text)' }}>{sentenceCaseTaskTitle(item.title)}</div>
      {tagLabel && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--cardAlt)', color: 'var(--muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{tagLabel}</span>}
      <span style={{ fontSize: 11.5, color: dateInfo.isPast ? OVERDUE_COLOR : 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateInfo.label}</span>
    </div>
  )
}

function ClassSection({ label, tasks, toggleTask, expanded, onToggle }) {
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(0)

  useEffect(() => {
    if (expanded && contentRef.current) setMaxHeight(contentRef.current.scrollHeight)
    else setMaxHeight(0)
  }, [expanded, tasks])

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          background: 'none', border: 'none', padding: '11px 2px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1.5px 7px', borderRadius: 999, background: 'var(--cardAlt)', color: 'var(--muted)' }}>{tasks.length}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div style={{ overflow: 'hidden', maxHeight, opacity: expanded ? 1 : 0, transition: 'max-height 0.25s ease, opacity 0.2s ease' }}>
        <div ref={contentRef}>
          {tasks.map(item => <TaskRow key={item.id} item={item} toggleTask={toggleTask} />)}
        </div>
      </div>
    </div>
  )
}

function TasksCard({ tasks, toggleTask, filter, onFilter }) {
  const [expandedClasses, setExpandedClasses] = useState({})
  const toggleClass = (label) => setExpandedClasses(prev => ({ ...prev, [label]: !prev[label] }))

  const filtered = tasks.filter(t =>
    filter === 'All' ? true : filter === 'Priority' ? t.priority : filter === 'Club' ? isClubTask(t) : t.category === filter
  )

  const classGroups = filter === 'Class'
    ? (() => {
        const byTag = new Map(CLASS_TAG_ORDER.map(tag => [tag, []]))
        const other = []
        for (const t of filtered) {
          const label = displayTaskTag(t.tag)
          if (label && byTag.has(label)) byTag.get(label).push(t)
          else other.push(t)
        }
        return { byTag, other }
      })()
    : null

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
      {classGroups ? (
        <div style={{ marginTop: 6 }}>
          {CLASS_TAG_ORDER.map(tag => (
            <ClassSection
              key={tag}
              label={tag}
              tasks={classGroups.byTag.get(tag)}
              toggleTask={toggleTask}
              expanded={!!expandedClasses[tag]}
              onToggle={() => toggleClass(tag)}
            />
          ))}
          {classGroups.other.length > 0 && (
            <ClassSection
              label="Other"
              tasks={classGroups.other}
              toggleTask={toggleTask}
              expanded={!!expandedClasses.Other}
              onToggle={() => toggleClass('Other')}
            />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {filtered.map(item => <TaskRow key={item.id} item={item} toggleTask={toggleTask} />)}
        </div>
      )}
    </Card>
  )
}

// ─── Grades Card ─────────────────────────────────────────────────
const FORMAL_GRADE_NAMES = {
  'ib history of the americas': 'IB History of the Americas',
  'history of the americas': 'IB History of the Americas',
  hota: 'IB History of the Americas',
  'ib biology': 'IB Biology',
  'ib biology hl': 'IB Biology',
  'biology hl': 'IB Biology',
  biology: 'IB Biology',
  bio: 'IB Biology',
  'ib theory of knowledge': 'IB Theory of Knowledge',
  'theory of knowledge': 'IB Theory of Knowledge',
  tok: 'IB Theory of Knowledge',
  'ib english: language and literature': 'IB Language and Literature',
  'ib english: lang and lit': 'IB Language and Literature',
  'ib english language and literature': 'IB Language and Literature',
  'ib english lang lit': 'IB Language and Literature',
  'ib language and lit': 'IB Language and Literature',
  'ib language and literature': 'IB Language and Literature',
  'language and lit': 'IB Language and Literature',
  'language and literature': 'IB Language and Literature',
  'ib math: applications and interpretations': 'IB Applications and Interpretations',
  'ib math applications and interpretations': 'IB Applications and Interpretations',
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
  const formattedGrades = FORMAL_GRADE_ORDER.map(displayName => {
    const match = grades.find(g => gradeDisplayName(g.class_name) === displayName)
    return match
      ? { ...match, displayName, gradeNumber: gradeNumber(match.percentage) }
      : { id: displayName, displayName, gradeNumber: '—', last_updated: null, note: null }
  })

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

// ─── Inbox Card (Today preview — full inbox now lives in the Inbox tab) ──
function InboxCard({ onOpenInbox }) {
  const { emails } = useEmails()

  return (
    <Card>
      <div onClick={() => onOpenInbox()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', margin: '-8px 0 -4px', cursor: 'pointer' }}>
        <Label>Inbox</Label>
      </div>
      {emails.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--faint)' }}>
          No emails yet. Tap to sync your inbox.
        </div>
      )}
      {emails.slice(0, 3).map(m => (
        <div key={m.id} onClick={(e) => { e.stopPropagation(); onOpenInbox(m.id) }} style={{ padding: '14px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accentSoft)', color: 'var(--accentText)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{m.initials}</div>
            {!m.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{m.from_name}</div>
            <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{new Date(m.received_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9, color: 'var(--text)' }}>{m.subject}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{m.snippet}</div>
        </div>
      ))}
    </Card>
  )
}

// ─── Screen ──────────────────────────────────────────────────────
export default function TodayScreen({ filter, onFilter, onOpenCalendar, onOpenInbox }) {
  const { tasks, priorities, toggleTask, refetch } = useTasks()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 18px' }}>
      <TopPills />
      <DashboardCard priorities={priorities} toggleTask={toggleTask} />
      <BrainDumpCard onParsed={refetch} />
      <TasksCard tasks={tasks} toggleTask={toggleTask} filter={filter} onFilter={onFilter} />
      <CalendarCard tasks={tasks} onOpenCalendar={onOpenCalendar} />
      <GradesCard />
      <InboxCard onOpenInbox={onOpenInbox} />
    </div>
  )
}
