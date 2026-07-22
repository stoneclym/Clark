import { useState, useEffect, useRef } from 'react'
import { fetchWeather } from './lib/weather.js'
import { QUICK_LINKS, openApp } from './lib/quickLinks.js'

function WeatherIcon({ icon }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
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
      borderRadius: 999, padding: '10px 16px',
    }}>
      <div style={{ color: 'var(--accentText)', flexShrink: 0 }}>
        <WeatherIcon icon={weather?.icon || 'cloud'} />
      </div>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 19, fontWeight: 600, color: 'var(--text)' }}>
        {weather ? `${weather.tempF}°` : '—'}
      </div>
    </div>
  )
}

function AppsPill() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    return () => document.removeEventListener('click', onDocClick, true)
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
          borderRadius: 999, padding: '10px 14px', cursor: 'pointer', height: '100%', boxSizing: 'border-box',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Apps</span>
      </div>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 8,
            display: 'flex', gap: 9, background: 'var(--bg)',
          }}
        >
          {QUICK_LINKS.map(ql => (
            <div
              key={ql.id}
              onClick={() => { openApp(ql.deepLink, ql.webUrl); setOpen(false) }}
              style={{
                width: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                background: 'var(--cardAlt)', border: '1px solid var(--border)',
                borderRadius: 15, padding: '11px 6px', cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(20,18,14,0.12)',
              }}
            >
              <img
                src={window.matchMedia?.('(prefers-color-scheme: dark)').matches ? ql.iconDark : ql.iconLight}
                alt=""
                width={38}
                height={38}
                style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, objectFit: 'cover' }}
              />
              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: 'var(--text)' }}>{ql.label}</div>
            </div>
          ))}
        </div>
      )}
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
