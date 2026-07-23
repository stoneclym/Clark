import { useSchedule } from './hooks/useSchedule.js'
import { useBriefing } from './hooks/useBriefing.js'
import { timeOfDayLabel } from './lib/greeting.js'
import { triggerHaptic } from './lib/haptics.js'

// How far the overlay's own position:relative anchor sits inset from
// this card's actual outer edges (outer card padding 20 + the cardAlt
// strip's own 16px horizontal padding) — negated so the overlay spans
// the card's full width instead of just the anchor's narrower one. A
// narrower overlay was the rendering bug: Calendar's card below (which
// spans the full column width) peeked out past the overlay's edges,
// reading as bleed-through/clipping rather than a solid panel.
const HORIZONTAL_INSET = 20 + 16

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
      {children}
    </div>
  )
}

/** Desktop's Schedule card — same schedule data as mobile's DashboardCard
    (current/next class, time remaining, A/B day), but the Briefing here
    is a floating overlay (absolutely positioned, its own shadow) instead
    of pushing Calendar/Grades down the page — a genuinely different
    interaction from mobile's push-down collapse, so this is a new
    component rather than a breakpoint-conditional fork of the shared one.
    Mobile's DashboardCard/BriefingSection (TodayScreen.jsx) are untouched.

    Batch 10: `expanded`/`onToggleExpand` are controlled props (driven by
    the shared useExpandDim() mechanism in DesktopApp.jsx) instead of
    local state, so expanding this now dims columns 1/3 like Ask Clark
    and Calendar do. */
export default function DesktopScheduleCard({ expanded, onToggleExpand }) {
  const { dayType, currentPeriod } = useSchedule()
  const { briefing, generating, generate } = useBriefing()

  const periodDisplay = currentPeriod
    ? { label: currentPeriod.status === 'now' ? `Now · ${currentPeriod.period}` : `Next · ${currentPeriod.period}`, name: currentPeriod.className, time: currentPeriod.remaining, next: currentPeriod.nextClass }
    : { label: 'No class right now', name: 'Free period', time: '', next: null }

  const briefingText = briefing?.content || 'Tap the refresh button to generate your morning briefing.'
  const condensed = briefingText.split(/(?<=[.!?])\s+/)[0]

  return (
    <div style={{ background: 'var(--card)', border: 'var(--card-border)', borderRadius: 22, boxShadow: 'var(--card-shadow)', padding: 20, minHeight: 202, boxSizing: 'border-box' }}>
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

        {/* Briefing — position:relative anchor so the expanded panel can
            float directly below this row without displacing anything. */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <div onClick={() => { triggerHaptic(); onToggleExpand() }} style={{ cursor: 'pointer' }}>
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

          {expanded && (
            <div style={{
              position: 'absolute', top: '100%', left: -HORIZONTAL_INSET, right: -HORIZONTAL_INSET, marginTop: 8, zIndex: 20,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
              boxShadow: '0 18px 44px rgba(20,18,14,0.28)', padding: '16px 20px',
              // Fully opaque — no backdrop-filter/translucency here, this
              // is a flat solid panel (Batch 8 rule) that must cleanly
              // cover Calendar's card underneath, not blend with it.
              opacity: 1,
            }}>
              <p style={{ margin: 0, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15.5, fontWeight: 480, lineHeight: 1.62, color: 'var(--text)', letterSpacing: '-0.003em' }}>
                {briefingText}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
