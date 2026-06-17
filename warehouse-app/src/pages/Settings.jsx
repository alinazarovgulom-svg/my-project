import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { getUsers, saveUsers, hashPassword, setCurrentUser } from '../store/storage'
import { requestPermission, isGranted } from '../utils/notifications'
import { Lock, LogOut, Globe, Info, ChevronRight, Shield, Package, Boxes, Bell, BellOff, ClipboardList, Fingerprint } from 'lucide-react'
import Modal from '../components/Modal'
import { hasBiometric, isBiometricAvailable, registerBiometric, removeBiometric } from '../utils/biometric'

export default function Settings() {
  const { user, setUser, products, movements } = useApp()
  const { t, lang, changeLang } = useLang()
  const navigate = useNavigate()

  const [passModal, setPassModal] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' })
  const [pinForm, setPinForm] = useState('')
  const [passError, setPassError] = useState('')
  const [passOk, setPassOk] = useState(false)
  const [notifGranted, setNotifGranted] = useState(isGranted())
  const [notifUnsupported, setNotifUnsupported] = useState(!('Notification' in window))
  const [bioRegistered, setBioRegistered] = useState(() => hasBiometric(user?.id))
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [bioMsg, setBioMsg] = useState('')

  useEffect(() => {
    setNotifGranted(isGranted())
    isBiometricAvailable().then(setBioAvailable)
  }, [])

  const setPF = k => e => setPassForm(f => ({ ...f, [k]: e.target.value }))
  const hasPin = !!localStorage.getItem(`wh_pin_${user?.id}`)

  const handleChangePassword = () => {
    if (!passForm.current || !passForm.newPass || !passForm.confirm) { setPassError(t('fillAll')); return }
    if (passForm.newPass !== passForm.confirm) { setPassError('Parollar mos emas'); return }
    if (passForm.newPass.length < 4) { setPassError(t('passwordShort')); return }
    const users = getUsers()
    const u = users.find(u => u.id === user?.id)
    if (!u || u.passwordHash !== hashPassword(passForm.current)) { setPassError('Joriy parol noto\'g\'ri'); return }
    saveUsers(users.map(u => u.id === user?.id ? { ...u, passwordHash: hashPassword(passForm.newPass) } : u))
    setPassOk(true)
    setPassError('')
    setTimeout(() => { setPassModal(false); setPassOk(false); setPassForm({ current: '', newPass: '', confirm: '' }) }, 1500)
  }

  const handleSetPIN = () => {
    if (pinForm.length === 4) {
      localStorage.setItem(`wh_pin_${user?.id}`, pinForm)
      setPinModal(false)
      setPinForm('')
    }
  }

  const handleRemovePIN = () => {
    localStorage.removeItem(`wh_pin_${user?.id}`)
    setPinModal(false)
  }

  const handleNotifToggle = async () => {
    if (notifGranted) {
      // Brauzer ruxsatni qaytarib ololmaymiz — faqat tushuntiramiz
      alert('Bildirishnomalarni o\'chirish uchun brauzer sozlamalariga kiring.')
      return
    }
    const granted = await requestPermission()
    setNotifGranted(granted)
    if (!granted) alert('Brauzer ruxsat bermadi. Brauzer sozlamalaridan yoqing.')
  }

  const handleBioToggle = async () => {
    if (bioRegistered) {
      removeBiometric(user?.id)
      setBioRegistered(false)
      setBioMsg('Biometrik o\'chirildi')
      setTimeout(() => setBioMsg(''), 2000)
      return
    }
    setBioLoading(true)
    setBioMsg('')
    const res = await registerBiometric(user?.id, user?.username, user?.fullName)
    setBioLoading(false)
    if (res.success) {
      setBioRegistered(true)
      setBioMsg('Barmoq izi / Yuz ID ulandi!')
    } else {
      setBioMsg(res.error || 'Xatolik yuz berdi')
    }
    setTimeout(() => setBioMsg(''), 3000)
  }

  const handleLogout = () => {
    if (!confirm(t('logoutConfirm'))) return
    setCurrentUser(null)
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <h1 className="text-white text-xl font-bold">{t('settingsTitle')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Profile */}
        <div className="bg-gradient-to-br from-primary-600/15 to-emerald-600/10 rounded-2xl p-5 border border-primary-500/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xl">
              {(user?.fullName || user?.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user?.fullName || user?.username}</p>
              <p className="text-slate-400 text-sm">@{user?.username}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30 flex items-center gap-3">
            <Package size={20} className="text-blue-400" />
            <div>
              <p className="text-white font-bold text-xl">{products.length}</p>
              <p className="text-slate-400 text-xs">{t('products')}</p>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30 flex items-center gap-3">
            <Boxes size={20} className="text-primary-400" />
            <div>
              <p className="text-white font-bold text-xl">{movements.length}</p>
              <p className="text-slate-400 text-xs">Harakatlar</p>
            </div>
          </div>
        </div>

        {/* Notification toggle */}
        {!notifUnsupported && (
          <button onClick={handleNotifToggle}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-95 ${
              notifGranted
                ? 'bg-primary-500/10 border-primary-500/20'
                : 'bg-slate-800/60 border-slate-700/30'
            }`}>
            <div className="flex items-center gap-3">
              {notifGranted
                ? <Bell size={20} className="text-primary-400" />
                : <BellOff size={20} className="text-slate-400" />}
              <div className="text-left">
                <p className={`text-sm font-medium ${notifGranted ? 'text-primary-400' : 'text-white'}`}>
                  Bildirishnomalar
                </p>
                <p className="text-slate-400 text-xs">
                  {notifGranted ? 'Yoqilgan — kam qoldiqda xabar keladi' : 'O\'chirilgan — bosing va yoqing'}
                </p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all relative ${notifGranted ? 'bg-primary-500' : 'bg-slate-600'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifGranted ? 'left-7' : 'left-1'}`} />
            </div>
          </button>
        )}

        {/* Biometric */}
        {bioAvailable && (
          <button onClick={handleBioToggle} disabled={bioLoading}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-95 ${
              bioRegistered
                ? 'bg-primary-500/10 border-primary-500/20'
                : 'bg-slate-800/60 border-slate-700/30'
            }`}>
            <div className="flex items-center gap-3">
              <Fingerprint size={20} className={bioRegistered ? 'text-primary-400' : 'text-slate-400'} />
              <div className="text-left">
                <p className={`text-sm font-medium ${bioRegistered ? 'text-primary-400' : 'text-white'}`}>
                  {bioLoading ? 'Ro\'yxatdan o\'tilmoqda...' : 'Barmoq izi / Yuz ID'}
                </p>
                <p className="text-slate-400 text-xs">
                  {bioMsg || (bioRegistered ? 'Ulangan — PIN o\'rniga ishlating' : 'PIN qulfiga qo\'shimcha himoya')}
                </p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all relative ${bioRegistered ? 'bg-primary-500' : 'bg-slate-600'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${bioRegistered ? 'left-7' : 'left-1'}`} />
            </div>
          </button>
        )}

        {/* Actions */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/30 overflow-hidden">
          {[
            { icon: Lock, label: t('changePassword'), onClick: () => setPassModal(true) },
            { icon: Shield, label: t('pinLock') + (hasPin ? ' ✓' : ''), onClick: () => setPinModal(true) },
            { icon: Package, label: t('products'), onClick: () => navigate('/products') },
            { icon: ClipboardList, label: 'Harakat tarixi', onClick: () => navigate('/audit') },
            { icon: UsersIcon, label: t('teamMode'), onClick: () => navigate('/team') },
          ].map(({ icon: Icon, label, onClick }, i, arr) => (
            <button key={i} onClick={onClick}
              className={`w-full flex items-center justify-between px-5 py-4 active:bg-slate-700/40 transition-colors ${i < arr.length - 1 ? 'border-b border-slate-700/30' : ''}`}>
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-slate-400" />
                <span className="text-white text-sm">{label}</span>
              </div>
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          ))}
        </div>

        {/* Language */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-3">
            <Globe size={18} className="text-slate-400" />
            <span className="text-white text-sm">{t('language')}</span>
          </div>
          <div className="flex gap-2">
            {[['uz',"O'zbek"],['ru','Русский'],['en','English']].map(([l, label]) => (
              <button key={l} onClick={() => changeLang(l)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${lang === l ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* App info */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30 flex items-center gap-3">
          <Info size={18} className="text-slate-400" />
          <div>
            <p className="text-white text-sm">{t('appVersion')}</p>
            <p className="text-slate-400 text-xs">React + Vite + Firebase</p>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl py-4 text-red-400 text-sm font-medium active:scale-95 transition-all">
          <LogOut size={16} />
          {t('logout')}
        </button>
      </div>

      {/* Change password modal */}
      <Modal open={passModal} onClose={() => { setPassModal(false); setPassError(''); setPassOk(false) }} title={t('changePassword')}>
        <div className="space-y-3 pb-4">
          {['current','newPass','confirm'].map((k, i) => (
            <input key={k} type="password" value={passForm[k]} onChange={setPF(k)}
              placeholder={[t('currentPassword'), t('newPassword'), t('confirmPassword')][i]}
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
          ))}
          {passError && <p className="text-red-400 text-sm">{passError}</p>}
          {passOk && <p className="text-primary-400 text-sm">Parol muvaffaqiyatli o'zgartirildi!</p>}
          <button onClick={handleChangePassword}
            className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all">
            {t('changeBtn')}
          </button>
        </div>
      </Modal>

      {/* PIN modal */}
      <Modal open={pinModal} onClose={() => { setPinModal(false); setPinForm('') }} title={t('pinLock')}>
        <div className="space-y-4 pb-4">
          <p className="text-slate-400 text-sm">4 raqamli PIN o'rnating</p>
          <input type="password" inputMode="numeric" maxLength={4} value={pinForm}
            onChange={e => setPinForm(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-2xl text-center tracking-[0.5em] placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
          <button onClick={handleSetPIN} disabled={pinForm.length !== 4}
            className="w-full bg-primary-500 text-white font-semibold py-3.5 rounded-xl active:scale-95 transition-all disabled:opacity-40">
            {t('setPIN')}
          </button>
          {hasPin && (
            <button onClick={handleRemovePIN}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-3 rounded-xl text-sm">
              PIN ni o'chirish
            </button>
          )}
        </div>
      </Modal>
    </div>
  )
}

function UsersIcon({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
