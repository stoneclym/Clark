import { useClubs } from './hooks/useClubs.js'

export default function ClubsScreen({ onCloseQuick }) {
  const { clubs, loading, toggleClubTask } = useClubs()

  if (loading) {
    return (
      <div onClick={onCloseQuick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>Loading clubs…</div>
      </div>
    )
  }

  return (
    <div onClick={onCloseQuick} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '2px 2px 0' }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
          Clubs
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{clubs.length} leadership roles</div>
      </div>

      {clubs.map(club => (
        <ClubCard key={club.id} club={club} onToggleTask={toggleClubTask} />
      ))}
    </div>
  )
}

function ClubCard({ club, onToggleTask }) {
  const pendingCount = club.club_tasks?.filter(t => !t.done).length ?? 0

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 20, boxShadow: '0 1px 2px rgba(40,36,28,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2, color: 'var(--text)' }}>
          {club.name}
        </div>
        {pendingCount > 0 && (
          <div style={{
            flexShrink: 0, marginTop: 2,
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: 'var(--accentSoft)', color: 'var(--accentText)',
          }}>
            {pendingCount}
          </div>
        )}
      </div>

      <div style={{
        display: 'inline-block', marginTop: 7,
        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
        background: 'var(--cardAlt)', color: 'var(--muted)',
        border: '1px solid var(--border)',
      }}>
        {club.role}
      </div>

      {club.next_meeting && (
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
              {club.next_meeting}
            </div>
          </div>
        </div>
      )}

      {club.club_tasks?.filter(t => !t.done).length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {club.club_tasks.filter(t => !t.done).map(task => (
            <div
              key={task.id}
              onClick={(e) => { e.stopPropagation(); onToggleTask(task.id, task.done) }}
              style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}
            >
              <div style={{
                width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                border: task.done ? 'none' : '1.6px solid var(--borderStrong)',
                background: task.done ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}>
                {task.done && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: 13.5,
                color: task.done ? 'var(--faint)' : 'var(--text)',
                textDecoration: task.done ? 'line-through' : 'none',
                transition: 'color 0.15s',
              }}>
                {task.task_text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
