import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from './lib/supabase.js'
import { timeOfDayGreeting } from './lib/greeting.js'
import { triggerHaptic } from './lib/haptics.js'

function makeGreeting() {
  return {
    id: 'g0', role: 'clark',
    text: `${timeOfDayGreeting()}, Greyson. Ask me anything.`,
  }
}

export default function AskScreen({ onBack }) {
  const [messages, setMessages] = useState(() => [makeGreeting()])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const history = [
      ...messages.filter(m => m.id !== 'g0').map(m => ({
        role: m.role === 'clark' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: trimmed },
    ]

    setMessages(prev => [...prev, { id: `u${Date.now()}`, role: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ask-clark', {
        body: { messages: history },
      })
      if (error) throw error
      setMessages(prev => [...prev, { id: `c${Date.now()}`, role: 'clark', text: data.text }])
    } catch {
      setMessages(prev => [...prev, {
        id: `e${Date.now()}`, role: 'clark',
        text: 'Sorry, something went wrong. Try again in a moment.',
      }])
    } finally {
      setLoading(false)
      triggerHaptic()
    }
  }, [messages, loading])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }, [input, send])

  return (
    // Content for Sheet's `flush` mode — the panel itself (glass, drag
    // handle, slide/dismiss) is Sheet.jsx's job; this just fills it.
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {/* Header */}
      <div style={{
        padding: '4px 16px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
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
            width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 3px 8px rgba(86,141,179,0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5z"/>
              <path d="M9.5 11h.01M13 11h.01M16.5 11h.01"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1, color: 'var(--text)' }}>
            Ask Clark
          </div>
        </div>
        <button
          onClick={() => setMessages([makeGreeting()])}
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--muted)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
      </div>

      {/* Messages — scrolls independently */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px 14px' }}>
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--cardAlt)', border: '1px solid var(--border)',
              borderRadius: '18px 18px 18px 5px', padding: '14px 18px',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--faint)',
                  animation: `clarkPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input — always at bottom, above keyboard */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 14px 28px',
        display: 'flex', alignItems: 'flex-end', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'var(--card)', border: '1px solid var(--borderStrong)',
          borderRadius: 22, padding: '10px 14px',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Clark anything"
            rows={1}
            style={{
              flex: 1, fontSize: 14.5, fontFamily: 'inherit',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', resize: 'none', overflowY: 'hidden',
              lineHeight: 1.45,
              minHeight: 22, maxHeight: 120,
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
          />
          {input.trim() && (
            <button
              onClick={() => send(input)}
              style={{
                flexShrink: 0, padding: 0, background: 'none', border: 'none',
                color: 'var(--accent)', cursor: 'pointer', display: 'flex',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const markdownComponents = {
  p: ({ node, ...props }) => <p style={{ margin: '0 0 8px', lineHeight: 1.55 }} {...props} />,
  strong: ({ node, ...props }) => <strong style={{ fontWeight: 700 }} {...props} />,
  em: ({ node, ...props }) => <em {...props} />,
  ul: ({ node, ...props }) => <ul style={{ margin: '0 0 8px', paddingLeft: 20 }} {...props} />,
  ol: ({ node, ...props }) => <ol style={{ margin: '0 0 8px', paddingLeft: 20 }} {...props} />,
  li: ({ node, ...props }) => <li style={{ marginBottom: 3 }} {...props} />,
  a: ({ node, ...props }) => <a style={{ color: 'var(--accentText)' }} target="_blank" rel="noopener noreferrer" {...props} />,
  code: ({ node, inline, ...props }) => inline
    ? <code style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px', fontSize: '0.9em', fontFamily: 'ui-monospace, monospace' }} {...props} />
    : <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.9em' }} {...props} />,
  pre: ({ node, ...props }) => (
    <pre style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', overflowX: 'auto', margin: '0 0 8px' }} {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote style={{ margin: '0 0 8px', paddingLeft: 12, borderLeft: '3px solid var(--border)', color: 'var(--muted)' }} {...props} />
  ),
  h1: ({ node, ...props }) => <div style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 8px' }} {...props} />,
  h2: ({ node, ...props }) => <div style={{ fontSize: 16, fontWeight: 700, margin: '2px 0 8px' }} {...props} />,
  h3: ({ node, ...props }) => <div style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 6px' }} {...props} />,
  hr: ({ node, ...props }) => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} {...props} />,
  table: ({ node, ...props }) => (
    <div style={{ overflowX: 'auto', margin: '0 0 8px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.95em' }} {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead {...props} />,
  th: ({ node, ...props }) => (
    <th style={{ textAlign: 'left', padding: '5px 10px', borderBottom: '1.5px solid var(--borderStrong)', fontWeight: 700, whiteSpace: 'nowrap' }} {...props} />
  ),
  td: ({ node, ...props }) => (
    <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }} {...props} />
  ),
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={isUser ? {
        maxWidth: '80%',
        background: 'var(--accent)', color: '#fff',
        padding: '11px 15px', borderRadius: '18px 18px 5px 18px',
        fontSize: 14.5, lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      } : {
        maxWidth: '88%',
        background: 'var(--cardAlt)', color: 'var(--text)',
        border: '1px solid var(--border)',
        padding: '12px 15px', borderRadius: '18px 18px 18px 5px',
        fontSize: 14.5,
      }}>
        {isUser
          ? msg.text
          : (
            <div className="clark-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.text}</ReactMarkdown>
            </div>
          )}
      </div>
    </div>
  )
}
