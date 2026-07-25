// iOS Safari (including installed PWAs) has never implemented the
// standard Vibration API. Since iOS 18, programmatically clicking a
// <label> tied to a switch-styled checkbox fires a real system haptic —
// the documented workaround (same shape as the open-source `use-haptic`
// pattern). Android/other browsers get the standard Vibration API.
// Whichever isn't supported is simply a silent no-op — never throws,
// never blocks the caller. Only ever produces one generic tap; there is
// no distinguishable light/heavy/success/error range to build against.
// Exported so any document-level "outside click" listener elsewhere can
// recognize and ignore clicks this trick generates on itself — clicking
// the label makes the browser also fire a click on its associated
// checkbox (native label/control behavior), and both bubble to
// `document` just like a real user click would, which previously made
// them misread as "the user clicked outside" and dismiss whatever
// dropdown was open, immediately undoing its own toggle.
export const HAPTIC_SWITCH_ID = 'clark-haptic-switch'

export function isHapticSwitchElement(el) {
  return el?.id === HAPTIC_SWITCH_ID || el?.htmlFor === HAPTIC_SWITCH_ID
}

let hiddenLabel = null

function ensureHiddenSwitch() {
  if (hiddenLabel || typeof document === 'undefined') return hiddenLabel
  const id = HAPTIC_SWITCH_ID
  const hide = 'position:fixed; top:-999px; left:-999px; width:1px; height:1px; opacity:0; pointer-events:none;'

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = id
  input.setAttribute('switch', '')
  input.setAttribute('aria-hidden', 'true')
  input.tabIndex = -1
  input.style.cssText = hide

  const label = document.createElement('label')
  label.htmlFor = id
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText = hide

  document.body.appendChild(input)
  document.body.appendChild(label)
  hiddenLabel = label
  return label
}

export function triggerHaptic() {
  try {
    navigator.vibrate?.(10)
  } catch {
    // ignore — Vibration API just isn't available here
  }
  try {
    ensureHiddenSwitch()?.click()
  } catch {
    // ignore — iOS switch-haptic trick just isn't available here
  }
}
