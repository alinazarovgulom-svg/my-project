import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../store/AppContext'
import { useLang } from '../i18n/LangContext'
import { getLocalLog, subscribeToTeamLog, actionLabel, actionColor } from '../store/auditLog'
import { fmtNum, fmtDate } from '../utils/format'
import {
  ClipboardList, PackagePlus, PackageMinus, Package,
  Trash2, FileSpreadsheet, Search, Users, Filter, Download
} from 'lucide-react'

const ACTION_ICONS = {
  kirim_qoshildi:       { icon: PackagePlus,     color: 'text-primary-400',  bg: 'bg-primary-500/15' },
  chiqim_qoshildi:      { icon: PackageMinus,    color: 'text-red-400',      bg: 'bg-red-500/15' },
  kirim_ochirildi:      { icon: Trash2,          color: 'text-slate-400',    bg: 'bg-slate-700/60' },
  chiqim_ochirildi:     { icon: Trash2,          color: 'text-slate-400',    bg: 'bg-slate-700/60' },
  mahsulot_qoshildi:    { icon: Package,         color: 'text-blue-400',     bg: 'bg-blue-500/15' },
  mahsulot_tahrirlandi: { icon: Package,         color: 'text-blue-400',     bg: 'bg-blue-500/15' },
  mahsulot_ochirildi:   { icon: Trash2,          color: 'text-slate-400',    bg: 'bg-slate-700/60' },
  excel_import:         { icon: FileSpreadsheet, color: 'text-violet-400',   bg: 'bg-violet-500/15' },
}

const ACTION_FILTERS = [
  { key: 'all',     label: 'Barchasi' },
  { key: 'kirim',   label: 'Kirim' },
  { key: 'chiqim',  label: 'Chiqim' },
  { key: 'mahsulot',label: 'Mahsulot' },
  { key: 'ochirildi',label: 'O\'chirilgan' },
]

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Hozir'
  if (m < 60) return `${m} daq oldin`
  if (h < 24) return `${h} soat oldin`
  return fmtDate(ts)
}

export default function AuditLog() {
  const { user, team, teamId } = useApp()
  const { t } = useLang()

  const [teamMode, setTeamMode] = useState(false)
  const [personalLog, setPersonalLog] = useState([])
  const [teamLog, setTeamLog] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (user?.id) setPersonalLog(getLocalLog(user.id))
  }, [user?.id])

  useEffect(() => {
    if (!teamId) return
    const unsub = subscribeToTeamLog(teamId, (log) => {
      setTeamLog([...log].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')))
    })
    return () => unsub()
  }, [teamId])

  const isTeam = teamMode && !!team
  const rawLog = isTeam ? teamLog : [...personalLog].reverse()

  const filtered = useMemo(() => {
    return rawLog.filter(e => {
      const matchFilter = filter === 'all' || e.action?.includes(filter)
      const matchSearch = !search ||
        e.productName?.toLowerCase().includes(search.toLowerCase()) ||
        e.userName?.toLowerCase().includes(search.toLowerCase()) ||
        actionLabel(e.action)?.toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    })
  }, [rawLog, filter, search])

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = [
      ['Vaqt', 'Foydalanuvchi', 'Amal', 'Mahsulot', 'Miqdor', "Narx (so'm)", 'Izoh'],
      ...filtered.map(e => [
        new Date(e.timestamp).toLocaleString('uz-UZ'),
        e.userName || '',
        actionLabel(e.action),
        e.productName || '',
        e.quantity ? `${e.quantity} ${e.unit || ''}` : '',
        e.total ? fmtNum(e.total) : '',
        e.note || ''
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Audit log')
    XLSX.writeFile(wb, `omborbek-audit-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="bg-slate-900 px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-primary-400" />
            <h1 className="text-white text-xl font-bold">Harakat tarixi</h1>
          </div>
          <button onClick={exportExcel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Download size={18} className="text-primary-400" />
          </button>
        </div>

        {/* Jamoa / Shaxsiy toggle */}
        {team && (
          <div className="flex bg-slate-800/60 rounded-xl p-1 mb-3">
            <button onClick={() => setTeamMode(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              Mening tarixim
            </button>
            <button onClick={() => setTeamMode(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${teamMode ? 'bg-primary-500 text-white' : 'text-slate-400'}`}>
              <Users size={12} /> {team.name}
            </button>
          </div>
        )}

        {/* Qidiruv */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mahsulot, foydalanuvchi..."
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500/40" />
        </div>
      </div>

      {/* Action filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {ACTION_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === f.key ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-4 mb-2">
        <p className="text-slate-500 text-xs">{filtered.length} ta yozuv</p>
      </div>

      {/* Log list */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <ClipboardList size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">{search ? t('notFound') : 'Hali hech narsa yozilmagan'}</p>
          </div>
        ) : (
          filtered.map(entry => {
            const meta = ACTION_ICONS[entry.action] || { icon: ClipboardList, color: 'text-slate-400', bg: 'bg-slate-700/40' }
            const Icon = meta.icon
            const isExpanded = expanded === entry.id

            return (
              <button key={entry.id} onClick={() => setExpanded(isExpanded ? null : entry.id)}
                className="w-full bg-slate-800/60 rounded-xl border border-slate-700/30 text-left overflow-hidden transition-all active:scale-[0.99]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Icon size={17} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium truncate">
                        {actionLabel(entry.action)}
                      </p>
                      <span className="text-slate-500 text-xs flex-shrink-0">{timeAgo(entry.timestamp)}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                      {entry.productName && <span className="text-slate-300">{entry.productName}</span>}
                      {entry.quantity && <span> · {fmtNum(entry.quantity)} {entry.unit}</span>}
                      {entry.userName && entry.userId !== user?.id && (
                        <span className="text-primary-400 ml-1">@ {entry.userName}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Kengaytirilgan tafsilot */}
                {isExpanded && (
                  <div className="border-t border-slate-700/40 px-4 py-3 bg-slate-900/40 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {entry.userName && (
                        <Detail label="Foydalanuvchi" value={entry.userName} />
                      )}
                      {entry.timestamp && (
                        <Detail label="Vaqt" value={new Date(entry.timestamp).toLocaleString('uz-UZ')} />
                      )}
                      {entry.quantity != null && (
                        <Detail label="Miqdor" value={`${fmtNum(entry.quantity)} ${entry.unit || ''}`} />
                      )}
                      {entry.price != null && entry.price > 0 && (
                        <Detail label="Narx" value={`${fmtNum(entry.price)} so'm`} />
                      )}
                      {entry.total != null && entry.total > 0 && (
                        <Detail label="Jami" value={`${fmtNum(entry.total)} so'm`} highlight />
                      )}
                      {entry.supplier && (
                        <Detail label="Yetkazib beruvchi" value={entry.supplier} />
                      )}
                      {entry.customer && (
                        <Detail label="Xaridor" value={entry.customer} />
                      )}
                      {entry.count != null && (
                        <Detail label="Import soni" value={`${entry.count} ta mahsulot`} />
                      )}
                    </div>
                    {entry.note && (
                      <p className="text-slate-400 text-xs border-t border-slate-700/40 pt-2">{entry.note}</p>
                    )}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function Detail({ label, value, highlight }) {
  return (
    <div className="bg-slate-800/60 rounded-xl px-3 py-2">
      <p className="text-slate-500 text-[10px] mb-0.5">{label}</p>
      <p className={`text-xs font-medium ${highlight ? 'text-primary-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
