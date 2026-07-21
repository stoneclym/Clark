const QUICK_LINKS = [
  {
    id: 'outlook',
    label: 'Outlook',
    iconLight: '/icons/outlook-light.png',
    iconDark: '/icons/outlook-dark.png',
    deepLink: 'ms-outlook://',
    webUrl: 'https://outlook.office.com/mail/',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    iconLight: '/icons/canvas-light.png',
    iconDark: '/icons/canvas-dark.png',
    deepLink: 'canvas-courses://',
    webUrl: 'https://nhcs.instructure.com',
  },
  {
    id: 'ic',
    label: 'Infinite Campus',
    iconLight: '/icons/ic-light.png',
    iconDark: '/icons/ic-dark.png',
    deepLink: 'shortcuts://run-shortcut?name=Open%20Campus%20Student',
    webUrl: 'https://650.ncsis.gov/campus/portal/students/psu650nhcs.jsp',
  },
]

function openExternal(url) {
  const externalWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (externalWindow) externalWindow.opener = null
}

function openApp(deepLink, webUrl) {
  if (!deepLink) {
    openExternal(webUrl)
    return
  }

  // Try the native-app scheme from the current PWA window so iOS treats it
  // like a user-initiated app handoff, not a blocked popup or hidden frame.
  // If the app opens, Clark becomes hidden and we skip the web fallback.
  let openedNative = false
  const markOpenedNative = () => {
    if (document.visibilityState === 'hidden') openedNative = true
  }
  document.addEventListener('visibilitychange', markOpenedNative, { once: true })

  window.location.href = deepLink

  setTimeout(() => {
    document.removeEventListener('visibilitychange', markOpenedNative)

    if (!openedNative && document.visibilityState === 'visible') {
      openExternal(webUrl)
    }
  }, 1600)
}

export default function Header({ quickOpen, onToggleQuick, onOpenSettings, dark }) {
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
          {QUICK_LINKS.map(ql => {
            const cardStyle = {
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              background: 'var(--cardAlt)', border: '1px solid var(--border)',
              borderRadius: 15, padding: '11px 6px', cursor: 'pointer',
              textDecoration: 'none',
            }
            const cardContent = (
              <>
                <img
                  src={dark ? ql.iconDark : ql.iconLight}
                  alt=""
                  width={38}
                  height={38}
                  style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, objectFit: 'cover' }}
                />
                <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: 'var(--text)' }}>{ql.label}</div>
              </>
            )

            return ql.deepLink ? (
              <div
                key={ql.id}
                onClick={() => openApp(ql.deepLink, ql.webUrl)}
                style={cardStyle}
              >
                {cardContent}
              </div>
            ) : (
              <a
                key={ql.id}
                href={ql.webUrl}
                target="_blank"
                rel="noopener noreferrer external"
                style={cardStyle}
              >
                {cardContent}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
