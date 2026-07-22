/**
 * WebAuthn helpers — biometric registration and authentication.
 * Clark is a single-user app: we store one credential per device.
 */

const RP_NAME = 'Clark'
const USER_ID = 'clark-user'
const USER_NAME = 'clark'

function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

/**
 * Register a new biometric credential on this device.
 * Returns the serialized credential to be stored in Supabase.
 */
export async function registerBiometric() {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn not supported in this browser.')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(USER_ID),
        name: USER_NAME,
        displayName: 'Clark',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })

  return {
    credential_id: bufferToBase64(credential.rawId),
    public_key: bufferToBase64(credential.response.getPublicKey?.() || new ArrayBuffer(0)),
  }
}

/**
 * Authenticate with whatever platform credential this device has for
 * Clark. Deliberately omits `allowCredentials` — each device (phone,
 * laptop) registers its own separate resident/discoverable credential via
 * Settings, and restricting to one remembered credential ID meant only
 * the single device that most recently registered could ever unlock.
 * Leaving the allow-list empty lets the OS present whichever credential(s)
 * exist on the device actually being used (Face ID's own key on the
 * phone, Touch ID's own key on the laptop) instead of requiring an exact
 * match against one ID.
 */
export async function authenticateBiometric() {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn not supported in this browser.')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
    },
  })

  return true
}

/** Check if a biometric credential is stored in localStorage. */
export function getStoredCredentialId() {
  return localStorage.getItem('clark_credential_id')
}

export function storeCredentialId(id) {
  localStorage.setItem('clark_credential_id', id)
}

export function clearCredentialId() {
  localStorage.removeItem('clark_credential_id')
}
