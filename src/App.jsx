import { useState, useEffect, useCallback, useRef, Component } from 'react'
import Header from './Header.jsx'
import TabBar from './TabBar.jsx'
import TodayScreen from './TodayScreen.jsx'
import ClubsScreen from './ClubsScreen.jsx'
import CalendarScreen from './CalendarScreen.jsx'
import InboxScreen from './InboxScreen.jsx'
import AskScreen from './AskScreen.jsx'
import Sheet from './Sheet.jsx'
import SettingsScreen from './SettingsScreen.jsx'
import SetupScreen from './SetupScreen.jsx'
import { supabase, invokeErrorMessage } from './lib/supabase.js'
import { clearCredentialId } from './lib/webauthn.js'
import LockScreen from './LockScreen.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Reload Clark
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const LIGHT = {
  bg: '#F0EEE6', card: '#FFFFFF', cardAlt: '#FAF8F2',
  text: '#262420', muted: '#6B675C', faint: '#9A9486',
  border: 'rgba(40,36,28,0.10)', borderStrong: 'rgba(40,36,28,0.18)',
}
const DARK = {
  bg: '#1A1815', card: '#26231F', cardAlt: '#211E19',
  text: '#ECE7DD', muted: '#A39C8E', faint: '#6E685B',
  border: 'rgba(255,255,255,0.09)', borderStrong: 'rgba(255,255,255,0.20)',
}

const ACCENT = '#568DB3'

// Reserved space at the bottom of each scrollable tab so its last content
// isn't hidden behind the floating tab bar, which overlays content rather
// than reserving its own row in the layout.
const TAB_BAR_CLEARANCE = 100

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export default function App() {
  const [screen, setScreen] = useState('today')
  const [previousScreen, setPreviousScreen] = useState('today')
  const [dark, setDark] = useState(systemPrefersDark)
  const [filter, setFilter] = useState('All')
  const [focusEmail, setFocusEmail] = useState(null) // { id, token } | null

  // Auth state: null=checking, false=locked, true=unlocked
  const [authed, setAuthed] = useState(null)
  const [oauthMessage, setOauthMessage] = useState(null)
  const todayScrollRef = useRef(null)
  const clubsScrollRef = useRef(null)
  const calendarScrollRef = useRef(null)
  const inboxScrollRef = useRef(null)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return

    const syncSystemTheme = () => setDark(media.matches)
    syncSystemTheme()

    media.addEventListener('change', syncSystemTheme)
    return () => media.removeEventListener('change', syncSystemTheme)
  }, [])

  useEffect(() => {
    // Handle Microsoft OAuth callback (?code=...&state=outlook_auth on success,
    // or ?error=...&error_description=...&state=outlook_auth if Microsoft itself
    // rejected the request — e.g. account-type or redirect-URI mismatch — before
    // ever redeeming an authorization code).
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError && state === 'outlook_auth') {
      window.history.replaceState({}, '', window.location.pathname)
      sessionStorage.setItem('clark_unlocked', '1')
      setAuthed(true)
      setScreen('settings')
      setOauthMessage({
        type: 'error',
        text: `Microsoft sign-in failed: ${params.get('error_description') || oauthError}`,
      })
      return
    }

    if (code && state === 'outlook_auth') {
      window.history.replaceState({}, '', window.location.pathname)
      sessionStorage.setItem('clark_unlocked', '1')
      setAuthed(true)
      supabase.functions.invoke('microsoft-callback', {
        body: { code, redirect_uri: window.location.origin },
      }).then(async ({ data, error }) => {
        if (error || data?.error) {
          setOauthMessage({ type: 'error', text: error ? await invokeErrorMessage(error) : data.error })
        } else {
          setOauthMessage({ type: 'success', text: data?.account_email ? `Connected to Microsoft as ${data.account_email}.` : 'Connected to Microsoft.' })
        }
        setScreen('settings')
      })
      return
    }

    // Stay unlocked for the browser session — sessionStorage clears itself
    // when the tab actually closes, so a refresh/navigation doesn't
    // re-prompt Face ID/Touch ID, but reopening the tab does.
    setAuthed(sessionStorage.getItem('clark_unlocked') === '1')
  }, [])

  const handleUnlock = useCallback((opts = {}) => {
    sessionStorage.setItem('clark_unlocked', '1')
    if (opts.reset) {
      clearCredentialId()
      setScreen('setup')
    }
    setAuthed(true)
  }, [])

  const handleLock = useCallback(() => {
    sessionStorage.removeItem('clark_unlocked')
    setAuthed(false)
  }, [])

  // Navigating to the Inbox tab with a specific email in mind — token makes
  // re-tapping the same preview twice still trigger a fresh scroll, since
  // React would otherwise bail out of an effect keyed on an unchanged id.
  const openInbox = useCallback((emailId = null) => {
    setFocusEmail(emailId ? { id: emailId, token: Date.now() } : null)
    setScreen('inbox')
  }, [])

  const openCalendar = useCallback(() => setScreen('calendar'), [])

  const base = dark ? DARK : LIGHT
  const accentText = dark
    ? 'color-mix(in srgb, #568DB3 70%, #ffffff 30%)'
    : 'color-mix(in srgb, #568DB3 80%, #000000 20%)'
  const accentSoft = dark ? 'rgba(86,141,179,0.20)' : 'rgba(86,141,179,0.13)'
  // Liquid-glass tokens for the nav/chrome layer only (tab bar, FAB,
  // sheets, apps dropdown) — content cards never reference these. Same
  // alpha in both modes ("even") — higher transparency + a stronger
  // saturate() filter (see .glass/.glass-accent in App.css) so the color
  // reads as vivid glass rather than a pale, near-opaque tint.
  const glassSurface = dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'
  const glassBorder = 'rgba(255,255,255,0.35)'
  const glassAccent = 'rgba(86,141,179,0.32)'

  const themeStyle = {
    '--bg': base.bg,
    '--card': base.card,
    '--cardAlt': base.cardAlt,
    '--surface-2': base.card,
    '--text': base.text,
    '--muted': base.muted,
    '--faint': base.faint,
    '--border': base.border,
    '--borderStrong': base.borderStrong,
    '--accent': ACCENT,
    '--accentText': accentText,
    '--accentSoft': accentSoft,
    '--glassSurface': glassSurface,
    '--glassBorder': glassBorder,
    '--glassAccent': glassAccent,
    background: base.bg,
    color: base.text,
  }

  const showChrome = screen !== 'setup' && screen !== 'settings'

  if (authed === null) {
    return (
      <div className="app-shell">
        <div className="app-frame" style={themeStyle}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 26, fontWeight: 600, color: 'var(--faint)' }}>
              Clark
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (authed === false) {
    return (
      <div className="app-shell">
        <div className="app-frame" style={themeStyle}>
          <LockScreen onUnlock={handleUnlock} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-frame" style={themeStyle}>
        {oauthMessage && (
          <div
            onClick={() => setOauthMessage(null)}
            style={{
              position: 'absolute', top: 12, left: 12, right: 12, zIndex: 50,
              background: oauthMessage.type === 'error' ? 'rgba(192,57,43,0.95)' : 'var(--accent)',
              color: '#fff', borderRadius: 12, padding: '12px 16px',
              fontSize: 13, lineHeight: 1.4, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            {oauthMessage.text}
          </div>
        )}
        {showChrome && (
          <Header
            onOpenSettings={() => { setPreviousScreen(screen); setScreen('settings') }}
            onLock={handleLock}
          />
        )}

        <ErrorBoundary>
          {/* Relative container — all four tabs stay mounted in their own
              scroll layers, so switching tabs only toggles visibility:
              drafts, scroll position, expand/collapse state, etc. all
              survive navigating away and back. */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div ref={todayScrollRef} style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: TAB_BAR_CLEARANCE, display: screen === 'today' ? 'block' : 'none' }}>
              <TodayScreen filter={filter} onFilter={setFilter} onOpenCalendar={openCalendar} onOpenInbox={openInbox} />
            </div>
            <div ref={clubsScrollRef} style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: TAB_BAR_CLEARANCE, display: screen === 'clubs' ? 'block' : 'none' }}>
              <ClubsScreen />
            </div>
            <div ref={calendarScrollRef} style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: TAB_BAR_CLEARANCE, display: screen === 'calendar' ? 'block' : 'none' }}>
              <CalendarScreen />
            </div>
            <div ref={inboxScrollRef} style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: TAB_BAR_CLEARANCE, display: screen === 'inbox' ? 'block' : 'none' }}>
              <InboxScreen focusEmail={focusEmail} />
            </div>
            {/* keepMounted so the conversation survives switching tabs even
                while the sheet itself is closed */}
            <Sheet
              open={screen === 'ask'}
              onClose={() => setScreen('today')}
              variant="full"
              flush
              keepMounted
              ariaLabel="Ask Clark"
            >
              <AskScreen onBack={() => setScreen('today')} />
            </Sheet>
            {screen === 'settings' && (
              <SettingsScreen
                onBack={() => setScreen(previousScreen)}
              />
            )}
            {screen === 'setup' && (
              <SetupScreen onComplete={() => { setAuthed(true); setScreen('today') }} />
            )}
          </div>
        </ErrorBoundary>

        {showChrome && (
          <TabBar screen={screen} onNavigate={(next) => {
            if (next === screen) {
              const refs = { today: todayScrollRef, clubs: clubsScrollRef, calendar: calendarScrollRef, inbox: inboxScrollRef }
              refs[next]?.current?.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
              setScreen(next)
            }
          }} />
        )}
      </div>
    </div>
  )
}
