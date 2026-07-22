import { useState, useEffect, useRef } from 'react'
import { useEmails } from './hooks/useEmails.js'
import { supabase, invokeErrorMessage } from './lib/supabase.js'
import { openApp } from './lib/quickLinks.js'

export function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<(p|div|br|tr|li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function EmailRow({ m, expanded, unread, draft, drafting, copied, onToggleExpand, onDraftReply, onCopyAndOpenOutlook, innerRef }) {
  return (
    <div ref={innerRef} onClick={() => onToggleExpand(m)} style={{ padding: '14px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accentSoft)', color: 'var(--accentText)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{m.initials}</div>
        {unread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{m.from_name}</div>
        <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{new Date(m.received_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 9, color: 'var(--text)' }}>{m.subject}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>{m.snippet}</div>
      {expanded && (
        <div style={{ marginTop: 11, background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {stripHtml(m.full_content) || m.snippet}
        </div>
      )}
      {draft && (
        <div style={{ marginTop: 11, background: 'var(--cardAlt)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
          {draft}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 11 }}>
        <div onClick={(e) => { e.stopPropagation(); onDraftReply(m.id) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--accent)', padding: '7px 12px', borderRadius: 9, cursor: 'pointer', opacity: drafting ? 0.6 : 1 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>
          {drafting ? 'Drafting…' : draft ? 'Hide draft' : 'Draft reply'}
        </div>
        {draft && (
          <div
            onClick={(e) => onCopyAndOpenOutlook(e, m)}
            title={copied ? 'Copied!' : 'Copy & open in Outlook'}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, color: copied ? '#fff' : 'var(--accentText)', background: copied ? 'var(--accent)' : 'var(--accentSoft)', borderRadius: 9, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </div>
        )}
      </div>
    </div>
  )
}

/** Full inbox view — used as the Inbox tab's page content. `focusEmail`
    (an { id, token } object, token so re-tapping the same email still
    triggers a fresh scroll) comes from Today's preview card tapping a
    specific email; passing a fresh token each time avoids React bailing
    out of the effect when the same id is focused twice in a row. */
export default function InboxSheetContent({ focusEmail }) {
  const { emails, loading: emailsLoading, draftReply } = useEmails()
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState({})
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [readOverride, setReadOverride] = useState({})
  const [copied, setCopied] = useState({})
  const focusRef = useRef(null)

  useEffect(() => {
    if (focusEmail?.id) {
      setExpanded(e => ({ ...e, [focusEmail.id]: true }))
    }
  }, [focusEmail])

  useEffect(() => {
    if (focusEmail?.id && focusRef.current) {
      focusRef.current.scrollIntoView({ block: 'start' })
    }
  }, [focusEmail, emails.length])

  const toggleExpand = (m) => {
    setExpanded(e => ({ ...e, [m.id]: !e[m.id] }))
    if (!m.is_read && !readOverride[m.id]) {
      setReadOverride(r => ({ ...r, [m.id]: true }))
      supabase.from('emails').update({ is_read: true }).eq('id', m.id).then(() => {})
    }
  }

  const handleDraftReply = async (emailId) => {
    if (drafts[emailId]) { setDrafts(d => ({ ...d, [emailId]: null })); return }
    setLoading(l => ({ ...l, [emailId]: true }))
    try {
      const draft = await draftReply(emailId)
      setDrafts(d => ({ ...d, [emailId]: draft }))
    } finally {
      setLoading(l => ({ ...l, [emailId]: false }))
    }
  }

  const copyAndOpenOutlook = (e, m) => {
    e.stopPropagation()
    openApp('ms-outlook://', 'https://outlook.office.com/mail/')
    navigator.clipboard.writeText(drafts[m.id] || '').then(() => {
      setCopied(c => ({ ...c, [m.id]: true }))
      setTimeout(() => setCopied(c => ({ ...c, [m.id]: false })), 2000)
    }).catch(() => {})
  }

  const syncOutlook = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-outlook')
      if (error) setSyncError(await invokeErrorMessage(error))
      else if (data?.error) setSyncError(data.error)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ padding: '16px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
          Inbox
        </div>
        <button
          onClick={syncOutlook}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, color: 'var(--accentText)',
            background: 'var(--accentSoft)', border: 'none', borderRadius: 7,
            padding: '4px 9px', cursor: syncing ? 'default' : 'pointer',
            fontFamily: 'inherit', opacity: syncing ? 0.6 : 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {syncing ? 'Syncing…' : 'Sync Outlook'}
        </button>
      </div>
      {syncError && (
        <div style={{ fontSize: 11.5, color: '#C0392B', background: 'rgba(192,57,43,0.08)', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>
          {syncError}
        </div>
      )}
      {!emailsLoading && emails.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--faint)' }}>
          No emails yet. Tap Sync Outlook to check your inbox.
        </div>
      )}
      {emails.map(m => (
        <EmailRow
          key={m.id}
          m={m}
          innerRef={m.id === focusEmail?.id ? focusRef : undefined}
          expanded={!!expanded[m.id]}
          unread={!m.is_read && !readOverride[m.id]}
          draft={drafts[m.id]}
          drafting={!!loading[m.id]}
          copied={!!copied[m.id]}
          onToggleExpand={toggleExpand}
          onDraftReply={handleDraftReply}
          onCopyAndOpenOutlook={copyAndOpenOutlook}
        />
      ))}
    </div>
  )
}
