import { useState, useCallback } from 'react'
import Header from './Header.jsx'
import TabBar from './TabBar.jsx'
import TodayScreen from './TodayScreen.jsx'
import ClubsScreen from './ClubsScreen.jsx'
import AskScreen from './AskScreen.jsx'
import SetupScreen from './SetupScreen.jsx'

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
  const [checked, setChecked] = useState({})
  const [quickOpen, setQuickOpen] = useState(false)

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

  const toggle = useCallback((id) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const closeQuick = () => {
    if (quickOpen) setQuickOpen(false)
  }

  const showChrome = screen !== 'setup' && screen !== 'ask'

  return (
    <div className="app-shell">
      <div className="app-frame" style={themeStyle}>
        {showChrome && (
          <Header
            dark={dark}
            quickOpen={quickOpen}
            onToggleDark={() => setDark(d => !d)}
            onToggleQuick={() => setQuickOpen(o => !o)}
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {screen === 'today' && (
            <TodayScreen
              checked={checked}
              filter={filter}
              onToggle={toggle}
              onFilter={setFilter}
              onCloseQuick={closeQuick}
            />
          )}
          {screen === 'clubs' && (
            <ClubsScreen onCloseQuick={closeQuick} />
          )}
          {screen === 'ask' && (
            <AskScreen
              dark={dark}
              onBack={() => setScreen('today')}
            />
          )}
          {screen === 'setup' && (
            <SetupScreen />
          )}
        </div>

        {showChrome && (
          <TabBar screen={screen} onNavigate={setScreen} />
        )}
      </div>
    </div>
  )
}
