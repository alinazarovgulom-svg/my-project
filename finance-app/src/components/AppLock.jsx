import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/AppContext'

export default function AppLock({ children }) {
  const { user } = useApp()
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    if (typeof PublicKeyCredential !== 'undefined') {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setBiometricAvailable(ok))
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      if (document.hidden && user) {
        const savedPin = user?.id ? localStorage.getItem(`finance_pin_${user.id}`) : null
        if (savedPin) setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [user])

  const handleDigit = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length === 4) {
      const savedPin = user?.id ? localStorage.getItem(`finance_pin_${user.id}`) : null
      if (next === savedPin) {
        setLocked(false)
        setPin('')
      } else {
        setError('PIN noto\'g\'ri')
        setTimeout(() => setPin(''), 600)
      }
    }
  }

  const handleBackspace = () => setPin(p => p.slice(0, -1))

  const tryBiometric = useCallback(async () => {
    if (!biometricAvailable) return
    try {
      const credIdB64 = user?.id ? localStorage.getItem(`finance_cred_${user.id}`) : null
      if (!credIdB64) {
        // No stored credential — can't do biometric
        setError('Biometrik ro\'yxatdan o\'tilmagan')
        return
      }
      const credId = Uint8Array.from(atob(credIdB64), c => c.charCodeAt(0))
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000
        }
      })
      if (assertion) {
        setLocked(false)
        setPin('')
      }
    } catch (e) {
      setError('Biometrik tekshiruv muvaffaqiyatsiz')
    }
  }, [biometricAvailable, user])

  if (!locked) return children

  return (
    <div className="fixed inset-0 bg-dark-900 z-50 flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)' }}>
        <span className="text-4xl font-black text-white">₿</span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">PulBek</h1>
      <p className="text-gray-400 text-sm mb-8">Ilovani ochish uchun PIN kiriting</p>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? 'bg-blue-500' : 'bg-dark-600 border border-dark-500'}`} />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[1,2,3,4,5,6,7,8,9].map(d => (
          <button key={d} onClick={() => handleDigit(String(d))}
            className="h-16 rounded-2xl bg-dark-700 text-white text-xl font-semibold active:bg-dark-600 transition-colors">
            {d}
          </button>
        ))}
        <button onClick={biometricAvailable ? tryBiometric : undefined}
          className="h-16 rounded-2xl bg-dark-700 text-gray-400 text-sm active:bg-dark-600 transition-colors">
          {biometricAvailable ? '👆' : ''}
        </button>
        <button onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-dark-700 text-white text-xl font-semibold active:bg-dark-600 transition-colors">
          0
        </button>
        <button onClick={handleBackspace}
          className="h-16 rounded-2xl bg-dark-700 text-gray-400 active:bg-dark-600 transition-colors flex items-center justify-center">
          <span className="text-xl">⌫</span>
        </button>
      </div>
    </div>
  )
}
