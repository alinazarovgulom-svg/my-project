import { TrendingUp, TrendingDown, Wallet, ArrowRight, Users, ArrowLeftRight } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'
import { getData } from '../store/storage'
import { useLang } from '../i18n/LangContext'
import { fmtCur } from '../utils/format'

const fmt = (n, cur) => fmtCur(n, cur)

const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }

export default function Dashboard() {
  const { user, transactions: personalTx, familyTransactions, debts, familyDebts, family, familyMembers, settings, workspace } = useApp()
  const uid = user?.id
  const transactions = family ? familyTransactions : personalTx
  const activeDebtsList = family ? familyDebts : debts
  const { t } = useLang()
  const nav = useNavigate()

  const rates = settings?.rates || { USD: 12700, EUR: 13800, RUB: 140 }

  const toUZS = (amount, currency) => {
    if (!currency || currency === 'UZS') return amount
    return amount * (rates[currency] || 1)
  }

  // Per-currency balance (not converted)
  const currencyBalances = ['UZS', 'USD', 'EUR', 'RUB'].map(cur => {
    const bal = transactions
      .filter(t => (t.currency || 'UZS') === cur)
      .reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
    return { cur, bal }
  }).filter(x => x.bal !== 0)

  // Compute balances with currency conversion
  const balance = transactions.reduce((sum, tx) => {
    const inUZS = toUZS(tx.amount, tx.currency)
    return tx.type === 'income' ? sum + inUZS : sum - inUZS
  }, 0)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + toUZS(t.amount, t.currency), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + toUZS(t.amount, t.currency), 0)

  // Today's income/expense per currency (for balance card)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayTx = transactions.filter(t => t.date?.slice(0, 10) === todayStr && t.category !== 'Valyuta ayirboshlash')
  const currencies = ['UZS', 'USD', 'EUR', 'RUB']
  const currencyBreakdown = currencies.map(cur => {
    const income = todayTx.filter(t => t.type === 'income' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    const expense = todayTx.filter(t => t.type === 'expense' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    return { cur, income, expense }
  }).filter(x => x.income > 0 || x.expense > 0)


  const hasMultiCurrency = currencyBreakdown.some(x => x.cur !== 'UZS')

  // Today's confirmed conversions — derived from paired 'Valyuta ayirboshlash' transactions
  const todayConversions = (() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const outTxs = transactions.filter(t =>
      t.category === 'Valyuta ayirboshlash' &&
      t.type === 'expense' &&
      t.date?.slice(0, 10) === today &&
      t.pairId
    )
    return outTxs.map(out => {
      const inn = transactions.find(t => t.pairId === out.pairId && t.type === 'income')
      if (!inn) return null
      return { amount: out.amount, from: out.currency || 'UZS', result: inn.amount, to: inn.currency || 'UZS', note: out.note }
    }).filter(Boolean)
  })()

const recent = [...transactions].filter(t => t.category !== 'Valyuta ayirboshlash').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  const activeDebts = activeDebtsList.filter(d => d.remaining > 0)
  const myDebts = activeDebts.filter(d => d.direction === 'borrowed')
  const theirDebts = activeDebts.filter(d => d.direction === 'lent')

  const avatarUrl = (() => { try { return localStorage.getItem(`finance_avatar_${uid}`) } catch { return null } })()
  const initials = user?.name?.[0]?.toUpperCase() || 'U'
  const nowTime = format(new Date(), 'HH:mm')
  const members = workspace?.members || []

  return (
    <div className="min-h-screen pb-24" style={{ background: '#08080f' }}>
      {/* Top bar: avatar + online vaqt */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-[15px] font-black text-white"
              style={{
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#f97316,#ef4444)',
                boxShadow: '0 0 0 2px #22c55e, 0 0 0 4px #08080f',
              }}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2" style={{ borderColor: '#08080f' }}></div>
          </div>
          <div>
            <div className="text-gray-400 text-[10px]">Xush kelibsiz</div>
            <div className="text-white text-[15px] font-black leading-tight">{user?.name}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 5px rgba(34,197,94,0.8)' }}></div>
              <span className="text-green-400 text-[9px] font-semibold">Onlayn · {nowTime} dan</span>
            </div>
          </div>
        </div>
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 flex items-center justify-center text-[7px] font-black text-white" style={{ borderColor: '#08080f' }}>3</div>
        </div>
      </div>

      {/* Balance card */}
      <div className="mx-4 mb-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1a1060,#2d1b69 50%,#1e0d4e)', borderRadius: 24, padding: 18, border: '1px solid rgba(139,92,246,0.2)' }}>
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl opacity-30 pointer-events-none" style={{ background: '#8b5cf6' }}></div>
        <div className="absolute -bottom-6 left-5 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: '#6366f1' }}></div>
        <div className="relative z-10">
          <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{t('balance')}</div>
          {currencyBalances.length > 0 ? currencyBalances.map(({ cur, bal }) => (
            <div key={cur} className="text-white font-black text-[28px] tracking-tight leading-none mb-1">
              {bal < 0 ? '-' : ''}{fmt(Math.abs(bal), cur)} <span className="text-[14px] font-medium opacity-50">{cur}</span>
            </div>
          )) : (
            <div className="text-white font-black text-[28px] tracking-tight mb-1">0 <span className="text-[14px] font-medium opacity-50">so'm</span></div>
          )}
          <div className="flex gap-2 mt-3">
            <div className="flex-1 rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.2)' }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                </div>
                <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Bugungi kirim</span>
              </div>
              {currencyBreakdown.filter(x => x.income > 0).map(({ cur, income: inc }) => (
                <div key={cur} className="text-green-400 text-[13px] font-black leading-tight">+{fmt(inc, cur)} <span className="text-[9px] font-medium opacity-70">{cur}</span></div>
              ))}
              {!currencyBreakdown.some(x => x.income > 0) && <div className="text-[13px] font-black" style={{ color: 'rgba(255,255,255,0.25)' }}>0</div>}
            </div>
            <div className="flex-1 rounded-2xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-1 mb-1">
                <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.2)' }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Bugungi chiqim</span>
              </div>
              {currencyBreakdown.filter(x => x.expense > 0).map(({ cur, expense: exp }) => (
                <div key={cur} className="text-red-400 text-[13px] font-black leading-tight">-{fmt(exp, cur)} <span className="text-[9px] font-medium opacity-70">{cur}</span></div>
              ))}
              {!currencyBreakdown.some(x => x.expense > 0) && <div className="text-[13px] font-black" style={{ color: 'rgba(255,255,255,0.25)' }}>0</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-between px-4 mb-2">
        <span className="text-white text-[13px] font-bold">Tezkor amallar</span>
      </div>
      <div className="flex gap-3 px-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { label: 'Kirim',   c: 'rgba(99,102,241,0.12)',  b: 'rgba(99,102,241,0.2)',  s: '#818cf8', to: '/transactions', svg: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></> },
          { label: 'Chiqim',  c: 'rgba(239,68,68,0.1)',    b: 'rgba(239,68,68,0.18)',   s: '#f87171', to: '/transactions', svg: <line x1="5" y1="12" x2="19" y2="12"/> },
          { label: 'Qarz',    c: 'rgba(34,197,94,0.1)',    b: 'rgba(34,197,94,0.18)',   s: '#4ade80', to: '/debts',         svg: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
          { label: 'Valyuta', c: 'rgba(251,191,36,0.1)',   b: 'rgba(251,191,36,0.18)',  s: '#fbbf24', to: '/exchange',      svg: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/> },
          { label: 'Hisobot', c: 'rgba(6,182,212,0.1)',    b: 'rgba(6,182,212,0.18)',   s: '#22d3ee', to: '/reports',       svg: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
        ].map(({ label, c, b, s, to, svg }) => (
          <button key={label} onClick={() => nav(to)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-12 h-12 rounded-[16px] flex items-center justify-center" style={{ background: c, border: `1px solid ${b}` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{svg}</svg>
            </div>
            <span className="text-[9px] font-bold" style={{ color: '#4b5563' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Online members */}
      {members.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 mt-3 mb-2">
            <span className="text-white text-[13px] font-bold">A'zolar holati</span>
            <button onClick={() => nav('/korxona')} className="text-[11px] font-semibold" style={{ color: '#6366f1' }}>Barchasi →</button>
          </div>
          <div className="flex gap-2.5 px-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {members.map((m, i) => {
              const isOnline = i % 3 !== 2
              const isAway = !isOnline && i % 2 === 0
              const ring = isOnline ? '#22c55e' : isAway ? '#f59e0b' : '#1f2937'
              const dot = isOnline ? '#22c55e' : isAway ? '#f59e0b' : '#374151'
              const lbl = isOnline ? 'Onlayn' : isAway ? 'Band' : 'Oflayn'
              const cls = isOnline ? { color: '#4ade80', bg: 'rgba(34,197,94,0.1)' } : isAway ? { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' } : { color: '#4b5563', bg: 'rgba(75,85,99,0.15)' }
              return (
                <div key={m.userId} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="relative w-11 h-11">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-black text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: `0 0 0 2px ${ring}, 0 0 0 4px #08080f` }}>
                      {(m.fullName || m.username)?.[0]?.toUpperCase()}
                    </div>
                    <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: dot, borderColor: '#08080f' }}></div>
                  </div>
                  <span className="text-[9px] font-semibold max-w-[48px] truncate text-center" style={{ color: '#6b7280' }}>{(m.fullName || m.username)?.split(' ')[0]}</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: cls.color, background: cls.bg }}>{lbl}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Today conversions */}
      {todayConversions.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight size={13} className="text-blue-400" />
            <span className="text-gray-400 text-[11px]">Bugungi konvertatsiyalar</span>
          </div>
          {todayConversions.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2 mb-1 last:mb-0" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-white text-[12px] font-medium">{c.amount} {c.from}</span>
              <ArrowRight size={11} className="text-gray-600" />
              <span className="text-blue-400 text-[12px] font-medium">{c.result} {c.to}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active debts */}
      {activeDebts.length > 0 && (
        <div className="mx-4 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-[13px] font-bold">{t('activeDebts')}</span>
            <button onClick={() => nav('/debts')} className="text-[11px] font-semibold" style={{ color: '#6366f1' }}>{t('allTx')} →</button>
          </div>
          <div className="flex gap-2">
            {myDebts.length > 0 && (
              <div className="flex-1 rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.1)' }}>
                <div className="text-red-400 text-[9px] font-bold mb-1">{t('myDebts')}</div>
                <div className="text-white text-[13px] font-black">{myDebts.length} ta</div>
              </div>
            )}
            {theirDebts.length > 0 && (
              <div className="flex-1 rounded-2xl p-3" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.1)' }}>
                <div className="text-green-400 text-[9px] font-bold mb-1">{t('theyOwe')}</div>
                <div className="text-white text-[13px] font-black">{theirDebts.length} ta</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-[13px] font-bold">{t('recentTx')}</span>
          <button onClick={() => nav('/transactions')} className="text-[11px] font-semibold" style={{ color: '#6366f1' }}>{t('allTx')} →</button>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl py-8 flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <Wallet size={28} className="text-gray-700 mb-2" />
            <span className="text-gray-600 text-[12px]">{t('noTransactions')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{
                  background: tx.type === 'income' ? 'rgba(74,222,128,0.09)' : 'rgba(248,113,113,0.09)',
                  border: `1px solid ${tx.type === 'income' ? 'rgba(74,222,128,0.13)' : 'rgba(248,113,113,0.13)'}`,
                }}>
                  {tx.emoji || (tx.type === 'income' ? '↑' : '↓')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate" style={{ color: '#e5e7eb' }}>{tx.category}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: '#374151' }}>{tx.note || format(new Date(tx.date), 'dd.MM.yyyy')}</div>
                </div>
                <div className={`text-[13px] font-black whitespace-nowrap ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount, tx.currency || 'UZS')} <span className="text-[9px] font-medium opacity-60">{tx.currency || 'UZS'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
