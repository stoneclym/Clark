import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase.js'
import { getStoredCredentialId, authenticateBiometric } from './lib/webauthn.js'
import { hashPasscode, verifyPasscode } from './lib/passcode.js'

const PIN_PATTERN = /^\d{4,6}$/
const REVEAL_MS = 400

/** Numeric passcode field — shows each digit briefly as it's typed, then
    masks it to a dot (matches the standard iOS passcode entry behavior). */
function PasscodeInput({ value, onChange, placeholder, autoFocus }) {
  const [revealedIndex, setRevealedIndex] = useState(null)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    if (digits.length > value.length) {
      setRevealedIndex(digits.length - 1)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setRevealedIndex(null), REVEAL_MS)
    } else {
      setRevealedIndex(null)
    }
    onChange(digits)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        aria-label={placeholder}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 'none', padding: 0, margin: 0 }}
      />
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          minHeight: 26, padding: '12px 10px', borderRadius: 12,
          border: '1px solid var(--borderStrong)', background: 'var(--card)', cursor: 'text',
        }}
      >
        {value.length === 0 && placeholder && (
          <span style={{ fontSize: 14, color: 'var(--faint)' }}>{placeholder}</span>
        )}
        {Array.from(value).map((digit, i) => (
          <span key={i} style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', width: 14, textAlign: 'center' }}>
            {i === revealedIndex ? digit : '•'}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Front-end lock screen — casual access gate only (stop a passerby from
 * seeing the UI), not a security boundary. Handles Face ID/Touch ID via
 * WebAuthn with a passcode fallback, and the "reset Face ID" escape hatch
 * (now gated behind the passcode too, so it isn't a free bypass).
 */
export default function LockScreen({ onUnlock }) {
  // 'checking' | 'biometric' | 'passcode' | 'passcode-setup'
  const [phase, setPhase] = useState('checking')
  const [settingsId, setSettingsId] = useState(null)
  const [passcodeHash, setPasscodeHash] = useState(null)
  const [message, setMessage] = useState(null)
  const [resetMode, setResetMode] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data } = await supabase
        .from('settings')
        .select('id, passcode_hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      setSettingsId(data?.id ?? null)
      setPasscodeHash(data?.passcode_hash ?? null)

      const credId = getStoredCredentialId()
      const canUseBiometric = credId && await isPlatformAuthenticatorAvailable()
      if (cancelled) return

      if (canUseBiometric) {
        setPhase('biometric')
        attemptBiometric(credId, data?.passcode_hash ?? null)
      } else {
        setPhase(data?.passcode_hash ? 'passcode' : 'passcode-setup')
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const attemptBiometric = useCallback(async (credId, hash) => {
    try {
      await authenticateBiometric(credId)
      onUnlock()
    } catch {
      setMessage('Biometric login unavailable — enter your passcode.')
      setPhase(hash ? 'passcode' : 'passcode-setup')
    }
  }, [onUnlock])

  const retryBiometric = () => {
    const credId = getStoredCredentialId()
    setPhase('biometric')
    setMessage(null)
    attemptBiometric(credId, passcodeHash)
  }

  const showPasscode = () => {
    setMessage(null)
    setResetMode(false)
    setPhase(passcodeHash ? 'passcode' : 'passcode-setup')
  }

  const showResetPasscode = () => {
    setMessage(null)
    setResetMode(true)
    setPhase('passcode')
  }

  const submitPasscode = async (e) => {
    e.preventDefault()
    setError(null)
    const ok = await verifyPasscode(pin, passcodeHash)
    if (!ok) {
      setError('Incorrect passcode.')
      setPin('')
      return
    }
    onUnlock({ reset: resetMode })
  }

  const submitPasscodeSetup = async (e) => {
    e.preventDefault()
    setError(null)
    if (!PIN_PATTERN.test(pin)) {
      setError('Passcode must be 4-6 digits.')
      return
    }
    if (pin !== confirmPin) {
      setError('Passcodes don\'t match.')
      setConfirmPin('')
      return
    }
    const hash = await hashPasscode(pin)
    if (settingsId) {
      await supabase.from('settings').update({ passcode_hash: hash }).eq('id', settingsId)
    }
    onUnlock()
  }

  const wrap = (children) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 32, fontWeight: 600, color: 'var(--text)' }}>
        Clark
      </div>
      {children}
    </div>
  )

  if (phase === 'checking') {
    return wrap(null)
  }

  if (phase === 'biometric') {
    return wrap(
      <>
        <div
          onClick={retryBiometric}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(86,141,179,0.4)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 16V11a5 5 0 0 1 5-5h5M32 6h5a5 5 0 0 1 5 5v5M42 32v5a5 5 0 0 1-5 5h-5M16 42h-5a5 5 0 0 1-5-5v-5"/>
            <path d="M18 20v3M30 20v3M24 19v6l-2.4 1.6"/>
            <path d="M18 30.5c1.8 1.8 4 2.6 6 2.6s4.2-.8 6-2.6"/>
          </svg>
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
          Tap to unlock with Face ID / Touch ID
        </div>
        <button
          onClick={showPasscode}
          style={{
            marginTop: 4, padding: '9px 18px', borderRadius: 10,
            background: 'var(--cardAlt)', border: '1px solid var(--border)',
            fontSize: 13.5, fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Enter passcode instead
        </button>
        <button
          onClick={showResetPasscode}
          style={{
            marginTop: 0, background: 'none', border: 'none',
            fontSize: 12, color: 'var(--faint)', cursor: 'pointer',
            fontFamily: 'inherit', padding: '4px 0',
          }}
        >
          Can't unlock? Reset Face ID
        </button>
      </>
    )
  }

  if (phase === 'passcode') {
    return wrap(
      <form onSubmit={submitPasscode} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 260 }}>
        {message && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>{message}</div>
        )}
        <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
          {resetMode ? 'Enter your passcode to reset Face ID' : 'Enter your passcode'}
        </div>
        <PasscodeInput value={pin} onChange={setPin} autoFocus />
        {error && <div style={{ fontSize: 12.5, color: '#C0392B' }}>{error}</div>}
        <button
          type="submit"
          disabled={!PIN_PATTERN.test(pin)}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10,
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 600, cursor: PIN_PATTERN.test(pin) ? 'pointer' : 'default',
            opacity: PIN_PATTERN.test(pin) ? 1 : 0.5, fontFamily: 'inherit',
          }}
        >
          Unlock
        </button>
        {!resetMode && getStoredCredentialId() && (
          <button
            type="button"
            onClick={retryBiometric}
            style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--faint)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Use Face ID / Touch ID instead
          </button>
        )}
      </form>
    )
  }

  // phase === 'passcode-setup'
  return wrap(
    <form onSubmit={submitPasscodeSetup} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 260 }}>
      <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
        Set a passcode (4-6 digits)
      </div>
      <PasscodeInput value={pin} onChange={setPin} placeholder="New passcode" autoFocus />
      <PasscodeInput value={confirmPin} onChange={setConfirmPin} placeholder="Confirm passcode" />
      {error && <div style={{ fontSize: 12.5, color: '#C0392B' }}>{error}</div>}
      <button
        type="submit"
        style={{
          width: '100%', padding: '11px 0', borderRadius: 10,
          background: 'var(--accent)', color: '#fff', border: 'none',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Set passcode
      </button>
    </form>
  )
}

async function isPlatformAuthenticatorAvailable() {
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}
