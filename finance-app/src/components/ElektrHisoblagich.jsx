import { useState, useEffect } from 'react'
import { Zap, Plus, Trash2 } from 'lucide-react'
import Modal from './Modal'
import AmountInput from './AmountInput'
import { getData, saveData, generateId } from '../store/storage'
import { syncToCloud, loadFromCloud, subscribeToCloud } from '../store/sync'
import { fmtCur } from '../utils/format'

const STORAGE_KEY = 'elektr_readings'
const UZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

const currentMonthStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (monthStr) => {
  const [y, m] = monthStr.split('-')
  return `${UZ_MONTHS[parseInt(m, 10) - 1]} ${y}`
}

export default function ElektrHisoblagich({ workspaceId, isAdmin }) {
  const [readings, setReadings] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ month: currentMonthStr(), prevReading: '', curReading: '', tariff: '900', note: '' })

  const storageKey = `${STORAGE_KEY}_${workspaceId}`

  const loadReadings = (data) => {
    if (Array.isArray(data)) setReadings(data)
  }

  useEffect(() => {
    if (!workspaceId) return
    const local = getData(storageKey, workspaceId)
    if (local.length) setReadings(local)
    loadFromCloud(workspaceId, storageKey, 'workspaces').then(d => { if (d) { setReadings(d); saveData(storageKey, workspaceId, d) } })
    const unsub = subscribeToCloud(workspaceId, storageKey, (d) => {
      setReadings(d)
      saveData(storageKey, workspaceId, d)
    }, 'workspaces')
    return () => unsub()
  }, [workspaceId])

  const openModal = () => {
    const sorted = [...readings].sort((a, b) => b.month.localeCompare(a.month))
    const last = sorted[0]
    setForm({
      month: currentMonthStr(),
      prevReading: last ? String(last.curReading) : '',
      curReading: '',
      tariff: last ? String(last.tariff) : '900',
      note: ''
    })
    setModalOpen(true)
  }

  const save = () => {
    const prev = parseFloat(form.prevReading) || 0
    const cur = parseFloat(form.curReading) || 0
    const tariff = parseFloat(form.tariff) || 900
    if (!form.month || cur === 0) return
    const reading = {
      id: generateId(),
      month: form.month,
      prevReading: prev,
      curReading: cur,
      tariff,
      note: form.note,
      createdAt: new Date().toISOString()
    }
    const updated = [...readings.filter(r => r.month !== form.month), reading]
    setReadings(updated)
    saveData(storageKey, workspaceId, updated)
    syncToCloud(workspaceId, storageKey, updated, 'workspaces')
    setModalOpen(false)
  }

  const deleteReading = (id) => {
    if (!window.confirm("Bu ma'lumotni o'chirmoqchimisiz?")) return
    const updated = readings.filter(r => r.id !== id)
    setReadings(updated)
    saveData(storageKey, workspaceId, updated)
    syncToCloud(workspaceId, storageKey, updated, 'workspaces')
  }

  const sorted = [...readings].sort((a, b) => b.month.localeCompare(a.month))
  const latest = sorted[0]
  const latestConsumption = latest ? latest.curReading - latest.prevReading : null
  const latestCost = latest ? latestConsumption * latest.tariff : null
  const history = sorted.slice(0, 6)

  const previewConsumption = (parseFloat(form.curReading) || 0) - (parseFloat(form.prevReading) || 0)
  const previewCost = previewConsumption * (parseFloat(form.tariff) || 900)

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border-card)' }
  const card2Style = { background: 'var(--bg-card2)', border: '1px solid var(--border-card)' }
  const labelStyle = { color: 'var(--text-muted)', fontSize: 12 }
  const valueStyle = { color: 'var(--text-primary)', fontWeight: 700 }
  const secondaryStyle = { color: 'var(--text-secondary)' }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: '#f59e0b' }}>⚡</span> Elektr hisoblagich
        </h2>
        <button
          onClick={openModal}
          className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}
        >
          <Plus size={14} /> Yangi ko'rsatkich
        </button>
      </div>

      {/* Summary card */}
      <div className="rounded-xl p-4 mb-3" style={cardStyle}>
        {latest ? (
          <div className="flex justify-between items-start">
            <div>
              <div style={labelStyle}>Joriy oy iste'moli</div>
              <div className="text-2xl font-black mt-1" style={{ color: '#f59e0b' }}>
                {latestConsumption} <span className="text-sm font-semibold">kWt</span>
              </div>
              <div className="text-xs mt-0.5" style={secondaryStyle}>{monthLabel(latest.month)}</div>
            </div>
            <div className="text-right">
              <div style={labelStyle}>Narxi</div>
              <div className="text-lg font-bold mt-1" style={valueStyle}>{fmtCur(latestCost)} UZS</div>
              <div className="text-xs mt-0.5" style={secondaryStyle}>{fmtCur(latest.tariff)} so'm/kWt</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div className="text-3xl mb-1">⚡</div>
            <div className="text-sm">Ma'lumot yo'q</div>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-card)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tarix</span>
          </div>
          <div className="flex flex-col">
            {history.map((r, i) => {
              const cons = r.curReading - r.prevReading
              const cost = cons * r.tariff
              return (
                <div
                  key={r.id}
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-card)' : 'none' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{monthLabel(r.month)}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {r.prevReading} → {r.curReading} • <span style={{ color: '#f59e0b' }}>{cons} kWt</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 ml-2 flex-shrink-0">
                    <div>
                      <div className="text-sm font-bold" style={valueStyle}>{fmtCur(cost)} UZS</div>
                      {r.note && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.note}</div>}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteReading(r.id)}
                        className="p-1 rounded-lg"
                        style={{ color: '#ef4444', background: '#ef444415' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi ko'rsatkich">
        <div className="flex flex-col gap-3">
          {/* Month */}
          <div>
            <div className="text-xs mb-1" style={labelStyle}>Oy</div>
            <input
              type="month"
              value={form.month}
              onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
              className="input-field w-full"
            />
          </div>

          {/* Previous reading */}
          <div>
            <div className="text-xs mb-1" style={labelStyle}>Oldingi ko'rsatkich (kWt)</div>
            <AmountInput
              value={form.prevReading}
              onChange={v => setForm(f => ({ ...f, prevReading: v }))}
              placeholder="0"
              className="input-field w-full"
            />
          </div>

          {/* Current reading */}
          <div>
            <div className="text-xs mb-1" style={labelStyle}>Joriy ko'rsatkich (kWt)</div>
            <AmountInput
              value={form.curReading}
              onChange={v => setForm(f => ({ ...f, curReading: v }))}
              placeholder="0"
              className="input-field w-full"
            />
          </div>

          {/* Tariff */}
          <div>
            <div className="text-xs mb-1" style={labelStyle}>Tarif (so'm/kWt)</div>
            <AmountInput
              value={form.tariff}
              onChange={v => setForm(f => ({ ...f, tariff: v }))}
              placeholder="900"
              className="input-field w-full"
            />
          </div>

          {/* Note */}
          <div>
            <div className="text-xs mb-1" style={labelStyle}>Izoh (ixtiyoriy)</div>
            <input
              type="text"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Izoh..."
              className="input-field w-full"
            />
          </div>

          {/* Live preview */}
          {(form.curReading || form.prevReading) && (
            <div className="rounded-xl p-3" style={{ background: '#f59e0b11', border: '1px solid #f59e0b33' }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs" style={{ color: '#f59e0b99' }}>Iste'mol</div>
                  <div className="font-bold" style={{ color: '#f59e0b' }}>{previewConsumption} kWt</div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: '#f59e0b99' }}>Narxi</div>
                  <div className="font-bold" style={{ color: '#f59e0b' }}>{fmtCur(previewCost)} UZS</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={save}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: '#f59e0b', color: '#000' }}
          >
            Saqlash
          </button>
        </div>
      </Modal>
    </div>
  )
}
