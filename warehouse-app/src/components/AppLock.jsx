import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import { Lock, Delete, Fingerprint } from 'lucide-react'
import { hasBiometric, isBiometricAvailable, authenticateBiometric } from '../utils/biometric'

export default function AppLock({ children, onUnlock }) {
  const { user } = useApp()
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [bioReady, setBioReady] = useState(false)
  const [bioError, setBioError] = useState('')

  const getPIN = useCallback(() => {
    if (!user) return null
    return localStorage.getItem(`wh_pin_${user.id}`) || null
  }, [user])

  const unlock = useCallback(() => {
    setLocked(false)
    setPin('')
    onUnlock?.()
  }, [onUnlock])

  useEffect(() => {
    if (!user) return
    const check = async () => {
      if (hasBiometric(user.id)) {
        const avail = await isBiometricAvailable()
        setBioReady(avail)
      } else {
        setBioReady(false)
      }
    }
    check()
  }, [user])

  useEffect(() => {
    const handler = () => {
      if (!document.hidden) {
        const storedPin = getPIN()
        if (storedPin) setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [getPIN])

  useEffect(() => {
    if (!user) return
    const storedPin = getPIN()
    if (storedPin) setLocked(true)
  }, [user, getPIN])

  const handleDigit = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)
    setBioError('')
    if (next.length === 4) {
      if (next === getPIN()) {
        unlock()
      } else {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 600)
      }
    }
  }

  const handleDel = () => setPin(p => p.slice(0, -1))

  const handleBiometric = async () => {
    setBioError('')
    const res = await authenticateBiometric(user.id)
    if (res.success) {
      unlock()
    } else {
      setBioError(res.error || 'Xatolik')
      setTimeout(() => setBioError(''), 2500)
    }
  }

  if (!locked) return children

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col items-center justify-center gap-8 px-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
          <Lock size={32} className="text-primary-400" />
        </div>
        <p className="text-white font-semibold text-xl">OmborBek</p>
        <p className="text-slate-400 text-sm">PIN kiriting</p>
      </div>

      <div className={`flex gap-4 transition-all ${error ? 'animate-shake' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? (error ? 'bg-red-400 border-red-400' : 'bg-primary-400 border-primary-400')
                : 'border-slate-600'
            }`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {[1,2,3,4,5,6,7,8,9,'',0,'del'].map((d, i) => (
          d === '' ? (
            bioReady ? (
              <button key={i} onClick={handleBiometric}
                className="h-16 rounded-2xl bg-primary-500/15 text-primary-400 flex items-center justify-center active:bg-primary-500/30 transition-colors">
                <Fingerprint size={26} />
              </button>
            ) : <div key={i} />
          ) :
          d === 'del' ? (
            <button key={i} onClick={handleDel}
              className="h-16 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center active:bg-slate-700 transition-colors">
              <Delete size={20} />
            </button>
          ) : (
            <button key={i} onClick={() => handleDigit(String(d))}
              className="h-16 rounded-2xl bg-slate-800 text-white text-xl font-semibold flex items-center justify-center active:bg-slate-700 transition-colors">
              {d}
            </button>
          )
        ))}
      </div>

      {bioError && (
        <p className="text-red-400 text-sm text-center">{bioError}</p>
      )}

      {bioReady && (
        <p className="text-slate-500 text-xs text-center">
          Barmoq izi / Yuz ID bilan ham kirishingiz mumkin
        </p>
      )}
    </div>
  )
}
