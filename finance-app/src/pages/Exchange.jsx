import { useState } from 'react'
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { format } from 'date-fns'
import { generateId } from '../store/storage'
import { addFamilyTransaction, deleteFamilyTransaction } from '../store/family'

const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB']
const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }
const fmt = (n, c) => {
  if (!c || c === 'UZS') return new Intl.NumberFormat('uz-UZ').format(Math.round(n))
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 4 })
}

const defaultForm = {
  from: 'USD',
  to: 'UZS',
  fromAmount: '',
  rate: '',
  note: '',
  date: new Date().toISOString().split('T')[0]
}

export default function Exchange() {
  const { user, family, transactions, saveTransactions, familyTransactions, refreshFamily } = useApp()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Barcha valyuta ayirboshlash tranzaksiyalari
  const allTx = family ? familyTransactions : transactions
  const exchanges = allTx
    .filter(t => t.category === 'Valyuta ayirboshlash' && t.type === 'expense')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const toAmount = () => {
    const n = parseFloat(form.fromAmount)
    const r = parseFloat(form.rate)
    if (!n || !r) return ''
    if (form.from === 'UZS') return fmt(n / r, form.to)
    return fmt(n * r, form.to)
  }

  const handleSave = () => {
    const n = parseFloat(form.fromAmount)
    const r = parseFloat(form.rate)
    if (!n || !r) return

    const toAmt = parseFloat(form.from === 'UZS' ? n / r : n * r)
    const noteText = form.note ? `${form.note} | Kurs: ${r}` : `Kurs: ${r}`

    const txOut = {
      id: generateId(),
      type: 'expense',
      amount: n,
      currency: form.from,
      category: 'Valyuta ayirboshlash',
      emoji: '💱',
      note: noteText,
      date: form.date,
      userId: user.id,
      userName: user.name,
      pairId: null
    }
    const pairId = generateId()
    txOut.pairId = pairId

    const txIn = {
      id: pairId,
      type: 'income',
      amount: toAmt,
      currency: form.to,
      category: 'Valyuta ayirboshlash',
      emoji: '💱',
      note: noteText,
      date: form.date,
      userId: user.id,
      userName: user.name,
      pairId: txOut.id
    }

    if (family) {
      addFamilyTransaction(family.id, txOut)
        .then(() => addFamilyTransaction(family.id, txIn))
        .then(() => refreshFamily())
    } else {
      saveTransactions([...transactions, txOut, txIn])
    }

    setModal(false)
    setForm(defaultForm)
  }

  const handleDelete = (tx) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    // Juft tranzaksiyani ham o'chirish (pairId orqali)
    if (family) {
      deleteFamilyTransaction(family.id, tx.id)
        .then(() => tx.pairId ? deleteFamilyTransaction(family.id, tx.pairId) : null)
        .then(() => refreshFamily())
    } else {
      const idsToRemove = new Set([tx.id, tx.pairId].filter(Boolean))
      saveTransactions(transactions.filter(t => !idsToRemove.has(t.id)))
    }
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-white">Valyuta ayirboshlash</h1>
      </div>

      <div className="flex-1 px-4 flex flex-col gap-2 mt-2">
        {exchanges.length === 0 ? (
          <div className="card text-center py-10 mt-4">
            <p className="text-4xl mb-2">💱</p>
            <p className="text-gray-500 text-sm">Hali ayirboshlash yo'q</p>
          </div>
        ) : (
          exchanges.map(tx => {
            // Juft (kirim) tranzaksiyani topish
            const pair = allTx.find(t => t.id === tx.pairId || t.pairId === tx.id && t.type === 'income')
            return (
              <SwipeableRow key={tx.id} onDelete={() => handleDelete(tx)}>
                <div className="card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-lg flex-shrink-0">
                    💱
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-400 text-sm font-semibold">-{fmt(tx.amount, tx.currency)} {tx.currency}</span>
                      <ArrowLeftRight size={12} className="text-gray-500 flex-shrink-0" />
                      {pair && <span className="text-green-400 text-sm font-semibold">+{fmt(pair.amount, pair.currency)} {pair.currency}</span>}
                    </div>
                    <p className="text-gray-500 text-xs truncate">
                      {tx.note ? `${tx.note} · ` : ''}{format(new Date(tx.date), 'dd.MM.yyyy')}
                    </p>
                  </div>
                </div>
              </SwipeableRow>
            )
          })
        )}
      </div>

      {/* Qo'shish tugmasi */}
      <button
        onClick={() => { setForm(defaultForm); setModal(true) }}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:opacity-80"
      >
        <Plus size={24} />
      </button>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Valyuta ayirboshlash">
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Berilayotgan valyuta</label>
              <select className="input-field" value={form.from} onChange={e => set('from', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
              </select>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, from: f.to, to: f.from }))}
              className="mt-5 w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-blue-400 flex-shrink-0"
            >
              <ArrowLeftRight size={18} />
            </button>
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Olinayotgan valyuta</label>
              <select className="input-field" value={form.to} onChange={e => set('to', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{FLAGS[c]} {c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Miqdor ({form.from})</label>
            <input className="input-field" type="number" placeholder="0" value={form.fromAmount} onChange={e => set('fromAmount', e.target.value)} />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">
              Kurs (1 {form.from === 'UZS' ? form.to : form.from} = ? {form.from === 'UZS' ? form.from : form.to})
            </label>
            <input className="input-field" type="number" placeholder="0" value={form.rate} onChange={e => set('rate', e.target.value)} />
          </div>

          {toAmount() && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-gray-400 text-sm">{form.fromAmount} {form.from} =</span>
              <span className="text-blue-400 text-lg font-bold">{toAmount()} {form.to}</span>
            </div>
          )}

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
            <input className="input-field" placeholder="Izoh..." value={form.note} onChange={e => set('note', e.target.value)} />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Sana</label>
            <input className="input-field" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>

          <button
            onClick={handleSave}
            disabled={!form.fromAmount || !form.rate}
            className="btn-primary mt-2 disabled:opacity-40"
          >
            Saqlash
          </button>
        </div>
      </Modal>
    </div>
  )
}
