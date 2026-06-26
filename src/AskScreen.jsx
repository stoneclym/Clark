const MESSAGES = [
  {
    id: 'am1', role: 'clark',
    text: "Morning — it's a B day. History of the Americas now, then Bio HL, and Spanish Club after school. Want the rundown?",
  },
  { id: 'am2', role: 'user', text: 'What do I have due this week?' },
  {
    id: 'am3', role: 'clark',
    text: 'Five things, most urgent first:',
    list: [
      'HOTA essay outline — today',
      'NHS blood-drive flyer — before lunch',
      'UNC supplemental — Friday',
      'Bio IA data section — next Bio class',
      'Math AA problem set 14 — next class',
    ],
  },
  { id: 'am4', role: 'user', text: 'Remind me to email the Spanish Club tomorrow at 4.' },
  {
    id: 'am5', role: 'clark',
    text: 'Done — I set that reminder.',
    card: { title: 'Email Spanish Club', meta: 'Tomorrow · 4:00 PM', via: 'Google Tasks' },
  },
]

export default function AskScreen({ dark, onBack }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 6,
        background: 'var(--bg)',
        padding: '20px 16px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            border: '1px solid var(--border)', background: 'var(--card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', cursor: 'pointer', flexShrink: 0, padding: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 3px 8px rgba(86,141,179,0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5z"/>
              <path d="M9.5 11h.01M13 11h.01M16.5 11h.01"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1, color: 'var(--text)' }}>
              Ask Clark
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}/>
              Sees your schedule, tasks &amp; inbox
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px 14px' }}>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)' }}>
          Today · 7:48 AM · B day
        </div>

        {MESSAGES.map(msg => {
          const isUser = msg.role === 'user'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={isUser ? {
                maxWidth: '80%',
                background: 'var(--accent)', color: '#fff',
                padding: '11px 15px', borderRadius: '18px 18px 5px 18px',
                fontSize: 14.5, lineHeight: 1.5,
              } : {
                maxWidth: '85%',
                background: 'var(--cardAlt)', color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '12px 15px', borderRadius: '18px 18px 18px 5px',
                fontSize: 14.5, lineHeight: 1.55,
              }}>
                <div>{msg.text}</div>

                {msg.list && (
                  <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {msg.list.map((li, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, lineHeight: 1.4 }}>
                        <span style={{ marginTop: 6, width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }}/>
                        <span>{li}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.card && (
                  <div style={{
                    marginTop: 11, background: 'var(--card)',
                    border: '1px solid var(--border)', borderRadius: 13,
                    padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 11,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--accentSoft)', color: 'var(--accentText)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{msg.card.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{msg.card.meta}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accentText)', whiteSpace: 'nowrap' }}>
                      {msg.card.via}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input bar */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 6,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '12px 14px 30px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 999, padding: '12px 16px', cursor: 'text',
        }}>
          <span style={{ flex: 1, fontSize: 14.5, color: 'var(--faint)' }}>Ask Clark anything…</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(86,141,179,0.35)', cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/>
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
