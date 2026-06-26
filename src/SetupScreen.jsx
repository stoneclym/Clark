import { useState, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { registerBiometric, storeCredentialId } from './lib/webauthn.js'

const STEP_META = [
  { title: 'Register Face ID', desc: 'Biometric sign-in — no passwords' },
  { title: 'First day & A/B day', desc: 'Sets the alternating block rhythm' },
  { title: 'No-school dates', desc: 'Holidays the pattern skips' },
  { title: 'A-day schedule', desc: 'Classes and period times' },
  { title: 'B-day schedule', desc: 'Classes and period times' },
  { title: 'Cape Fear classes', desc: 'Daily, by semester' },
  { title: 'Connect Gmail', desc: 'Forwarded school email' },
]

const DEFAULT_PERIODS = [
  { name: 'Period 1', start: '8:00 AM', end: '9:30 AM', class_name: '' },
  { name: 'Period 2', start: '9:35 AM', end: '11:05 AM', class_name: '' },
  { name: 'Advisory', start: '11:05 AM', end: '11:25 AM', class_name: 'Advisory' },
  { name: 'Lunch',    start: '11:25 AM', end: '12:10 PM', class_name: 'Lunch' },
  { name: 'Period 3', start: '12:15 PM', end: '1:45 PM',  class_name: '' },
  { name: 'Period 4', start: '1:50 PM',  end: '3:15 PM',  class_name: '' },
]

const inputStyle = {
  width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
  background: 'var(--card)', border: '1px solid var(--borderStrong)', borderRadius: 12,
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

const btnPrimary = {
  width: '100%', background: 'var(--accent)', color: '#fff',
  fontSize: 15, fontWeight: 600, textAlign: 'center',
  padding: 15, borderRadius: 14, cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(86,141,179,0.3)', border: 'none',
  fontFamily: 'inherit',
}

const btnSecondary = {
  width: '100%', background: 'transparent', color: 'var(--muted)',
  fontSize: 13, textAlign: 'center', padding: '8px 0',
  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
}

export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState(0)

  // Step 0: Face ID
  const [faceIdDone, setFaceIdDone] = useState(false)
  const [faceIdLoading, setFaceIdLoading] = useState(false)
  const [faceIdError, setFaceIdError] = useState('')

  // Step 1: First day
  const [firstDay, setFirstDay] = useState('')
  const [firstDayType, setFirstDayType] = useState('A')

  // Step 2: No-school dates
  const [noSchoolInput, setNoSchoolInput] = useState('')
  const [noSchoolDates, setNoSchoolDates] = useState([])

  // Steps 3–4: Schedules
  const [aSchedule, setASchedule] = useState(DEFAULT_PERIODS.map(p => ({ ...p })))
  const [bSchedule, setBSchedule] = useState(DEFAULT_PERIODS.map(p => ({ ...p })))

  // Step 5: Cape Fear
  const [capeFear1, setCapeFear1] = useState('')
  const [capeFear2, setCapeFear2] = useState('')

  // Save
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const registerFaceId = useCallback(async () => {
    setFaceIdLoading(true)
    setFaceIdError('')
    try {
      const { credential_id, public_key } = await registerBiometric()
      storeCredentialId(credential_id)
      await supabase.from('webauthn_credentials').upsert({ credential_id, public_key })
      setFaceIdDone(true)
    } catch (err) {
      setFaceIdError(err.message || 'Registration failed. Try again.')
    } finally {
      setFaceIdLoading(false)
    }
  }, [])

  const addNoSchoolDate = useCallback(() => {
    const d = noSchoolInput.trim()
    if (d && !noSchoolDates.includes(d)) {
      setNoSchoolDates(prev => [...prev, d].sort())
      setNoSchoolInput('')
    }
  }, [noSchoolInput, noSchoolDates])

  const finish = useCallback(async () => {
    setSaving(true)
    setSaveError('')
    try {
      const { error } = await supabase.from('settings').upsert({
        first_day: firstDay || null,
        first_day_type: firstDayType,
        no_school_dates: noSchoolDates,
        a_schedule: aSchedule,
        b_schedule: bSchedule,
        cape_fear_classes: [capeFear1, capeFear2].filter(Boolean),
      })
      if (error) throw error
      onComplete()
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Try again.')
      setSaving(false)
    }
  }, [firstDay, firstDayType, noSchoolDates, aSchedule, bSchedule, capeFear1, capeFear2, onComplete])

  const progress = (step + 1) / STEP_META.length

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '36px 22px 48px' }}>
        {/* Header */}
        <div style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--accentText)', fontWeight: 600,
        }}>
          Step {step + 1} of {STEP_META.length}
        </div>
        <div style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 28, fontWeight: 600, lineHeight: 1.1, marginTop: 8,
          letterSpacing: '-0.015em', color: 'var(--text)',
          whiteSpace: 'pre-line',
        }}>
          {step === 0 ? 'Let\'s set up\nClark.' : STEP_META[step].title}
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: '10px 0 0' }}>
          {step === 0
            ? 'Seven quick steps — about five minutes. Clark will know your schedule, your classes, and your inbox by the end.'
            : STEP_META[step].desc}
        </p>

        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginTop: 22, marginBottom: 28 }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%',
            background: 'var(--accent)', borderRadius: 999,
            transition: 'width 0.35s ease',
          }}/>
        </div>

        {/* Step content */}
        {step === 0 && (
          <StepFaceId
            done={faceIdDone}
            loading={faceIdLoading}
            error={faceIdError}
            onRegister={registerFaceId}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepFirstDay
            firstDay={firstDay} setFirstDay={setFirstDay}
            firstDayType={firstDayType} setFirstDayType={setFirstDayType}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepNoSchool
            dates={noSchoolDates}
            input={noSchoolInput} setInput={setNoSchoolInput}
            onAdd={addNoSchoolDate}
            onRemove={(d) => setNoSchoolDates(ds => ds.filter(x => x !== d))}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepSchedule
            label="A-day"
            schedule={aSchedule} setSchedule={setASchedule}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepSchedule
            label="B-day"
            schedule={bSchedule} setSchedule={setBSchedule}
            onNext={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <StepCapeFear
            c1={capeFear1} setC1={setCapeFear1}
            c2={capeFear2} setC2={setCapeFear2}
            onNext={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <StepGmail
            saving={saving} error={saveError}
            onFinish={finish}
          />
        )}

        {/* Back link (all steps after first) */}
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ ...btnSecondary, marginTop: 16, opacity: 0.6 }}>
            ← Back
          </button>
        )}

        {/* Step list preview */}
        <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          {STEP_META.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 0',
              borderBottom: i < STEP_META.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: i < step ? 0.45 : 1,
            }}>
              <div style={i === step ? {
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: 'var(--accent)', color: '#fff',
              } : i < step ? {
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, background: 'var(--accentSoft)',
              } : {
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                border: '1.5px solid var(--border)', color: 'var(--faint)',
              }}>
                {i < step ? (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--accentText)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                ) : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: i === step ? 600 : 500, color: i === step ? 'var(--text)' : 'var(--muted)' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{s.desc}</div>
              </div>
              {i === step && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--accentText)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Now
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Step components ───────────────────────────────────── */

function StepFaceId({ done, loading, error, onRegister, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
        padding: '28px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', boxShadow: '0 1px 2px rgba(40,36,28,0.05)',
      }}>
        {done ? (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--accentSoft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, marginTop: 14, color: 'var(--text)' }}>
              Face ID registered
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
              You're all set for biometric unlock.
            </div>
          </>
        ) : (
          <>
            <svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 16V11a5 5 0 0 1 5-5h5M32 6h5a5 5 0 0 1 5 5v5M42 32v5a5 5 0 0 1-5 5h-5M16 42h-5a5 5 0 0 1-5-5v-5"/>
              <path d="M18 20v3M30 20v3M24 19v6l-2.4 1.6"/>
              <path d="M18 30.5c1.8 1.8 4 2.6 6 2.6s4.2-.8 6-2.6"/>
            </svg>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 18, fontWeight: 600, marginTop: 14, color: 'var(--text)' }}>
              Set up Face ID
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
              No usernames, no passwords. Just you, every time you open Clark.
            </div>
            {error && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: '#C0392B', background: 'rgba(192,57,43,0.08)', padding: '8px 12px', borderRadius: 8, width: '100%', textAlign: 'left' }}>
                {error}
              </div>
            )}
            <button
              onClick={!loading ? onRegister : undefined}
              style={{
                ...btnPrimary, marginTop: 18,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Registering…' : 'Register Face ID'}
            </button>
          </>
        )}
      </div>

      {done && (
        <button onClick={onNext} style={btnPrimary}>Continue</button>
      )}
      {!done && (
        <button onClick={onNext} style={btnSecondary}>Skip for now</button>
      )}
    </div>
  )
}

function StepFirstDay({ firstDay, setFirstDay, firstDayType, setFirstDayType, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          First day of school
        </label>
        <input
          type="date"
          value={firstDay}
          onChange={e => setFirstDay(e.target.value)}
          style={inputStyle}
        />
        <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>
          Clark uses this to calculate every A/B day from today forward.
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Was that an A-day or B-day?
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['A', 'B'].map(t => (
            <button
              key={t}
              onClick={() => setFirstDayType(t)}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 16, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                background: firstDayType === t ? 'var(--accent)' : 'var(--card)',
                color: firstDayType === t ? '#fff' : 'var(--muted)',
                border: firstDayType === t ? 'none' : '1px solid var(--borderStrong)',
                boxShadow: firstDayType === t ? '0 4px 12px rgba(86,141,179,0.3)' : 'none',
              }}
            >
              {t}-day
            </button>
          ))}
        </div>
      </div>

      <button onClick={onNext} style={{ ...btnPrimary, marginTop: 4 }}>Continue</button>
      <button onClick={onNext} style={btnSecondary}>Skip for now</button>
    </div>
  )
}

function StepNoSchool({ dates, input, setInput, onAdd, onRemove, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Add a no-school date
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="date"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onAdd()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={onAdd}
            style={{
              padding: '12px 18px', borderRadius: 12, fontFamily: 'inherit',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>
          Holidays, teacher workdays, breaks — anything that breaks the A/B pattern.
        </div>
      </div>

      {dates.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {dates.map(d => (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--cardAlt)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 10px',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{d}</span>
              <span
                onClick={() => onRemove(d)}
                style={{ fontSize: 15, color: 'var(--faint)', cursor: 'pointer', lineHeight: 1 }}
              >×</span>
            </div>
          ))}
        </div>
      )}

      {dates.length === 0 && (
        <div style={{
          padding: '16px', borderRadius: 14, background: 'var(--cardAlt)',
          border: '1px solid var(--border)', textAlign: 'center',
          fontSize: 13, color: 'var(--faint)',
        }}>
          No dates added yet
        </div>
      )}

      <button onClick={onNext} style={{ ...btnPrimary, marginTop: 4 }}>Continue</button>
      <button onClick={onNext} style={btnSecondary}>Skip for now</button>
    </div>
  )
}

function StepSchedule({ label, schedule, setSchedule, onNext }) {
  const updatePeriod = (i, field, value) => {
    setSchedule(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 4 }}>
        Enter your class for each {label} period. Leave blank to skip.
      </div>

      {schedule.map((period, i) => (
        <div key={i} style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accentText)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {period.name}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={period.start}
                onChange={e => updatePeriod(i, 'start', e.target.value)}
                placeholder="8:00 AM"
                style={{ ...inputStyle, width: 80, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
              />
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>–</span>
              <input
                type="text"
                value={period.end}
                onChange={e => updatePeriod(i, 'end', e.target.value)}
                placeholder="9:30 AM"
                style={{ ...inputStyle, width: 80, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
              />
            </div>
          </div>
          <input
            type="text"
            value={period.class_name}
            onChange={e => updatePeriod(i, 'class_name', e.target.value)}
            placeholder="Class name (e.g. IB English)"
            style={{ ...inputStyle, padding: '9px 12px' }}
          />
        </div>
      ))}

      <button onClick={onNext} style={{ ...btnPrimary, marginTop: 8 }}>Continue</button>
      <button onClick={onNext} style={btnSecondary}>Skip for now</button>
    </div>
  )
}

function StepCapeFear({ c1, setC1, c2, setC2, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        Add your Cape Fear Community College courses. These run daily regardless of A/B day.
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Course 1
        </label>
        <input
          type="text"
          value={c1}
          onChange={e => setC1(e.target.value)}
          placeholder="e.g. Calculus I"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Course 2 (optional)
        </label>
        <input
          type="text"
          value={c2}
          onChange={e => setC2(e.target.value)}
          placeholder="e.g. Psychology 101"
          style={inputStyle}
        />
      </div>

      <button onClick={onNext} style={{ ...btnPrimary, marginTop: 4 }}>Continue</button>
      <button onClick={onNext} style={btnSecondary}>Skip for now</button>
    </div>
  )
}


function StepGmail({ saving, error, onFinish }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
        padding: '22px', boxShadow: '0 1px 2px rgba(40,36,28,0.05)',
      }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
          Forward school email to Gmail
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'In your school Outlook, go to Settings → Mail → Forwarding',
            'Add your Gmail address as a forwarding address',
            'In Gmail, create a filter: from your school domain → apply label "School"',
            'Clark reads that label automatically via the Gmail API',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accentSoft)', color: 'var(--accentText)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{step}</div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 10,
          background: 'var(--accentSoft)', fontSize: 12.5, color: 'var(--accentText)', lineHeight: 1.5,
        }}>
          You can set this up later. Clark will show a reminder in your inbox card.
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#C0392B', background: 'rgba(192,57,43,0.08)', padding: '10px 14px', borderRadius: 10 }}>
          {error}
        </div>
      )}

      <button
        onClick={!saving ? onFinish : undefined}
        style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}
      >
        {saving ? 'Setting up Clark…' : 'Finish setup'}
      </button>
    </div>
  )
}
