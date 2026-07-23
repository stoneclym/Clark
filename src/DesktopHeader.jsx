function IconButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 38, height: 38, borderRadius: '50%', border: 'none',
        background: 'var(--cardAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)', cursor: 'pointer', padding: 0, flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/** Desktop header — Clark wordmark/date, settings gear, the Batch 3 lock
    button, and the Ask Clark trigger, all in ONE card sized to exactly
    column 1's grid width (see DesktopApp.jsx) rather than a row of
    independently-sized elements. No apps icon here — the apps quick-links
    already live as their own static row at the top of column 3 (Batch 9,
    section 4); having both was redundant. */
export default function DesktopHeader({ onOpenSettings, onLock, askExpanded, onToggleAsk }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
      background: 'var(--card)', border: 'var(--card-border)', borderRadius: 22, boxShadow: 'var(--card-shadow)',
      padding: '18px 20px', height: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1, color: 'var(--text)' }}>
            Clark
          </div>
          <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{today}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <IconButton label="Settings" onClick={onOpenSettings}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </IconButton>
          <IconButton label="Lock Clark" onClick={onLock}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Ask Clark — a compact inline pill so it fits beside the wordmark
          within column 1's width; expands column 1 itself, not the header. */}
      <button
        onClick={onToggleAsk}
        aria-pressed={askExpanded}
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 16px 8px 8px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: askExpanded ? 'var(--accentSoft)' : 'var(--cardAlt)',
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 8px rgba(86,141,179,0.35)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5z"/>
            <path d="M9.5 11h.01M13 11h.01M16.5 11h.01"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>Ask Clark</span>
      </button>
    </div>
  )
}
