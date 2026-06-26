const QUICK_LINKS = [
  {
    id: 'outlook',
    label: 'Outlook',
    glyph: 'O',
    tint: '#0F6CBD',
    deepLink: 'ms-outlook://',
    webUrl: 'https://outlook.office.com/mail/',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    glyph: 'C',
    tint: '#D64541',
    deepLink: 'canvas-courses://',
    webUrl: 'https://nhcs.instructure.com',
  },
  {
    id: 'ic',
    label: 'Infinite Campus',
    glyph: 'IC',
    tint: '#3E8E5A',
    deepLink: 'infinitecampus://',
    webUrl: 'https://newhanover.infinitecampus.org/campus/portal/newHanover.jsp',
  },
]

function openApp(deepLink, webUrl) {
  // Try the deep link; if the app isn't installed iOS will do nothing
  // and we fall back to the web URL after a short delay
  const start = Date.now()
  window.location.href = deepLink
  setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.location.href = webUrl
    }
  }, 1200)
}

export default function Header({ quickOpen, onToggleQuick, onOpenSettings }) {
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
          {/* Quick links toggle */}
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
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Quick links panel */}
      {quickOpen && (
        <div style={{ display: 'flex', gap: 9, padding: '0 0 14px' }}>
          {QUICK_LINKS.map(ql => (
            <div
              key={ql.id}
              onClick={() => openApp(ql.deepLink, ql.webUrl)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                background: 'var(--cardAlt)', border: '1px solid var(--border)',
                borderRadius: 15, padding: '11px 6px', cursor: 'pointer',
              }}
            >
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
