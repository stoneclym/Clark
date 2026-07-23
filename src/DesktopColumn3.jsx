import { QUICK_LINKS, openApp } from './lib/quickLinks.js'
import InboxSheetContent from './inboxShared.jsx'
import { triggerHaptic } from './lib/haptics.js'
import { SPACE } from './lib/spacing.js'

function AppsRow() {
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {QUICK_LINKS.map(ql => (
        <button
          key={ql.id}
          onClick={() => { triggerHaptic(); openApp(ql.deepLink, ql.webUrl) }}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: 'var(--card)', border: 'var(--card-border)', borderRadius: 18, boxShadow: 'var(--card-shadow)',
            padding: '18px 10px', cursor: 'pointer',
          }}
        >
          <img
            src={dark ? ql.iconDark : ql.iconLight}
            alt="" width={30} height={30}
            style={{ width: 30, height: 30, borderRadius: 9, objectFit: 'cover' }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{ql.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Column 3 — the static apps quick-links row (distinct from the header's
    dropdown version, but triggers the same links) and the full Inbox,
    reusing the exact same content component the mobile Inbox tab uses.
    Inbox is this column's one flexible "filler" card — it grows to fill
    whatever space remains after the apps row (matching columns 1/2's
    height instead of stopping short), scrolling internally to reveal
    the rest of the ~20 most recent emails exactly as before. */
export default function DesktopColumn3({ dimmed, onDismiss }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: SPACE.card, height: '100%' }}>
      <AppsRow />
      <div style={{ flex: 1, minHeight: 0, background: 'var(--card)', border: 'var(--card-border)', borderRadius: 22, boxShadow: 'var(--card-shadow)', overflowY: 'auto' }}>
        <InboxSheetContent focusEmail={null} />
      </div>

      {dimmed && (
        <div
          onClick={onDismiss}
          style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,0.35)', borderRadius: 22, transition: 'opacity var(--spring)', cursor: 'pointer' }}
        />
      )}
    </div>
  )
}
