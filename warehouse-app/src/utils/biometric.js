const CRED_KEY = (uid) => `wh_biometric_${uid}`

const rnd = (n) => crypto.getRandomValues(new Uint8Array(n))

const toB64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

const fromB64 = (str) => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - b64.length % 4) % 4
  return Uint8Array.from(atob(b64 + '='.repeat(pad)), c => c.charCodeAt(0))
}

export const isBiometricSupported = () =>
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'

export const isBiometricAvailable = async () => {
  if (!isBiometricSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

export const hasBiometric = (uid) => !!localStorage.getItem(CRED_KEY(uid))

export const removeBiometric = (uid) => localStorage.removeItem(CRED_KEY(uid))

export const registerBiometric = async (uid, username, displayName) => {
  try {
    const rpId = window.location.hostname || 'localhost'
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: rnd(32),
        rp: { name: 'OmborBek', id: rpId },
        user: {
          id: new TextEncoder().encode(uid),
          name: username,
          displayName: displayName || username
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      }
    })
    localStorage.setItem(CRED_KEY(uid), toB64(cred.rawId))
    return { success: true }
  } catch (e) {
    if (e.name === 'NotAllowedError') return { error: 'Bekor qilindi' }
    if (e.name === 'NotSupportedError') return { error: 'Qurilma qo\'llab-quvvatlamaydi' }
    return { error: e.message || 'Xatolik yuz berdi' }
  }
}

export const authenticateBiometric = async (uid) => {
  const stored = localStorage.getItem(CRED_KEY(uid))
  if (!stored) return { error: 'Biometrik ro\'yxatdan o\'tilmagan' }
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: rnd(32),
        allowCredentials: [{ id: fromB64(stored), type: 'public-key', transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000
      }
    })
    return { success: true }
  } catch (e) {
    if (e.name === 'NotAllowedError') return { error: 'Bekor qilindi' }
    return { error: e.message || 'Xatolik' }
  }
}
