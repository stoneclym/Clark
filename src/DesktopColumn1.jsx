import { useState } from 'react'
import { useTasks } from './hooks/useTasks.js'
import { BrainDumpCard, TasksCard } from './TodayScreen.jsx'
import AskScreen from './AskScreen.jsx'

/** Column 1 — Brain Dump + Tasks normally; tapping the header's Ask Clark
    button (see DesktopHeader) replaces both with a full chat view that
    fills the column, via `askExpanded` lifted up in DesktopApp. Brain
    Dump/Tasks state (draft text, filter, expanded class groups) is
    preserved across the swap since they're just not rendered while
    expanded, not torn down. */
export default function DesktopColumn1({ askExpanded, onCloseAsk, dimmed }) {
  const { tasks, toggleTask, refetch } = useTasks()
  const [filter, setFilter] = useState('All')

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: askExpanded ? 'none' : 'flex', flexDirection: 'column', gap: 18 }}>
        <BrainDumpCard onParsed={refetch} />
        <div style={{ maxHeight: 440, overflowY: 'auto', borderRadius: 22 }}>
          <TasksCard tasks={tasks} toggleTask={toggleTask} filter={filter} onFilter={setFilter} />
        </div>
      </div>

      {askExpanded && (
        <div style={{
          height: 'calc(100vh - 210px)',
          background: 'var(--card)', borderRadius: 22, boxShadow: 'var(--card-shadow)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <AskScreen onBack={onCloseAsk} />
        </div>
      )}

      {dimmed && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,0.35)', borderRadius: 22, transition: 'opacity var(--spring)' }} />
      )}
    </div>
  )
}
