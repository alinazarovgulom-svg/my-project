import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Lock, User, Eye, EyeOff, Info, Tag, Globe, KeyRound, Trash2, Loader, RefreshCw, UserX, Download, Upload } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { setCurrentUser, getData, saveData, getSettings, saveSettings } from '../store/storage'
import { changePassword, changeUsername, deleteAccount } from '../store/auth'
import { syncToCloud } from '../store/sync'
import Modal from '../components/Modal'
import { useLang } from '../i18n/LangContext'

export default function Settings() {
  const { user, setUser, transactions: personalTx, familyTransactions, family, debts, userRole, pin, savePin,
    saveTransactions, saveDebts, saveCategories, saveHamkorSections, saveHamkorPartners, updateSettings,
    categories, settings, hamkorSections, hamkorPartners, showToast } = useApp()
  const transactions = family ? familyTransactions : personalTx
  const { t, lang, setLang } = useLang()
  const nav = useNavigate()
  // Only admin (or user not in a family) can access categories
  const isAdmin = !userRole || userRole === 'admin'
  const [passModal, setPassModal] = useState(false)
  const [loginModal, setLoginModal] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [loginForm, setLoginForm] = useState({ newUsername: '', currentPass: '' })
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' })
  const [showPass, setShowPass] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginSuccess, setLoginSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletePass, setDeletePass] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleForceSync = async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncDone(false)
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    try {
      const uid = user.id
      const tx = getData('transactions', uid)
      const db = getData('debts', uid)
      const sec = getData('hamkorlar_sections', uid)
      const par = getData('hamkorlar', uid)
      const s = getSettings(uid)
      const cats = (() => { try { return JSON.parse(localStorage.getItem(`finance_${uid}_categories`) || 'null') } catch { return null } })()
      await Promise.race([
        Promise.all([
          tx?.length > 0 && syncToCloud(uid, 'transactions', tx),
          db?.length > 0 && syncToCloud(uid, 'debts', db),
          sec?.length > 0 && syncToCloud(uid, 'hamkorlar_sections', sec),
          par?.length > 0 && syncToCloud(uid, 'hamkorlar', par),
          s?.rates && syncToCloud(uid, 'settings', s),
          cats?.length > 0 && syncToCloud(uid, 'categories', cats),
        ]),
        timeout
      ])
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 3000)
      showToast("Ma'lumotlar yuklandi ✓")
    } catch (e) {
      console.warn('Force sync error:', e)
    } finally {
      setSyncing(false)
    }
  }
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const hasPin = !!pin

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleExport = () => {
    if (!user?.id) return
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: { name: user.name, username: user.username },
      transactions: transactions,
      debts: family ? (family?.debts || []) : debts,
      hamkorlar: hamkorPartners,
      hamkorlar_sections: hamkorSections,
      settings: settings,
      categories: categories,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pulbek-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(''); setImportSuccess('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.version || !data.user) return setImportError('Fayl noto\'g\'ri formatda')
        const uid = user.id
        if (data.transactions?.length) saveTransactions(data.transactions)
        if (data.debts?.length) saveDebts(data.debts)
        if (data.hamkorlar?.length) saveHamkorPartners(data.hamkorlar)
        if (data.hamkorlar_sections?.length) saveHamkorSections(data.hamkorlar_sections)
        if (data.settings?.rates) updateSettings(data.settings)
        if (data.categories?.length) saveCategories(data.categories)
        setImportSuccess(`✓ Muvaffaqiyatli tiklandi! ${data.transactions?.length || 0} ta tranzaksiya, ${data.debts?.length || 0} ta qarz yuklandi.`)
      } catch { setImportError('Faylni o\'qishda xatolik') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDeleteAccount = async () => {
    if (!deletePass) return setDeleteError('Parolni kiriting')
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await deleteAccount(user.id, deletePass)
      if (res.error) return setDeleteError(res.error)
      setUser(null)
      nav('/login')
    } catch { setDeleteError('Xatolik yuz berdi') } finally { setDeleting(false) }
  }

  const handleLogout = () => {
    if (confirm('Chiqishni tasdiqlaysizmi?')) {
      setCurrentUser(null)
      setUser(null)
      nav('/login')
    }
  }

  const handleChangePass = async () => {
    setError(''); setSuccess('')
    if (!form.current || !form.newPass || !form.confirm) return setError('Barcha maydonlarni to\'ldiring')
    if (form.newPass.length < 4) return setError('Yangi parol kamida 4 belgi bo\'lsin')
    if (form.newPass !== form.confirm) return setError('Parollar mos kelmaydi')
    setSaving(true)
    try {
      const res = await changePassword(user.id, form.current, form.newPass)
      if (res.error) return setError(res.error)
      setForm({ current: '', newPass: '', confirm: '' })
      setPassModal(false)
      showToast('Parol muvaffaqiyatli o\'zgartirildi ✓')
    } catch { setError('Tarmoq xatosi') } finally { setSaving(false) }
  }

  const showField = (k) => setShowPass(s => ({ ...s, [k]: !s[k] }))

  const handleChangeLogin = async () => {
    setLoginError(''); setLoginSuccess('')
    const { newUsername, currentPass } = loginForm
    if (!newUsername.trim() || !currentPass) return setLoginError('Barcha maydonlarni to\'ldiring')
    if (newUsername.trim().length < 3) return setLoginError('Login kamida 3 belgi bo\'lsin')
    setSaving(true)
    try {
      const res = await changeUsername(user.id, newUsername.trim(), currentPass)
      if (res.error) return setLoginError(res.error)
      setUser(res.user)
      setLoginForm({ newUsername: '', currentPass: '' })
      setLoginModal(false)
      showToast(`Login "${newUsername.trim()}" ga o'zgartirildi ✓`)
    } catch { setLoginError('Tarmoq xatosi') } finally { setSaving(false) }
  }

  const handleSetPin = () => {
    setPinError(''); setPinSuccess('')
    if (pinForm.pin.length !== 4 || !/^\d{4}$/.test(pinForm.pin)) return setPinError('PIN 4 raqamdan iborat bo\'lishi kerak')
    if (pinForm.pin !== pinForm.confirm) return setPinError('PIN lar mos kelmaydi')
    savePin(pinForm.pin)
    setPinForm({ pin: '', confirm: '' })
    setPinModal(false)
    showToast('PIN muvaffaqiyatli o\'rnatildi ✓')
  }

  const handleRemovePin = () => {
    if (user?.id) {
      savePin(null)
      setPinModal(false)
    }
  }

  const stats = [
    { label: 'Jami operatsiyalar', value: transactions.length, color: 'blue' },
    { label: 'Jami qarzlar', value: debts.length, color: 'purple' },
    { label: 'Faol qarzlar', value: debts.filter(d => d.remaining > 0).length, color: 'orange' },
  ]

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4 page-animate">
      <h1 className="text-xl font-bold text-white">Sozlamalar</h1>

      {/* Profile */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
          <span className="text-2xl">👤</span>
        </div>
        <div>
          <p className="text-white font-bold text-lg">{user?.name}</p>
          <p className="text-gray-400 text-sm">@{user?.username}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card flex flex-col gap-0 p-0 overflow-hidden">
        {isAdmin && (
          <>
            <button onClick={() => nav('/categories')}
              className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Tag size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Kategoriyalar</p>
                <p className="text-gray-500 text-xs">Kategoriyalarni boshqarish</p>
              </div>
            </button>
            <div className="h-px bg-white/5 mx-4" />
          </>
        )}

        <button onClick={() => { setLoginModal(true); setLoginError(''); setLoginSuccess(''); setLoginForm({ newUsername: '', currentPass: '' }) }}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <User size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Loginni o'zgartirish</p>
            <p className="text-gray-500 text-xs">Hozirgi: @{user?.username}</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={() => { setPassModal(true); setError(''); setSuccess(''); setForm({ current: '', newPass: '', confirm: '' }) }}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Lock size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Parolni o'zgartirish</p>
            <p className="text-gray-500 text-xs">Xavfsizlik uchun o'zgartiring</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={() => { setPinModal(true); setPinError(''); setPinSuccess(''); setPinForm({ pin: '', confirm: '' }) }}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <KeyRound size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">PIN qulfini {hasPin ? 'o\'zgartirish' : 'o\'rnatish'}</p>
            <p className="text-gray-500 text-xs">{hasPin ? 'PIN faol — ilovani qulflaydi' : 'Ilovani PIN bilan qulflash'}</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={() => nav('/trash')}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <Trash2 size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Arxiv</p>
            <p className="text-gray-500 text-xs">O'chirilgan tranzaksiyalar (30 kun)</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={handleForceSync} disabled={syncing}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full disabled:opacity-60">
          <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
            {syncing ? <Loader size={18} className="text-green-400 animate-spin" /> : <RefreshCw size={18} className={`text-green-400 ${syncDone ? 'text-green-300' : ''}`} />}
          </div>
          <div>
            <p className="text-white text-sm font-medium">Ma'lumotlarni yuklash</p>
            <p className="text-gray-500 text-xs">{syncDone ? '✓ Muvaffaqiyatli yuklandi!' : syncing ? 'Yuklanmoqda...' : 'Barcha ma\'lumotlarni Firebase\'ga yuklash'}</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={() => { setDeleteModal(true); setDeletePass(''); setDeleteError('') }}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <UserX size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-red-500 text-sm font-medium">Akkauntni o'chirish</p>
            <p className="text-gray-500 text-xs">Barcha ma'lumotlar butunlay o'chadi</p>
          </div>
        </button>

        <div className="h-px bg-white/5 mx-4" />

        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 active:bg-dark-600 transition-colors text-left w-full">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <LogOut size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-red-400 text-sm font-medium">Chiqish</p>
            <p className="text-gray-500 text-xs">Akkauntdan chiqish</p>
          </div>
        </button>
      </div>

      {/* Language selector */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-gray-500" />
          <h2 className="text-gray-400 text-sm">{t('language')}</h2>
        </div>
        <div className="flex gap-2">
          {[['uz','🇺🇿','O\'zbek'],['ru','🇷🇺','Русский'],['en','🇬🇧','English']].map(([l, flag, label]) => (
            <button key={l} onClick={() => setLang(l)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${lang === l ? 'text-indigo-300' : 'text-gray-500'}`}
              style={lang === l ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' } : { background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-lg">{flag}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} className="text-gray-500" />
          <h2 className="text-gray-400 text-sm">{t('appInfo')}</h2>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          {t('appVersion')} — {t('tagline')}
        </p>
      </div>

      {/* Zaxira nusxa */}
      <div className="card">
        <h2 className="text-white font-semibold text-sm mb-3">Zaxira nusxa (Backup)</h2>
        <div className="flex flex-col gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 active:bg-blue-500/20 transition-colors text-left w-full">
            <Download size={18} className="text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Yuklab olish</p>
              <p className="text-gray-500 text-xs">Barcha ma'lumotlarni JSON faylga saqlash</p>
            </div>
          </button>
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 active:bg-green-500/20 transition-colors text-left w-full cursor-pointer">
            <Upload size={18} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Fayldan tiklash</p>
              <p className="text-gray-500 text-xs">Zaxira fayldan ma'lumotlarni yuklash</p>
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          {importError && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{importError}</p>}
          {importSuccess && <p className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{importSuccess}</p>}
        </div>
      </div>

      {/* PIN Modal */}
      <Modal open={pinModal} onClose={() => setPinModal(false)} title="PIN o'rnatish">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Yangi PIN (4 raqam)</label>
            <input className="input-field tracking-widest text-lg" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinForm.pin} onChange={e => setPinForm(f => ({ ...f, pin: e.target.value }))} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Tasdiqlash</label>
            <input className="input-field tracking-widest text-lg" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinForm.confirm} onChange={e => setPinForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          {pinError && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{pinError}</p>}
          {pinSuccess && <p className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{pinSuccess}</p>}
          <button onClick={handleSetPin} className="btn-primary">Saqlash</button>
          {hasPin && <button onClick={handleRemovePin} className="text-red-400 text-sm py-2">PIN ni o'chirish</button>}
        </div>
      </Modal>

      {/* Login Change Modal */}
      <Modal open={loginModal} onClose={() => setLoginModal(false)} title="Loginni o'zgartirish">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Yangi login</label>
            <input
              className="input-field"
              placeholder="Yangi login"
              value={loginForm.newUsername}
              onChange={e => setLoginForm(f => ({ ...f, newUsername: e.target.value }))}
              autoCapitalize="none" autoCorrect="off" spellCheck="false"
            />
          </div>
          <div className="relative">
            <label className="text-gray-400 text-xs mb-1 block">Joriy parol (tasdiqlash uchun)</label>
            <input
              className="input-field pr-12"
              type={showPass.loginPass ? 'text' : 'password'}
              placeholder="Parolingiz"
              value={loginForm.currentPass}
              onChange={e => setLoginForm(f => ({ ...f, currentPass: e.target.value }))}
              autoCapitalize="none" autoCorrect="off"
            />
            <button type="button" onClick={() => showField('loginPass')} className="absolute right-3 bottom-3 text-gray-500 p-0.5">
              {showPass.loginPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {loginError && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{loginError}</p>}
          {loginSuccess && <p className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{loginSuccess}</p>}
          <button onClick={handleChangeLogin} disabled={saving} className="btn-primary mt-2 flex items-center justify-center gap-2">
            {saving ? <><Loader size={16} className="animate-spin" />Saqlanmoqda...</> : 'O\'zgartirish'}
          </button>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal open={passModal} onClose={() => setPassModal(false)} title="Parolni o'zgartirish">
        <div className="flex flex-col gap-3">
          {['current', 'newPass', 'confirm'].map((field, i) => (
            <div key={field} className="relative">
              <label className="text-gray-400 text-xs mb-1 block">
                {field === 'current' ? 'Joriy parol' : field === 'newPass' ? 'Yangi parol' : 'Yangi parolni tasdiqlang'}
              </label>
              <input
                className="input-field pr-12"
                type={showPass[field] ? 'text' : 'password'}
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                autoComplete="off"
              />
              <button type="button" onClick={() => showField(field)} className="absolute right-3 bottom-3 text-gray-500 p-0.5">
                {showPass[field] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          ))}
          {error && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{error}</p>}
          {success && <p className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{success}</p>}
          <button onClick={handleChangePass} disabled={saving} className="btn-primary mt-2 flex items-center justify-center gap-2">
            {saving ? <><Loader size={16} className="animate-spin" />Saqlanmoqda...</> : 'O\'zgartirish'}
          </button>
        </div>
      </Modal>
      {/* Delete Account Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Akkauntni o'chirish">
        <div className="flex flex-col gap-3 pb-2">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm font-medium mb-1">⚠ Diqqat!</p>
            <p className="text-gray-400 text-xs">Barcha tranzaksiyalar, qarzlar, hamkorlar va akkaunt ma'lumotlari <span className="text-red-400 font-medium">butunlay o'chib ketadi</span>. Bu amalni qaytarib bo'lmaydi.</p>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Tasdiqlash uchun parolingizni kiriting</label>
            <input
              className="input-field"
              type="password"
              placeholder="Parol"
              value={deletePass}
              onChange={e => setDeletePass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {deleteError && <p className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{deleteError}</p>}
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full py-3 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:opacity-80">
            {deleting ? <><Loader size={16} className="animate-spin" />O'chirilmoqda...</> : <><UserX size={16} />Akkauntni o'chirish</>}
          </button>
        </div>
      </Modal>
    </div>
  )
}
