const QUICK_LINKS = [
  { id: 'q1', label: 'Outlook', glyph: 'O', tint: '#0F6CBD' },
  { id: 'q2', label: 'Canvas', glyph: 'C', tint: '#D64541' },
  { id: 'q3', label: 'Infinite Campus', glyph: 'IC', tint: '#3E8E5A' },
]

export default function Header({ dark, quickOpen, onToggleDark, onToggleQuick }) {
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
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--muted)' }}>Friday, June 26</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <button
            onClick={onToggleQuick}
            style={{
              cursor: 'pointer', width: 38, height: 38, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: quickOpen ? '1px solid transparent' : '1px solid var(--border)',
              background: quickOpen ? 'var(--accentSoft)' : 'var(--card)',
              color: quickOpen ? 'var(--accentText)' : 'var(--muted)',
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>
            </svg>
          </button>
          <button
            onClick={onToggleDark}
            style={{
              cursor: 'pointer', width: 38, height: 38, borderRadius: '50%',
              border: '1px solid var(--border)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', flexShrink: 0, padding: 0,
            }}
          >
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.9A9 9 0 1 1 11.1 3 7 7 0 0 0 21 12.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {quickOpen && (
        <div style={{ display: 'flex', gap: 9, padding: '0 0 14px' }}>
          {QUICK_LINKS.map(ql => (
            <div key={ql.id} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              background: 'var(--cardAlt)', border: '1px solid var(--border)',
              borderRadius: 15, padding: '11px 6px', cursor: 'pointer',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 14, fontWeight: 600, color: '#fff', background: ql.tint, flexShrink: 0,
              }}>{ql.glyph}</div>
              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: 'var(--text)' }}>{ql.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
