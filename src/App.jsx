import { useState, useEffect, useCallback, Component } from 'react'
import Header from './Header.jsx'
import TabBar from './TabBar.jsx'
import TodayScreen from './TodayScreen.jsx'
import ClubsScreen from './ClubsScreen.jsx'
import AskScreen from './AskScreen.jsx'
import SettingsScreen from './SettingsScreen.jsx'
import SetupScreen from './SetupScreen.jsx'
import { supabase } from './lib/supabase.js'
import { getStoredCredentialId, authenticateBiometric } from './lib/webauthn.js'

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

export default function App() {
  const [screen, setScreen] = useState('today')
  const [dark, setDark] = useState(false)
  const [filter, setFilter] = useState('All')
  const [quickOpen, setQuickOpen] = useState(false)

  // Auth state: null=checking, false=locked, true=unlocked
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    // Handle Microsoft OAuth callback (?code=...&state=outlook_auth)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state === 'outlook_auth') {
      window.history.replaceState({}, '', window.location.pathname)
      setAuthed(true)
      setScreen('today')
      supabase.functions.invoke('microsoft-callback', {
        body: { code, redirect_uri: window.location.origin },
      })
      return
    }

    const credId = getStoredCredentialId()
    if (!credId) {
      setAuthed(true)
      setScreen('setup')
    } else {
      authenticateBiometric(credId)
        .then(() => setAuthed(true))
        .catch(() => setAuthed(false))
    }
  }, [])

  const unlock = useCallback(async () => {
    const credId = getStoredCredentialId()
    await authenticateBiometric(credId)
    setAuthed(true)
  }, [])

  const base = dark ? DARK : LIGHT
  const accentText = dark
    ? 'color-mix(in srgb, #568DB3 70%, #ffffff 30%)'
    : 'color-mix(in srgb, #568DB3 80%, #000000 20%)'
  const accentSoft = dark ? 'rgba(86,141,179,0.20)' : 'rgba(86,141,179,0.13)'

  const themeStyle = {
    '--bg': base.bg,
    '--card': base.card,
    '--cardAlt': base.cardAlt,
    '--text': base.text,
    '--muted': base.muted,
    '--faint': base.faint,
    '--border': base.border,
    '--borderStrong': base.borderStrong,
    '--accent': ACCENT,
    '--accentText': accentText,
    '--accentSoft': accentSoft,
    background: base.bg,
    color: base.text,
  }

  const closeQuick = useCallback(() => {
    if (quickOpen) setQuickOpen(false)
  }, [quickOpen])

  const showChrome = screen !== 'setup' && screen !== 'ask' && screen !== 'settings'

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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 32, fontWeight: 600, color: 'var(--text)' }}>
              Clark
            </div>
            <div
              onClick={unlock}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 6px 20px rgba(86,141,179,0.4)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 16V11a5 5 0 0 1 5-5h5M32 6h5a5 5 0 0 1 5 5v5M42 32v5a5 5 0 0 1-5 5h-5M16 42h-5a5 5 0 0 1-5-5v-5"/>
                <path d="M18 20v3M30 20v3M24 19v6l-2.4 1.6"/>
                <path d="M18 30.5c1.8 1.8 4 2.6 6 2.6s4.2-.8 6-2.6"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
              Tap to unlock with Face ID
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-frame" style={themeStyle}>
        {showChrome && (
          <Header
            quickOpen={quickOpen}
            onToggleQuick={() => setQuickOpen(o => !o)}
            onOpenSettings={() => { setQuickOpen(false); setScreen('settings') }}
          />
        )}

        <ErrorBoundary>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {screen === 'today' && (
              <TodayScreen
                filter={filter}
                onFilter={setFilter}
                onCloseQuick={closeQuick}
              />
            )}
            {screen === 'clubs' && (
              <ClubsScreen onCloseQuick={closeQuick} />
            )}
            {screen === 'ask' && (
              <AskScreen onBack={() => setScreen('today')} />
            )}
            {screen === 'settings' && (
              <SettingsScreen
                dark={dark}
                onToggleDark={() => setDark(d => !d)}
                onBack={() => setScreen('today')}
              />
            )}
            {screen === 'setup' && (
              <SetupScreen onComplete={() => { setAuthed(true); setScreen('today') }} />
            )}
          </div>
        </ErrorBoundary>

        {showChrome && (
          <TabBar screen={screen} onNavigate={setScreen} />
        )}
      </div>
    </div>
  )
}
