import { useState } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import { generateId } from '../store/storage'
import { fmtCur } from '../utils/format'

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }
const fmt = (n, c) => fmtCur(n, c)

export default function Exchange() {
  const { settings, updateSettings, user, transactions, saveTransactions, family, familyTransactions, refreshFamily } = useApp()
  const rates = settings?.rates || { USD: 12700, EUR: 13800, RUB: 140 }

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    from: 'USD', to: 'UZS', fromAmount: '', rate: '', note: '',
    date: new Date().toISOString().split('T')[0]
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toAmount = () => {
    const n = parseFloat(form.fromAmount)
    const r = parseFloat(form.rate)
    if (!n || !r) return null
    if (form.from === 'UZS') return n / r
    if (form.to === 'UZS') return n * r
    // cross: both non-UZS — convert via UZS
    const inUZS = n * (rates[form.from] || 1)
    return inUZS / (rates[form.to] || 1)
  }

  const computedTo = toAmount()

  const handleSave = async () => {
    const n = parseFloat(form.fromAmount)
    if (!n || n <= 0) return
    const toAmt = toAmount()
    if (!toAmt || toAmt <= 0) return

    const pairId = generateId()
    const txOut = {
      id: generateId(),
      type: 'expense',
      amount: n,
      currency: form.from,
      category: 'Valyuta ayirboshlash',
      note: form.note || `${fmt(n, form.from)} ${form.from} → ${fmt(toAmt, form.to)} ${form.to}`,
      date: form.date,
      pairId,
      emoji: '💱'
    }
    const txIn = {
      id: generateId(),
      type: 'income',
      amount: toAmt,
      currency: form.to,
      category: 'Valyuta ayirboshlash',
      note: form.note || `${fmt(n, form.from)} ${form.from} → ${fmt(toAmt, form.to)} ${form.to}`,
      date: form.date,
      pairId,
      emoji: '💱'
    }

    if (family) {
      const { addFamilyTransaction } = await import('../store/family')
      await addFamilyTransaction(family.id, txOut)
      await addFamilyTransaction(family.id, txIn)
      refreshFamily()
    } else {
      saveTransactions([...transactions, txOut, txIn])
    }

    setModal(false)
    setForm({ from: 'USD', to: 'UZS', fromAmount: '', rate: '', note: '', date: new Date().toISOString().split('T')[0] })
  }

  const handleDelete = async (tx) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    if (family) {
      const { deleteFamilyTransaction } = await import('../store/family')
      const pair = familyTransactions.filter(t => t.pairId === tx.pairId)
      for (const t of pair) await deleteFamilyTransaction(family.id, t.id)
      refreshFamily()
    } else {
      saveTransactions(transactions.filter(t => t.pairId !== tx.pairId))
    }
  }

  const allTx = family ? familyTransactions : transactions
  const exchangeTx = allTx
    .filter(t => t.category === 'Valyuta ayirboshlash' && t.type === 'expense')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const openModal = () => {
    const defaultRate = form.from !== 'UZS' ? (rates[form.from] || '') : form.to !== 'UZS' ? (rates[form.to] || '') : ''
    setForm({ from: 'USD', to: 'UZS', fromAmount: '', rate: String(defaultRate), note: '', date: new Date().toISOString().split('T')[0] })
    setModal(true)
  }

  return (
    <div className="flex flex-col pb-24 min-h-dvh">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-white">Valyuta ayirboshlash</h1>
      </div>

      {/* Exchange list */}
      <div className="flex-1 px-4 flex flex-col gap-2">
        {exchangeTx.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-4xl mb-2">💱</p>
            <p className="text-gray-500 text-sm">Ayirboshlashlar yo'q</p>
            <p className="text-gray-600 text-xs mt-1">+ tugmasini bosib qo'shing</p>
          </div>
        ) : (
          exchangeTx.map(tx => {
            const pair = allTx.find(t => t.pairId === tx.pairId && t.type === 'income')
            return (
              <div key={tx.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-lg flex-shrink-0">
                  💱
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-semibold">{fmt(tx.amount, tx.currency)} {tx.currency}</span>
                    <ArrowRight size={12} className="text-gray-500 flex-shrink-0" />
                    {pair && <span className="text-blue-400 text-sm font-semibold">{fmt(pair.amount, pair.currency)} {pair.currency}</span>}
                  </div>
                  <p className="text-gray-500 text-xs truncate">{tx.note || format(new Date(tx.date), 'dd.MM.yyyy')}</p>
                  <p className="text-gray-600 text-xs">{format(new Date(tx.date), 'dd.MM.yyyy')}</p>
                </div>
                <button onClick={() => handleDelete(tx)} className="p-2 text-gray-600 active:text-red-400 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openModal}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg active:opacity-80 z-10"
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Valyuta ayirboshlash">
        <div className="flex flex-col gap-3">
          {/* From / To */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Dan</label>
              <select className="input-field" value={form.from} onChange={e => { set('from', e.target.value); set('rate', '') }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
              </select>
            </div>
            <button onClick={() => setForm(f => ({ ...f, from: f.to, to: f.from, rate: '' }))}
              className="mt-5 w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-blue-400 flex-shrink-0">
              <ArrowLeftRight size={18} />
            </button>
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Ga</label>
              <select className="input-field" value={form.to} onChange={e => { set('to', e.target.value); set('rate', '') }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Summa ({form.from})</label>
            <input className="input-field" type="number" placeholder="0" value={form.fromAmount} onChange={e => set('fromAmount', e.target.value)} />
          </div>

          {/* Rate */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">
              Kurs {form.from !== 'UZS' && form.to !== 'UZS' ? `(1 ${form.from} = ? ${form.to})` : form.from === 'UZS' ? `(1 ${form.to} = ? UZS)` : `(1 ${form.from} = ? UZS)`}
            </label>
            <input className="input-field" type="number" placeholder="Kursni kiriting..." value={form.rate} onChange={e => set('rate', e.target.value)} />
          </div>

          {/* Preview */}
          {computedTo !== null && form.fromAmount && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-sm">{form.fromAmount} {form.from} =</p>
              <p className="text-blue-400 text-2xl font-bold">{fmt(computedTo, form.to)} <span className="text-base">{form.to}</span></p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
            <input className="input-field" placeholder="Izoh..." value={form.note} onChange={e => set('note', e.target.value)} />
          </div>

          {/* Date */}
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Sana</label>
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <button onClick={handleSave} disabled={!form.fromAmount || !form.rate} className="btn-primary disabled:opacity-40">
            Tasdiqlash
          </button>
        </div>
      </Modal>
    </div>
  )
}
