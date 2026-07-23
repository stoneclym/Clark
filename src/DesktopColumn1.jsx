import { useState } from 'react'
import { useTasks } from './hooks/useTasks.js'
import { BrainDumpCard, TasksCard } from './TodayScreen.jsx'
import AskScreen from './AskScreen.jsx'
import DesktopHeader from './DesktopHeader.jsx'
import { SPACE } from './lib/spacing.js'

/** Column 1 — the header (Batch 10: literally the first item of this
    column's own flex stack, not a separate row above it), then Brain
    Dump + Tasks normally; tapping the Ask Clark button replaces Brain
    Dump/Tasks with a full chat view that fills the rest of the column.
    Brain Dump/Tasks state (draft text, filter, expanded class groups) is
    preserved across the swap since they're just not rendered while
    expanded, not torn down.

    Tasks is this column's one flexible "filler" card — it grows to fill
    whatever space remains after the header and Brain Dump, even with
    few tasks, so column 1 always bottoms out level with column 2 (the
    reference height — see DesktopApp.jsx's grid stretch). */
export default function DesktopColumn1({ onOpenSettings, onLock, askExpanded, onToggleAsk, onCloseAsk, dimmed, onDismiss }) {
  const { tasks, toggleTask, refetch } = useTasks()
  const [filter, setFilter] = useState('All')

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: SPACE.card, height: '100%' }}>
      <DesktopHeader
        onOpenSettings={onOpenSettings}
        onLock={onLock}
        askExpanded={askExpanded}
        onToggleAsk={onToggleAsk}
      />

      <div style={{ display: askExpanded ? 'none' : 'flex', flexDirection: 'column', gap: SPACE.card, flex: 1, minHeight: 0 }}>
        <BrainDumpCard onParsed={refetch} />
        <TasksCard fill tasks={tasks} toggleTask={toggleTask} filter={filter} onFilter={setFilter} />
      </div>

      {askExpanded && (
        <div style={{
          flex: 1, minHeight: 0,
          background: 'var(--card)', borderRadius: 22, boxShadow: 'var(--card-shadow)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <AskScreen onBack={onCloseAsk} />
        </div>
      )}

      {dimmed && (
        <div
          onClick={onDismiss}
          style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,0.35)', borderRadius: 22, transition: 'opacity var(--spring)', cursor: 'pointer' }}
        />
      )}
    </div>
  )
}
