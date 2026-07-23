import { useClubs } from './hooks/useClubs.js'
import { SPACE } from './lib/spacing.js'

const ICON_COMMON = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

function ShieldIcon() {
  return <svg {...ICON_COMMON}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/></svg>
}
function LaurelIcon() {
  return (
    <svg {...ICON_COMMON}>
      <path d="M9 20c-3-2-4.5-5-4.5-8.5C4.5 8 6 5 8 3"/>
      <path d="M15 20c3-2 4.5-5 4.5-8.5C19.5 8 18 5 16 3"/>
      <path d="M9 20h6"/>
      <path d="M6 6.5l1.6 1M5.6 9.5l1.7.4M5.7 12.5l1.7-.2M6.5 15.5l1.5-.8"/>
      <path d="M18 6.5l-1.6 1M18.4 9.5l-1.7.4M18.3 12.5l-1.7-.2M17.5 15.5l-1.5-.8"/>
    </svg>
  )
}
function BookIcon() {
  return (
    <svg {...ICON_COMMON}>
      <path d="M4 5.5c2-1 5-1 8 .5V19c-3-1.5-6-1.5-8-.5V5.5z"/>
      <path d="M20 5.5c-2-1-5-1-8 .5V19c3-1.5 6-1.5 8-.5V5.5z"/>
    </svg>
  )
}
function GlobeIcon() {
  return (
    <svg {...ICON_COMMON}>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M3.5 12h17M12 3.5c2.6 2.4 4 5.3 4 8.5s-1.4 6.1-4 8.5c-2.6-2.4-4-5.3-4-8.5s1.4-6.1 4-8.5z"/>
    </svg>
  )
}
function GenericClubIcon() {
  return <svg {...ICON_COMMON}><circle cx="12" cy="12" r="8.5"/><path d="M9 12.5l2 2 4-4.5"/></svg>
}

function iconFor(name) {
  const key = String(name || '').toLowerCase()
  if (key.includes('student council')) return ShieldIcon
  if (key.includes('beta club')) return LaurelIcon
  if (key.includes('honor society') || key.includes('nhs')) return BookIcon
  if (key.includes('spanish')) return GlobeIcon
  return GenericClubIcon
}

/** Full-width Clubs band below the 3-column grid — a brand-new
    presentation (distinct per-club icons, row layout) but reusing the
    exact same useClubs() hook/data as the mobile Clubs tab. */
export default function DesktopClubs() {
  const { clubs } = useClubs()
  const leadershipCount = clubs.length

  return (
    <div style={{ padding: '36px 32px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 26, fontWeight: 600, color: 'var(--text)' }}>
          Clubs
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{leadershipCount} leadership roles</div>
      </div>

      <div style={{ display: 'flex', gap: SPACE.card }}>
        {clubs.map(club => {
          const Icon = iconFor(club.name)
          return (
            <div key={club.id} style={{
              flex: 1, minWidth: 0,
              background: 'var(--card)', border: 'var(--card-border)', borderRadius: 22,
              boxShadow: 'var(--card-shadow)', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, background: 'var(--accentSoft)', color: 'var(--accentText)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon />
              </div>
              <div>
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: 'var(--text)' }}>
                  {club.name}
                </div>
                <div style={{
                  display: 'inline-block', marginTop: 8,
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  background: 'var(--cardAlt)', color: 'var(--muted)', border: '1px solid var(--border)',
                }}>
                  {club.role}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
