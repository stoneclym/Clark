export default function TabBar({ screen, onNavigate }) {
  const todayColor = screen === 'today' ? 'var(--accent)' : 'var(--faint)'
  const clubsColor = screen === 'clubs' ? 'var(--accent)' : 'var(--faint)'
  const askColor = screen === 'ask' ? 'var(--accentText)' : 'var(--faint)'

  const tabBtn = (onClick, color, children) => (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      cursor: 'pointer', color, background: 'none', border: 'none', padding: 0,
    }}>
      {children}
    </button>
  )

  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 5,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start',
      padding: '9px 20px 30px',
    }}>
      {tabBtn(() => onNavigate('today'), todayColor, (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600 }}>Today</span>
        </>
      ))}

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => onNavigate('ask')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          cursor: 'pointer', marginTop: -24, background: 'none', border: 'none', padding: 0,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(86,141,179,0.4)',
            border: '3px solid var(--bg)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5z"/>
              <path d="M9.5 11h.01M13 11h.01M16.5 11h.01"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: askColor }}>Ask Clark</span>
        </button>
      </div>

      {tabBtn(() => onNavigate('clubs'), clubsColor, (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="3.5" width="7" height="7" rx="2"/>
            <rect x="13.5" y="3.5" width="7" height="7" rx="2"/>
            <rect x="3.5" y="13.5" width="7" height="7" rx="2"/>
            <rect x="13.5" y="13.5" width="7" height="7" rx="2"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600 }}>Clubs</span>
        </>
      ))}
    </div>
  )
}
