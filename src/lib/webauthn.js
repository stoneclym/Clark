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

function base64ToBuffer(base64) {
  const bin = atob(base64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
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
 * Authenticate using a previously registered credential.
 * Returns true if successful.
 */
export async function authenticateBiometric(credentialId) {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn not supported in this browser.')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: credentialId ? [{
        id: base64ToBuffer(credentialId),
        type: 'public-key',
      }] : [],
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
