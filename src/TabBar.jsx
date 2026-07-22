const TABS = [
  {
    id: 'today',
    label: 'Today',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>
      </svg>
    ),
  },
  {
    id: 'clubs',
    label: 'Clubs',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="7" height="7" rx="2"/>
        <rect x="13.5" y="3.5" width="7" height="7" rx="2"/>
        <rect x="3.5" y="13.5" width="7" height="7" rx="2"/>
        <rect x="13.5" y="13.5" width="7" height="7" rx="2"/>
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3.5" y="5" width="17" height="16" rx="2.5"/>
        <path d="M3.5 9.5h17M8 3v4M16 3v4"/>
      </svg>
    ),
  },
  {
    id: 'inbox',
    label: 'Inbox',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9 6 9-6"/>
        <rect x="3" y="5" width="18" height="14" rx="2.5"/>
      </svg>
    ),
  },
]

const FAB_SIZE = 46

export default function TabBar({ screen, onNavigate }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 5,
      display: 'flex', alignItems: 'center',
      padding: '0 18px 26px',
      gap: 10,
      pointerEvents: 'none',
    }}>
      {/* Mirrors the FAB's width so the pill — and the 4 tabs centered
          inside it — sit centered on screen, independent of the FAB. */}
      <div style={{ width: FAB_SIZE, flexShrink: 0 }} />

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 26, padding: '9px 6px',
        boxShadow: '0 18px 40px rgba(20,18,14,0.24), 0 2px 8px rgba(20,18,14,0.12)',
        pointerEvents: 'auto',
      }}>
        {TABS.map(tab => {
          const color = screen === tab.id ? 'var(--accent)' : 'var(--faint)'
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                cursor: 'pointer', color, background: 'none', border: 'none', padding: '3px 0',
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Ask Clark — a distinct action button beside the tabs, not a fifth tab */}
      <button
        onClick={() => onNavigate('ask')}
        aria-label="Ask Clark"
        style={{
          flexShrink: 0, width: FAB_SIZE, height: FAB_SIZE, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(86,141,179,0.35)',
          border: 'none', cursor: 'pointer', padding: 0,
          pointerEvents: 'auto',
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5z"/>
          <path d="M9.5 11h.01M13 11h.01M16.5 11h.01"/>
        </svg>
      </button>
    </div>
  )
}
