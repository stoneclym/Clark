/**
 * Passcode hashing for the front-end lock-screen fallback. This is a
 * casual access gate (stop a passerby from seeing the UI), not a security
 * boundary — Supabase RLS is intentionally off. SHA-256 is cheap and
 * correct for that threat model; no need for a slower KDF here.
 */
async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const hashPasscode = sha256Hex

export async function verifyPasscode(pin, storedHash) {
  if (!storedHash) return false
  const hash = await hashPasscode(pin)
  return hash === storedHash
}
