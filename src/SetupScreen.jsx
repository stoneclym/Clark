const STEPS = [
  { n: '1', title: 'Register Face ID', desc: 'Biometric sign-in — no passwords', active: true },
  { n: '2', title: 'First day & A/B day', desc: 'Sets the alternating block rhythm', active: false },
  { n: '3', title: 'No-school dates', desc: 'Holidays the pattern skips', active: false },
  { n: '4', title: 'A-day schedule', desc: 'Classes and period times', active: false },
  { n: '5', title: 'B-day schedule', desc: 'Classes and period times', active: false },
  { n: '6', title: 'Cape Fear classes', desc: 'Daily, by semester', active: false },
  { n: '7', title: 'Connect Canvas', desc: 'Personal access token', active: false },
  { n: '8', title: 'Connect Gmail', desc: 'Forwarded school email', active: false },
]

export default function SetupScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 22px 30px', background: 'var(--bg)' }}>
      <div style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'var(--accentText)', fontWeight: 600,
      }}>
        Welcome
      </div>
      <div style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontSize: 34, fontWeight: 600, lineHeight: 1.08, marginTop: 10,
        letterSpacing: '-0.015em', color: 'var(--text)',
      }}>
        Let's set up<br />Clark.
      </div>
      <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.55, margin: '12px 0 0' }}>
        Eight quick steps — about five minutes. Clark will know your schedule, your classes, and your inbox by the end.
      </p>

      {/* Face ID card */}
      <div style={{
        marginTop: 24, background: 'var(--card)',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: '24px 22px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        boxShadow: '0 1px 2px rgba(40,36,28,0.05)',
      }}>
        <svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a5 5 0 0 1 5-5h5M32 6h5a5 5 0 0 1 5 5v5M42 32v5a5 5 0 0 1-5 5h-5M16 42h-5a5 5 0 0 1-5-5v-5"/>
          <path d="M18 20v3M30 20v3M24 19v6l-2.4 1.6"/>
          <path d="M18 30.5c1.8 1.8 4 2.6 6 2.6s4.2-.8 6-2.6"/>
        </svg>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, marginTop: 14, color: 'var(--text)' }}>
          Set up Face ID
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
          No usernames, no passwords. Just you, every time you open Clark.
        </div>
        <div style={{
          marginTop: 18, width: '100%',
          background: 'var(--accent)', color: '#fff',
          fontSize: 14, fontWeight: 600, textAlign: 'center',
          padding: 13, borderRadius: 12, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(86,141,179,0.3)',
        }}>
          Register Face ID
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 11 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--faint)' }}>
          Setup steps
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Step 1 of 8</div>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: '12.5%', height: '100%', background: 'var(--accent)', borderRadius: 999 }}/>
      </div>

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 13,
            padding: '13px 2px', borderTop: '1px solid var(--border)',
          }}>
            <div style={s.active ? {
              width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: 'var(--accent)', color: '#fff',
            } : {
              width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, flexShrink: 0,
              background: 'transparent', color: 'var(--faint)',
              border: '1.6px solid var(--border)',
            }}>
              {s.n}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: s.active ? 600 : 500, color: s.active ? 'var(--text)' : 'var(--muted)' }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{s.desc}</div>
            </div>
            {s.active && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accentText)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Now
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
