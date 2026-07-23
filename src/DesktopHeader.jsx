import { useState, useRef, useEffect } from 'react'
import { QUICK_LINKS, openApp } from './lib/quickLinks.js'

function IconButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none',
        background: 'var(--cardAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)', cursor: 'pointer', padding: 0, flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/** Desktop header — Clark wordmark/date, the apps quick-links dropdown
    (same links as mobile's apps pill, just an icon button here), settings
    gear, the Batch 3 lock button, and the Ask Clark trigger (its expand
    target is column 1, not the header itself — see DesktopColumn1). */
export default function DesktopHeader({ onOpenSettings, onLock, askExpanded, onToggleAsk }) {
  const [appsOpen, setAppsOpen] = useState(false)
  const appsRef = useRef(null)

  useEffect(() => {
    if (!appsOpen) return
    const onDocClick = (e) => {
      if (appsRef.current && !appsRef.current.contains(e.target)) setAppsOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    return () => document.removeEventListener('click', onDocClick, true)
  }, [appsOpen])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 14, padding: '28px 32px 0' }}>
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 22,
        background: 'var(--card)', borderRadius: 20, boxShadow: 'var(--card-shadow)',
        padding: '18px 28px',
      }}>
        <div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1, color: 'var(--text)' }}>
            Clark
          </div>
          <div style={{ marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>{today}</div>
        </div>

        <div ref={appsRef} style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <IconButton label="Quick apps" onClick={() => setAppsOpen(o => !o)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>
            </svg>
          </IconButton>
          <IconButton label="Settings" onClick={onOpenSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </IconButton>
          <IconButton label="Lock Clark" onClick={onLock}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
          </IconButton>

          {appsOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 10, zIndex: 20,
              display: 'flex', gap: 10,
              background: 'var(--card)', borderRadius: 16, padding: 14,
              boxShadow: 'var(--card-shadow), 0 14px 34px rgba(20,18,14,0.16)',
            }}>
              {QUICK_LINKS.map(ql => (
                <div
                  key={ql.id}
                  onClick={() => { openApp(ql.deepLink, ql.webUrl); setAppsOpen(false) }}
                  style={{ width: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                >
                  <img
                    src={dark ? ql.iconDark : ql.iconLight}
                    alt="" width={38} height={38}
                    style={{ width: 38, height: 38, borderRadius: 12, objectFit: 'cover' }}
                  />
                  <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: 'var(--text)' }}>{ql.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ask Clark — expands column 1 (not the header itself) */}
      <button
        onClick={onToggleAsk}
        aria-pressed={askExpanded}
        style={{
          flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 30px', borderRadius: 20, border: 'none', cursor: 'pointer',
          background: askExpanded ? 'var(--accentSoft)' : 'var(--card)', boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(86,141,179,0.35)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5z"/>
            <path d="M9.5 11h.01M13 11h.01M16.5 11h.01"/>
          </svg>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>Ask Clark</div>
      </button>
    </div>
  )
}
