import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from './lib/motionPrefs.js'
import { sheetOpened, sheetClosed } from './lib/sheetStack.js'

const SWIPE_THRESHOLD = 48
const VELOCITY_THRESHOLD = 0.5 // px/ms flick — closes even short of the distance threshold
const RUBBER_BAND = 0.25 // resistance when dragging past the sheet's resting position
const CLOSE_ANIM_MS = 280

/**
 * Shared bottom sheet — glass scrim + slide-up panel with velocity-aware
 * swipe-down and tap-outside dismiss. Generalizes the pattern CalendarCard's
 * DaySheet already used, so Calendar/Ask Clark don't each build their own.
 *
 * variant="peek": inset bottom sheet, maxHeight 70vh (quick-peek use).
 * variant="full": near-fullscreen, edge-to-edge, ~94vh (full-browse use).
 * keepMounted: never unmount children on close (just animate off-screen) —
 *   for sheets whose content needs to survive being "closed", e.g. Ask
 *   Clark's conversation surviving a tab switch.
 * flush: content fills the panel with no default padding/scroll, so the
 *   child can own its own header/scroll-region/footer layout.
 */
export default function Sheet({ open, onClose, variant = 'peek', children, ariaLabel, keepMounted = false, flush = false }) {
  const reducedMotion = useReducedMotion()
  const [rendered, setRendered] = useState(open)
  const [entered, setEntered] = useState(false)
  const drag = useRef(null) // { y, t }
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    if (open) {
      sheetOpened()
      setRendered(true)
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => { cancelAnimationFrame(raf1); sheetClosed() }
    }
    setEntered(false)
    if (keepMounted) return
    const t = setTimeout(() => setRendered(false), CLOSE_ANIM_MS)
    return () => clearTimeout(t)
  }, [open])

  if (!rendered) return null

  const isFull = variant === 'full'

  const onTouchStart = (e) => {
    if (reducedMotion) return
    drag.current = { y: e.touches[0].clientY, t: Date.now() }
  }
  const onTouchMove = (e) => {
    if (!drag.current) return
    const dy = e.touches[0].clientY - drag.current.y
    setDragY(dy > 0 ? dy : dy * RUBBER_BAND)
  }
  const onTouchEnd = (e) => {
    if (!drag.current) return
    const dy = e.changedTouches[0].clientY - drag.current.y
    const dt = Math.max(1, Date.now() - drag.current.t)
    const velocity = dy / dt
    drag.current = null
    setDragY(0)
    if (dy > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) onClose()
  }
  const dragging = drag.current != null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        // The container itself must never intercept touches — only its
        // scrim/panel children opt into pointerEvents individually. This
        // matters most for keepMounted sheets (Ask Clark), which stay in
        // the DOM permanently after the first open.
        pointerEvents: 'none',
      }}
    >
      {/* A separate sibling above the panel — not a shared parent — so its
          dark tint never sits directly behind the glass panel. Stacking
          them (parent dims, child is also glass) would make the panel's
          own backdrop-filter sample that darkness and look dimmed too. */}
      <div
        onClick={onClose}
        style={{
          flex: 1,
          background: entered ? 'rgba(20,18,14,0.35)' : 'rgba(20,18,14,0)',
          transition: 'background 0.25s ease',
          pointerEvents: entered ? 'auto' : 'none',
        }}
      />
      <div
        role="dialog"
        aria-label={ariaLabel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          borderRadius: '22px 22px 0 0',
          width: '100%',
          // dvh (not vh) for the full variant so it still shrinks correctly
          // when the on-screen keyboard opens (e.g. Ask Clark's input).
          height: isFull ? '94dvh' : undefined,
          maxHeight: isFull ? '94dvh' : '70vh',
          overflow: 'hidden',
          boxShadow: '0 -6px 30px rgba(20,18,14,0.18)',
          opacity: reducedMotion ? (entered ? 1 : 0) : 1,
          // opacity:0 alone doesn't drop hit-testing — only relevant under
          // reduced motion, where there's no off-screen transform to move
          // the panel's hit box out of the way when "closed".
          pointerEvents: reducedMotion && !entered ? 'none' : 'auto',
          transform: reducedMotion ? 'none' : (entered ? `translateY(${dragY}px)` : 'translateY(100%)'),
          transition: reducedMotion
            ? 'opacity 120ms linear'
            : (dragging ? 'none' : 'transform var(--spring)'),
        }}
      >
        {/* Plain filler clipped by the wrapper's own overflow:hidden above
            — see the App.css .glass comment for why the blur/border live
            here rather than directly on the rounded wrapper. */}
        <div className="glass" style={{ position: 'absolute', inset: 0, borderBottom: 'none' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)' }} />
          </div>
          {flush ? (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {children}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: isFull ? '0 0 20px' : '0 20px 30px' }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
