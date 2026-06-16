import { useState } from 'react'
import { RefreshCw, Settings, ArrowLeftRight, History, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { fmtCur } from '../utils/format'

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }

const fmt = (n, c) => fmtCur(n, c)

const getRatesHistory = (userId) => {
  try {
    const raw = localStorage.getItem(`finance_${userId}_rates_history`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export default function Exchange() {
  const { settings, updateSettings, user } = useApp()
  const rates = settings.rates || { USD: 12700, EUR: 13800, RUB: 140 }

  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('UZS')
  const [confirmed, setConfirmed] = useState(false)
  const [rateModal, setRateModal] = useState(false)
  const [ratesForm, setRatesForm] = useState({ ...rates })
  const [showHistory, setShowHistory] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  const history = getRatesHistory(user?.id)

  const toUZS = (val, cur) => {
    if (cur === 'UZS') return val
    return val * (rates[cur] || 1)
  }
  const fromUZS = (val, cur) => {
    if (cur === 'UZS') return val
    return val / (rates[cur] || 1)
  }

  const computeResult = () => {
    const n = parseFloat(amount)
    if (!n) return ''
    const inUZS = toUZS(n, from)
    const result = fromUZS(inUZS, to)
    return fmt(result, to)
  }

  const handleConfirm = () => {
    const n = parseFloat(amount)
    if (!n) return
    setConfirmed(true)

    // Save this conversion to today's history
    if (user?.id) {
      const res = computeResult()
      const today = format(new Date(), 'yyyy-MM-dd')
      const key = `finance_${user.id}_conversions_${today}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({ from, to, amount: n, result: res, time: format(new Date(), 'HH:mm') })
      localStorage.setItem(key, JSON.stringify(existing))
    }
  }

  const handleAmountChange = (v) => { setAmount(v); setConfirmed(false) }

  const swap = () => { setFrom(to); setTo(from); setConfirmed(false) }

  const deleteHistory = (idx) => {
    const hist = getRatesHistory(user.id)
    hist.splice(idx, 1)
    localStorage.setItem(`finance_${user.id}_rates_history`, JSON.stringify(hist))
    setHistoryKey(k => k + 1)
  }

  const saveRates = () => {
    const newRates = { USD: parseFloat(ratesForm.USD), EUR: parseFloat(ratesForm.EUR), RUB: parseFloat(ratesForm.RUB) }
    updateSettings({ ...settings, rates: newRates })

    if (user?.id) {
      const today = format(new Date(), 'yyyy-MM-dd')
      const ratesData = { rates: newRates, date: today }
      localStorage.setItem(`finance_${user.id}_rates`, JSON.stringify(ratesData))

      const hist = getRatesHistory(user.id)
      const filtered = hist.filter(h => h.date !== today)
      const newHist = [ratesData, ...filtered].slice(0, 7)
      localStorage.setItem(`finance_${user.id}_rates_history`, JSON.stringify(newHist))
    }
    setRateModal(false)
  }

  const result = confirmed ? computeResult() : ''

  return (
    <div className="flex flex-col px-4 pt-4 pb-24 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Valyuta ayirboshlash</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(v => !v)} className="p-2 rounded-xl bg-dark-700 text-gray-400">
            <History size={18} />
          </button>
          <button onClick={() => { setRatesForm({ ...rates }); setRateModal(true) }} className="p-2 rounded-xl bg-dark-700 text-gray-400">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Rates Display */}
      <div className="card">
        <p className="text-gray-400 text-xs mb-3">Joriy kurslar</p>
        <div className="flex flex-col gap-2">
          {Object.entries(rates).map(([cur, rate]) => (
            <div key={cur} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{FLAGS[cur]}</span>
                <span className="text-white font-medium">1 {cur}</span>
              </div>
              <span className="text-blue-400 font-semibold">{new Intl.NumberFormat('uz-UZ').format(rate)} UZS</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rate History */}
      {showHistory && history.length > 0 && (
        <div className="card">
          <p className="text-gray-400 text-xs mb-3">Kurs tarixi (so'nggi 7 kun)</p>
          <div className="flex flex-col gap-3">
            {history.map((h, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gray-500 text-xs">{h.date}</p>
                  <button onClick={() => deleteHistory(i)} className="p-1 text-gray-600 active:text-red-400"><Trash2 size={12} /></button>
                </div>
                <div className="flex gap-3">
                  {Object.entries(h.rates).map(([cur, rate]) => (
                    <div key={cur} className="flex-1 bg-dark-600 rounded-lg p-2 text-center">
                      <p className="text-gray-400 text-xs">{FLAGS[cur]} {cur}</p>
                      <p className="text-white text-xs font-semibold">{new Intl.NumberFormat('uz-UZ').format(rate)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Converter */}
      <div className="card flex flex-col gap-4">
        <h2 className="text-white font-semibold">Konvertatsiya</h2>

        <div>
          <label className="text-gray-400 text-xs mb-1 block">Summa</label>
          <input
            className="input-field text-xl font-bold"
            type="number"
            placeholder="0"
            value={amount}
            onChange={e => handleAmountChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">Dan</label>
            <select className="input-field" value={from} onChange={e => { setFrom(e.target.value); setConfirmed(false) }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
            </select>
          </div>
          <button onClick={swap} className="mt-5 w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-blue-400 active:opacity-70 flex-shrink-0">
            <ArrowLeftRight size={18} />
          </button>
          <div className="flex-1">
            <label className="text-gray-400 text-xs mb-1 block">Ga</label>
            <select className="input-field" value={to} onChange={e => { setTo(e.target.value); setConfirmed(false) }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!amount}
          className="btn-primary disabled:opacity-40"
        >
          Tasdiqlash
        </button>

        {result && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm">{amount} {from} =</p>
            <p className="text-blue-400 text-3xl font-bold mt-1">{result} <span className="text-lg">{to}</span></p>
          </div>
        )}
      </div>

      {/* Quick conversions */}
      <div className="card">
        <p className="text-gray-400 text-xs mb-3">Tez konvertatsiya (USD)</p>
        <div className="grid grid-cols-2 gap-2">
          {[100, 500, 1000, 5000].map(n => (
            <button key={n} onClick={() => { setAmount(String(n)); setFrom('USD'); setTo('UZS'); setConfirmed(false) }}
              className="bg-dark-600 rounded-xl p-3 text-left active:opacity-70">
              <p className="text-gray-400 text-xs">{n} USD</p>
              <p className="text-white text-sm font-semibold">{new Intl.NumberFormat('uz-UZ').format(n * rates.USD)} UZS</p>
            </button>
          ))}
        </div>
      </div>

      {/* Rates Modal */}
      <Modal open={rateModal} onClose={() => setRateModal(false)} title="Kurslarni o'zgartirish">
        <div className="flex flex-col gap-3">
          <p className="text-gray-400 text-sm">1 valyuta = ? UZS</p>
          {Object.keys(rates).map(cur => (
            <div key={cur}>
              <label className="text-gray-400 text-xs mb-1 block">{FLAGS[cur]} 1 {cur} = ? UZS</label>
              <input
                className="input-field"
                type="number"
                value={ratesForm[cur]}
                onChange={e => setRatesForm(f => ({ ...f, [cur]: e.target.value }))}
              />
            </div>
          ))}
          <button onClick={saveRates} className="btn-primary mt-2">Saqlash</button>
        </div>
      </Modal>
    </div>
  )
}
