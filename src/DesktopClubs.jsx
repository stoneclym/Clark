import { useClubs } from './hooks/useClubs.js'
import { ClubCard } from './ClubsScreen.jsx'
import { SPACE } from './lib/spacing.js'

/** Full-width Clubs band below the 3-column grid — reuses the exact
    same ClubCard component and useClubs() data as the mobile Clubs tab
    (role, next meeting, task list, toggle/delete behavior all included
    unchanged), just laid out as a 2x2 desktop grid instead of mobile's
    single-column stack. */
export default function DesktopClubs() {
  const { clubs, toggleClubTask, deleteMeeting } = useClubs()

  return (
    <div style={{ padding: '36px 32px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 26, fontWeight: 600, color: 'var(--text)' }}>
          Clubs
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{clubs.length} leadership roles</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACE.card }}>
        {clubs.map(club => (
          <ClubCard key={club.id} club={club} onToggleTask={toggleClubTask} onDeleteMeeting={deleteMeeting} />
        ))}
      </div>
    </div>
  )
}
