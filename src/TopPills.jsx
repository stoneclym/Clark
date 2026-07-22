import { useState, useEffect, useRef } from 'react'
import { fetchWeather, SCHOOL_LOCATION_LABEL } from './lib/weather.js'
import { QUICK_LINKS, openApp } from './lib/quickLinks.js'
import { useReducedMotion } from './lib/motionPrefs.js'

function WeatherIcon({ icon }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (icon === 'sun') {
    return <svg {...common}><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>
  }
  if (icon === 'rain' || icon === 'storm') {
    return <svg {...common}><path d="M7 16.5a4.5 4.5 0 0 1 .5-9 6 6 0 0 1 11.4 2.2A4 4 0 0 1 18 17"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/></svg>
  }
  if (icon === 'snow') {
    return <svg {...common}><path d="M7 15.5a4.5 4.5 0 0 1 .5-9 6 6 0 0 1 11.4 2.2A4 4 0 0 1 18 16"/><path d="M12 17v5M9.5 18.5l5 3M14.5 18.5l-5 3"/></svg>
  }
  if (icon === 'fog') {
    return <svg {...common}><path d="M4 10h16M3 14h18M5 18h14"/></svg>
  }
  // cloud-sun / cloud (default)
  return <svg {...common}><path d="M7 16.5a4.5 4.5 0 0 1 .5-9 6 6 0 0 1 11.4 2.2A4 4 0 0 1 18 17H7z"/></svg>
}

function WeatherPill() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchWeather().then(w => { if (!cancelled) setWeather(w) })
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{
      flex: 1.3, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 999, padding: '7px 14px',
    }}>
      <div style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accentText)' }}>
        <WeatherIcon icon={weather?.icon || 'cloud'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.15 }}>
          {weather ? `${weather.tempF}°` : '—'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {SCHOOL_LOCATION_LABEL}
        </div>
      </div>
    </div>
  )
}

function AppsPill() {
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState(0)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    return () => document.removeEventListener('click', onDocClick, true)
  }, [open])

  useEffect(() => {
    if (open && contentRef.current) setMaxHeight(contentRef.current.scrollHeight)
    else setMaxHeight(0)
  }, [open])

  return (
    <div ref={rootRef} style={{ flex: 1, position: 'relative' }}>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: open ? 'var(--accentSoft)' : 'var(--card)',
          border: open ? '1px solid transparent' : '1px solid var(--border)',
          color: open ? 'var(--accentText)' : 'var(--muted)',
          borderRadius: 999, padding: '7px 14px', cursor: 'pointer', height: '100%', boxSizing: 'border-box',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Apps</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="glass"
        style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, zIndex: 8,
          overflow: 'hidden', maxHeight, opacity: open ? 1 : 0,
          transition: reducedMotion ? 'opacity 120ms linear' : 'max-height var(--spring), opacity var(--spring)',
          borderRadius: 16,
          boxShadow: '0 10px 28px rgba(20,18,14,0.14)',
        }}
      >
        <div ref={contentRef}>
          {QUICK_LINKS.map((ql, i) => {
            const delay = reducedMotion ? 0 : (open ? i * 30 : 0)
            return (
            <div
              key={ql.id}
              onClick={() => { openApp(ql.deepLink, ql.webUrl); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)', cursor: 'pointer',
                transform: reducedMotion ? 'none' : (open ? 'translateY(0)' : 'translateY(-6px)'),
                opacity: open ? 1 : 0,
                transition: reducedMotion
                  ? 'opacity 120ms linear'
                  : `transform var(--spring) ${delay}ms, opacity var(--spring) ${delay}ms`,
              }}
            >
              <img
                src={window.matchMedia?.('(prefers-color-scheme: dark)').matches ? ql.iconDark : ql.iconLight}
                alt=""
                width={32}
                height={32}
                style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, objectFit: 'cover' }}
              />
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{ql.label}</div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function TopPills() {
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <WeatherPill />
      <AppsPill />
    </div>
  )
}
