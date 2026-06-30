import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'

const GREETING = {
  id: 'g0', role: 'clark',
  text: "Hey — I'm Clark. Ask me anything about your schedule, tasks, grades, or inbox.",
}

export default function AskScreen({ onBack }) {
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window === 'undefined' ? '100dvh' : `${window.visualViewport?.height || window.innerHeight}px`
  ))

  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(`${window.visualViewport?.height || window.innerHeight}px`)
    }

    updateViewportHeight()
    window.visualViewport?.addEventListener('resize', updateViewportHeight)
    window.visualViewport?.addEventListener('scroll', updateViewportHeight)
    window.addEventListener('resize', updateViewportHeight)

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportHeight)
      window.visualViewport?.removeEventListener('scroll', updateViewportHeight)
      window.removeEventListener('resize', updateViewportHeight)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
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
    }
  }, [messages, loading])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }, [input, send])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: viewportHeight,
      maxHeight: viewportHeight,
      background: 'var(--bg)',
      position: 'fixed', inset: 0,
      zIndex: 10,
      overflow: 'hidden',
      overscrollBehavior: 'none',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg)',
        padding: '20px 16px 14px',
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
          <div>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1, color: 'var(--text)' }}>
              Ask Clark
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}/>
              Sees your schedule, tasks &amp; inbox
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([GREETING])}
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
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px 14px' }}>
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
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '10px 14px max(14px, env(safe-area-inset-bottom))',
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
            placeholder="Ask Clark anything… (use mic on keyboard for voice)"
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

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={isUser ? {
        maxWidth: '80%',
        background: 'var(--accent)', color: '#fff',
        padding: '11px 15px', borderRadius: '18px 18px 5px 18px',
        fontSize: 14.5, lineHeight: 1.5,
      } : {
        maxWidth: '88%',
        background: 'var(--cardAlt)', color: 'var(--text)',
        border: '1px solid var(--border)',
        padding: '12px 15px', borderRadius: '18px 18px 18px 5px',
        fontSize: 14.5, lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.text}
      </div>
    </div>
  )
}
