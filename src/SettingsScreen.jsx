import { useState, useEffect, useRef } from 'react'
import { supabase, invokeErrorMessage } from './lib/supabase.js'
import { sentenceCaseTaskTitle } from './lib/taskTitles.js'
import { getTaskDateInfo, OVERDUE_COLOR } from './lib/taskDates.js'
import { redirectToMicrosoftAuthorize } from './lib/microsoftAuth.js'
import { registerBiometric, storeCredentialId, getStoredCredentialId, clearCredentialId } from './lib/webauthn.js'
import ConfirmDialog from './ConfirmDialog.jsx'

function relativeTimestamp(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ArchiveSection({ title, items, loading, expanded, onToggle, renderItem, emptyText }) {
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(0)

  useEffect(() => {
    if (expanded && contentRef.current) {
      setMaxHeight(contentRef.current.scrollHeight)
    } else {
      setMaxHeight(0)
    }
  }, [expanded, items, loading])

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          background: 'none', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>
          {title}{items.length > 0 ? ` (${items.length})` : ''}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <div style={{ overflow: 'hidden', maxHeight, opacity: expanded ? 1 : 0, transition: 'max-height 0.28s ease, opacity 0.22s ease' }}>
        <div ref={contentRef}>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--faint)', padding: '16px 0' }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '24px 18px', textAlign: 'center',
              fontSize: 13.5, color: 'var(--faint)',
            }}>
              {emptyText}
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              {items.map((item, i) => renderItem(item, i))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ArchiveRow({ isFirst, label, sublabel, onRestore, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
      borderTop: isFirst ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        flexShrink: 0, width: 20, height: 20, borderRadius: 6,
        background: 'var(--accentSoft)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.2 4.2L19 7" stroke="var(--accentText)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through', lineHeight: 1.3 }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>{sublabel}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onRestore}
          style={{
            padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: 'var(--accentSoft)', color: 'var(--accentText)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Restore
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: 'rgba(192,57,43,0.08)', color: '#C0392B',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function SettingsScreen({ onBack }) {
  const [completedTasks, setCompletedTasks] = useState([])
  const [completedMeetings, setCompletedMeetings] = useState([])
  const [completedClubTasks, setCompletedClubTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [outlookConnecting, setOutlookConnecting] = useState(false)
  const [expanded, setExpanded] = useState({ tasks: true, meetings: false, clubTasks: false })
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  const [biometricEnabled, setBiometricEnabled] = useState(() => !!getStoredCredentialId())
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState(null)

  const registerFaceId = async () => {
    setBiometricBusy(true)
    setBiometricError(null)
    try {
      const { credential_id, public_key } = await registerBiometric()
      storeCredentialId(credential_id)
      await supabase.from('webauthn_credentials').upsert({ credential_id, public_key })
      setBiometricEnabled(true)
    } catch (err) {
      setBiometricError(err.message || 'Registration failed. Try again.')
    } finally {
      setBiometricBusy(false)
    }
  }

  const turnOffBiometric = async () => {
    const credId = getStoredCredentialId()
    clearCredentialId()
    setBiometricEnabled(false)
    if (credId) await supabase.from('webauthn_credentials').delete().eq('credential_id', credId)
  }

  const [msSettingsId, setMsSettingsId] = useState(null)
  const [msAccountEmail, setMsAccountEmail] = useState(null)
  const [msSyncing, setMsSyncing] = useState(false)
  const [msStatus, setMsStatus] = useState(null) // { type: 'error'|'success', text }

  const toggleSection = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const loadMsAccount = () => {
    supabase.from('settings').select('id, microsoft_account_email, microsoft_refresh_token')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        setMsSettingsId(data?.id ?? null)
        setMsAccountEmail(data?.microsoft_refresh_token ? data.microsoft_account_email : null)
      })
  }

  useEffect(() => {
    loadMsAccount()
    Promise.all([
      supabase.from('tasks').select('*').eq('done', true).order('created_at', { ascending: false }).limit(50),
      supabase.from('completed_meetings').select('*').order('completed_at', { ascending: false }).limit(50),
      supabase.from('club_tasks').select('*, clubs(name)').eq('done', true).order('created_at', { ascending: false }).limit(50),
    ]).then(([tasksRes, meetingsRes, clubTasksRes]) => {
      if (tasksRes.data) setCompletedTasks(tasksRes.data)
      if (meetingsRes.data) setCompletedMeetings(meetingsRes.data)
      if (clubTasksRes.data) setCompletedClubTasks(clubTasksRes.data)
      setLoading(false)
    })
  }, [])

  const connectOutlook = () => {
    setOutlookConnecting(true)
    redirectToMicrosoftAuthorize()
  }

  const disconnectMicrosoft = async () => {
    if (!msSettingsId) return
    setConfirmingDisconnect(false)
    setMsStatus(null)
    await supabase.from('settings').update({
      microsoft_access_token: null,
      microsoft_refresh_token: null,
      microsoft_token_expiry: null,
      microsoft_account_email: null,
    }).eq('id', msSettingsId)
    setMsAccountEmail(null)
  }

  const syncMicrosoft = async () => {
    setMsSyncing(true)
    setMsStatus(null)
    try {
      const [mailRes, todoRes] = await Promise.all([
        supabase.functions.invoke('sync-outlook'),
        supabase.functions.invoke('sync-todo'),
      ])
      const errors = []
      if (mailRes.error) errors.push(`Mail: ${await invokeErrorMessage(mailRes.error)}`)
      else if (mailRes.data?.error) errors.push(`Mail: ${mailRes.data.error}`)
      if (todoRes.error) errors.push(`To Do: ${await invokeErrorMessage(todoRes.error)}`)
      else if (todoRes.data?.error) errors.push(`To Do: ${todoRes.data.error}`)

      setMsStatus(errors.length
        ? { type: 'error', text: errors.join(' · ') }
        : { type: 'success', text: `Synced ${mailRes.data?.synced ?? 0} email(s), ${todoRes.data?.pushed ?? 0} reminder(s).` })
    } catch (err) {
      setMsStatus({ type: 'error', text: err instanceof Error ? err.message : 'Sync failed' })
    } finally {
      setMsSyncing(false)
    }
  }

  const restoreTask = async (id) => {
    setCompletedTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ done: false }).eq('id', id)
  }

  const deleteTask = async (id) => {
    setCompletedTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const restoreMeeting = async (meeting) => {
    setCompletedMeetings(prev => prev.filter(m => m.id !== meeting.id))
    if (meeting.club_id) {
      await supabase.from('clubs').update({ next_meeting: meeting.when_text }).eq('id', meeting.club_id)
    }
    await supabase.from('completed_meetings').delete().eq('id', meeting.id)
  }

  const deleteMeetingArchiveRow = async (id) => {
    setCompletedMeetings(prev => prev.filter(m => m.id !== id))
    await supabase.from('completed_meetings').delete().eq('id', id)
  }

  const restoreClubTask = async (id) => {
    setCompletedClubTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('club_tasks').update({ done: false }).eq('id', id)
  }

  const deleteClubTask = async (id) => {
    setCompletedClubTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('club_tasks').delete().eq('id', id)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 6,
        background: 'var(--bg)',
        padding: '20px 20px 14px',
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
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          Settings
        </div>
      </div>

      <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Microsoft (Outlook + To Do) */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>
            Outlook &amp; Microsoft To Do
          </div>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div
              onClick={!msAccountEmail && !outlookConnecting ? connectOutlook : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', cursor: !msAccountEmail && !outlookConnecting ? 'pointer' : 'default',
                opacity: outlookConnecting ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: '#0078D4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                    <path d="M8 14l16 12L40 14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="8" y="14" width="32" height="20" rx="2" stroke="#fff" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>
                    {outlookConnecting ? 'Redirecting…' : msAccountEmail ? `Connected as ${msAccountEmail}` : 'Connect Microsoft account'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>
                    {msAccountEmail ? 'Mail sync + Microsoft To Do reminders' : 'Sign in to sync mail and push reminders to Microsoft To Do'}
                  </div>
                </div>
              </div>
              {!msAccountEmail && !outlookConnecting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              )}
            </div>

            {msAccountEmail && (
              <div style={{ display: 'flex', gap: 8, padding: '0 18px 16px' }}>
                <button
                  onClick={syncMicrosoft}
                  disabled={msSyncing}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                    background: 'var(--accentSoft)', color: 'var(--accentText)',
                    border: 'none', cursor: msSyncing ? 'default' : 'pointer', fontFamily: 'inherit',
                    opacity: msSyncing ? 0.6 : 1,
                  }}
                >
                  {msSyncing ? 'Syncing…' : 'Sync now'}
                </button>
                <button
                  onClick={() => setConfirmingDisconnect(true)}
                  style={{
                    padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                    background: 'rgba(192,57,43,0.08)', color: '#C0392B',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}

            {msStatus && (
              <div style={{
                margin: '0 18px 16px', padding: '8px 12px', borderRadius: 9, fontSize: 12, lineHeight: 1.4,
                background: msStatus.type === 'error' ? 'rgba(192,57,43,0.08)' : 'var(--accentSoft)',
                color: msStatus.type === 'error' ? '#C0392B' : 'var(--accentText)',
              }}>
                {msStatus.text}
              </div>
            )}
          </div>
        </div>
        {/* Face ID / Touch ID */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>
            Face ID &amp; Touch ID
          </div>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div
              onClick={!biometricEnabled && !biometricBusy ? registerFaceId : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', cursor: !biometricEnabled && !biometricBusy ? 'pointer' : 'default',
                opacity: biometricBusy ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'var(--accentSoft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="var(--accentText)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 16V11a5 5 0 0 1 5-5h5M32 6h5a5 5 0 0 1 5 5v5M42 32v5a5 5 0 0 1-5 5h-5M16 42h-5a5 5 0 0 1-5-5v-5"/>
                    <path d="M18 20v3M30 20v3M24 19v6l-2.4 1.6"/>
                    <path d="M18 30.5c1.8 1.8 4 2.6 6 2.6s4.2-.8 6-2.6"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>
                    {biometricBusy ? 'Setting up…' : biometricEnabled ? 'Enabled on this device' : 'Set up Face ID / Touch ID'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>
                    {biometricEnabled ? 'Used to unlock Clark instead of your passcode' : 'Tap to register this device’s biometric unlock'}
                  </div>
                </div>
              </div>
              {!biometricEnabled && !biometricBusy && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              )}
            </div>

            {biometricEnabled && (
              <div style={{ display: 'flex', gap: 8, padding: '0 18px 16px' }}>
                <button
                  onClick={turnOffBiometric}
                  style={{
                    padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                    background: 'rgba(192,57,43,0.08)', color: '#C0392B',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Turn off
                </button>
              </div>
            )}

            {biometricError && (
              <div style={{
                margin: '0 18px 16px', padding: '8px 12px', borderRadius: 9, fontSize: 12, lineHeight: 1.4,
                background: 'rgba(192,57,43,0.08)', color: '#C0392B',
              }}>
                {biometricError}
              </div>
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        <ArchiveSection
          title="Completed Tasks"
          items={completedTasks}
          loading={loading}
          expanded={expanded.tasks}
          onToggle={() => toggleSection('tasks')}
          emptyText="No completed tasks yet"
          renderItem={(task, i) => {
            const dateInfo = getTaskDateInfo(task)
            return (
              <ArchiveRow
                key={task.id}
                isFirst={i === 0}
                label={sentenceCaseTaskTitle(task.title)}
                sublabel={dateInfo.label && (
                  <span style={{ color: dateInfo.isPast ? OVERDUE_COLOR : 'var(--faint)' }}>{dateInfo.label}</span>
                )}
                onRestore={() => restoreTask(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            )
          }}
        />

        {/* Completed Meetings */}
        <ArchiveSection
          title="Completed Meetings"
          items={completedMeetings}
          loading={loading}
          expanded={expanded.meetings}
          onToggle={() => toggleSection('meetings')}
          emptyText="No completed meetings yet"
          renderItem={(meeting, i) => (
            <ArchiveRow
              key={meeting.id}
              isFirst={i === 0}
              label={`${meeting.club_name} — ${meeting.when_text}`}
              sublabel={relativeTimestamp(meeting.completed_at)}
              onRestore={() => restoreMeeting(meeting)}
              onDelete={() => deleteMeetingArchiveRow(meeting.id)}
            />
          )}
        />

        {/* Completed Club Tasks */}
        <ArchiveSection
          title="Completed Club Tasks"
          items={completedClubTasks}
          loading={loading}
          expanded={expanded.clubTasks}
          onToggle={() => toggleSection('clubTasks')}
          emptyText="No completed club tasks yet"
          renderItem={(task, i) => (
            <ArchiveRow
              key={task.id}
              isFirst={i === 0}
              label={task.task_text}
              sublabel={task.clubs?.name}
              onRestore={() => restoreClubTask(task.id)}
              onDelete={() => deleteClubTask(task.id)}
            />
          )}
        />

      </div>

      <ConfirmDialog
        open={confirmingDisconnect}
        title="Disconnect Outlook?"
        body="Clark will stop syncing your inbox and reminders until you reconnect."
        confirmLabel="Disconnect"
        onCancel={() => setConfirmingDisconnect(false)}
        onConfirm={disconnectMicrosoft}
      />
    </div>
  )
}
