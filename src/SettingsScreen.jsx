import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { sentenceCaseTaskTitle } from './lib/taskTitles.js'

const MICROSOFT_CLIENT_ID = 'c92f4bf4-9da6-4d38-b49d-715a2bee4beb'
const OUTLOOK_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'offline_access',
  'User.Read',
].join(' ')

export default function SettingsScreen({ dark, onBack }) {
  const [completedTasks, setCompletedTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [outlookConnecting, setOutlookConnecting] = useState(false)

  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .eq('done', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setCompletedTasks(data)
        setLoading(false)
      })
  }, [])

  const connectOutlook = () => {
    setOutlookConnecting(true)
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: window.location.origin,
      scope: OUTLOOK_SCOPES,
      state: 'outlook_auth',
      response_mode: 'query',
    })
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  }

  const restoreTask = async (id) => {
    setCompletedTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ done: false }).eq('id', id)
  }

  const deleteTask = async (id) => {
    setCompletedTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
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

        {/* Appearance */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>
            Appearance
          </div>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: dark ? 'rgba(86,141,179,0.15)' : 'rgba(86,141,179,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dark ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accentText)" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 12.9A9 9 0 1 1 11.1 3 7 7 0 0 0 21 12.9Z" stroke="var(--accentText)" strokeWidth="1.7" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>
                    System appearance
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>
                    Currently {dark ? 'dark' : 'light'} based on this device
                  </div>
                </div>
              </div>
              <div style={{
                padding: '5px 10px', borderRadius: 999,
                background: 'var(--accentSoft)', color: 'var(--accentText)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                textTransform: 'uppercase', flexShrink: 0,
              }}>
                Auto
              </div>
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>
            Email
          </div>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div
              onClick={!outlookConnecting ? connectOutlook : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', cursor: outlookConnecting ? 'default' : 'pointer',
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
                    {outlookConnecting ? 'Redirecting…' : 'Connect Outlook'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>
                    Sign in with your school Microsoft account
                  </div>
                </div>
              </div>
              {!outlookConnecting && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Completed tasks */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 12 }}>
            Completed Tasks
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--faint)', padding: '16px 0' }}>Loading…</div>
          ) : completedTasks.length === 0 ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '24px 18px', textAlign: 'center',
              fontSize: 13.5, color: 'var(--faint)',
            }}>
              No completed tasks yet
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              {completedTasks.map((task, i) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Checkmark */}
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
                      {sentenceCaseTaskTitle(task.title)}
                    </div>
                    {task.due_date && (
                      <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>{task.due_date}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => restoreTask(task.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: 'var(--accentSoft)', color: 'var(--accentText)',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
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
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
