import { useSchedule } from './hooks/useSchedule.js'
import { useBriefing } from './hooks/useBriefing.js'
import { timeOfDayLabel } from './lib/greeting.js'
import { triggerHaptic } from './lib/haptics.js'
import { SPACE } from './lib/spacing.js'

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
      {children}
    </div>
  )
}

/** Desktop's Schedule card — same schedule data as mobile's DashboardCard
    (current/next class, time remaining, A/B day). The Briefing here
    expands as an absolutely-positioned overlay anchored to this card's
    own (unpadded, position:relative) outer element — not a floating
    box relative to some inner padded strip, so it spans the card's
    full width with no inset correction needed.

    `overlayHeight` is a precomputed pixel target from DesktopColumn2 —
    always exactly the distance from this card's own bottom edge down
    to the baseline column's bottom (i.e. where Grades ends), so
    expanding always reaches that same depth regardless of how much
    briefing text there is, animated via a plain height transition
    rather than a content-driven scrollHeight measurement. It covers
    whatever sits below in column 2 (Calendar, then Grades — Grades
    unmounts entirely while expanded; see DesktopColumn2.jsx).

    `expanded`/`onToggleExpand` are controlled props, driven by the
    mutual-exclusion accordion hook in DesktopApp.jsx, so expanding this
    collapses Calendar if it was open (and vice versa). */
export default function DesktopScheduleCard({ expanded, onToggleExpand, overlayHeight }) {
  const { dayType, currentPeriod } = useSchedule()
  const { briefing, generating, generate } = useBriefing()

  const periodDisplay = currentPeriod
    ? { label: currentPeriod.status === 'now' ? `Now · ${currentPeriod.period}` : `Next · ${currentPeriod.period}`, name: currentPeriod.className, time: currentPeriod.remaining, next: currentPeriod.nextClass }
    : { label: 'No class right now', name: 'Free period', time: '', next: null }

  const briefingText = briefing?.content || 'Tap the refresh button to generate your morning briefing.'
  const condensed = briefingText.split(/(?<=[.!?])\s+/)[0]

  return (
    <div style={{ position: 'relative', background: 'var(--card)', border: 'var(--card-border)', borderRadius: 22, boxShadow: 'var(--card-shadow)', boxSizing: 'border-box' }}>
      <div style={{ padding: 20 }}>
        <div style={{ background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
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

          <div onClick={() => { triggerHaptic(); onToggleExpand() }} style={{ marginTop: 14, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {condensed}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: SPACE.card, zIndex: 20,
        height: expanded ? overlayHeight : 0, overflow: 'hidden',
        transition: 'height 0.28s ease',
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22,
        boxShadow: expanded ? '0 18px 44px rgba(20,18,14,0.28)' : 'none',
        boxSizing: 'border-box',
      }}>
        <div style={{ padding: 20, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
          <p style={{ margin: 0, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15.5, fontWeight: 480, lineHeight: 1.62, color: 'var(--text)', letterSpacing: '-0.003em' }}>
            {briefingText}
          </p>
        </div>
      </div>
    </div>
  )
}
