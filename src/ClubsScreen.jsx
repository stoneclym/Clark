const CLUBS = [
  {
    id: 'c1', name: 'National Honor Society', role: 'Communications Officer',
    meeting: 'Tue, Jul 1 · 7:45 AM · Library', prominent: false,
    tasks: ['Schedule blood-drive Instagram post', 'Draft October email announcement', 'Confirm flyer copy with adviser'],
  },
  {
    id: 'c2', name: 'Beta Club', role: 'Vice President',
    meeting: 'Thu, Jul 3 · 3:30 PM · Room 118', prominent: false,
    tasks: ['Plan fall service project', 'Confirm agenda with President', 'Review October service-hours form'],
  },
  {
    id: 'c3', name: 'Spanish Club', role: 'Co-President',
    meeting: 'Tomorrow · 3:30 PM · Room 214', prominent: true,
    tasks: ['Finalize Día de los Muertos presentation', 'Email pre-meeting reminder to members'],
  },
  {
    id: 'c4', name: 'Senior Class', role: 'President · Student Council',
    meeting: 'Fri, Jun 26 · 12:10 PM · Commons', prominent: true,
    tasks: ['Collect prom venue quotes', 'Senior sunrise planning', 'Confirm class-gift vote'],
  },
]

export default function ClubsScreen({ onCloseQuick }) {
  return (
    <div onClick={onCloseQuick} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '2px 2px 0' }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
          Clubs
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>4 leadership roles</div>
      </div>

      {CLUBS.map(club => (
        <div key={club.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 20, boxShadow: '0 1px 2px rgba(40,36,28,0.05)',
        }}>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2, color: 'var(--text)' }}>
            {club.name}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 7,
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
            background: 'var(--accentSoft)', color: 'var(--accentText)',
          }}>
            {club.role}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 11, marginTop: 14,
            background: club.prominent ? 'var(--accentSoft)' : 'var(--cardAlt)',
            border: club.prominent ? 'none' : '1px solid var(--border)',
            borderRadius: 13, padding: '11px 13px',
            color: club.prominent ? 'var(--accentText)' : 'var(--muted)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <rect x="3.5" y="5" width="17" height="16" rx="2.5"/>
              <path d="M3.5 9.5h17M8 3v4M16 3v4"/>
            </svg>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.75 }}>
                Next meeting
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 1, color: 'var(--text)' }}>
                {club.meeting}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {club.tasks.map((task, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{
                  width: 17, height: 17, borderRadius: 5,
                  border: '1.6px solid var(--borderStrong)', flexShrink: 0,
                }}/>
                <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{task}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
