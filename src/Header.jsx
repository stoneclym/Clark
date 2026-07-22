export default function Header({ onOpenSettings, onLock }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 6,
      background: 'var(--bg)',
      padding: '20px 20px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 14 }}>
        <div>
          <div style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1,
            color: 'var(--text)',
          }}>Clark</div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--muted)' }}>{today}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* Lock */}
          <button
            onClick={onLock}
            aria-label="Lock Clark"
            style={{
              cursor: 'pointer', width: 38, height: 38, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', flexShrink: 0, padding: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            style={{
              cursor: 'pointer', width: 38, height: 38, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', flexShrink: 0, padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
