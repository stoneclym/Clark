import { useState, useEffect, useRef } from 'react'

const SWIPE_THRESHOLD = 48
const CLOSE_ANIM_MS = 280

/**
 * Shared bottom sheet — scrim + slide-up panel with swipe-down and
 * tap-outside dismiss. Generalizes the pattern CalendarCard's DaySheet
 * already used, so Calendar/Inbox don't each build their own.
 *
 * variant="peek": inset bottom sheet, maxHeight 70vh (quick-peek use).
 * variant="full": near-fullscreen, edge-to-edge, ~94vh (full-browse use).
 */
export default function Sheet({ open, onClose, variant = 'peek', children, ariaLabel }) {
  const [rendered, setRendered] = useState(open)
  const [entered, setEntered] = useState(false)
  const touch = useRef(null)
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    if (open) {
      setRendered(true)
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(raf1)
    }
    setEntered(false)
    const t = setTimeout(() => setRendered(false), CLOSE_ANIM_MS)
    return () => clearTimeout(t)
  }, [open])

  if (!rendered) return null

  const isFull = variant === 'full'

  const onTouchStart = (e) => { touch.current = e.touches[0].clientY }
  const onTouchMove = (e) => {
    if (touch.current == null) return
    const dy = e.touches[0].clientY - touch.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dy = e.changedTouches[0].clientY - touch.current
    touch.current = null
    setDragY(0)
    if (dy > SWIPE_THRESHOLD) onClose()
  }
  const dragging = touch.current != null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: entered ? 'rgba(20,18,14,0.35)' : 'rgba(20,18,14,0)',
        transition: 'background 0.25s ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        role="dialog"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: 'var(--card)',
          borderRadius: '22px 22px 0 0',
          width: '100%',
          height: isFull ? '94vh' : undefined,
          maxHeight: isFull ? '94vh' : '70vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -6px 30px rgba(20,18,14,0.18)',
          transform: entered ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(.32,.72,0,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: isFull ? '0 0 20px' : '0 20px 30px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
