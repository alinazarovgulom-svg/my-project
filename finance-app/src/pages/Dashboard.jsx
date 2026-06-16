import { TrendingUp, TrendingDown, Wallet, ArrowRight, Plus, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'
import { getData } from '../store/storage'
import { useLang } from '../i18n/LangContext'

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Math.abs(Math.round(n)))

const FLAGS = { UZS: '🇺🇿', USD: '🇺🇸', EUR: '🇪🇺', RUB: '🇷🇺' }

export default function Dashboard() {
  const { user, transactions, debts, family, familyMembers, settings } = useApp()
  const { t } = useLang()
  const nav = useNavigate()

  const rates = settings?.rates || { USD: 12700, EUR: 13800, RUB: 140 }

  const toUZS = (amount, currency) => {
    if (!currency || currency === 'UZS') return amount
    return amount * (rates[currency] || 1)
  }

  // Compute balances with currency conversion
  const balance = transactions.reduce((sum, tx) => {
    const inUZS = toUZS(tx.amount, tx.currency)
    return tx.type === 'income' ? sum + inUZS : sum - inUZS
  }, 0)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + toUZS(t.amount, t.currency), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + toUZS(t.amount, t.currency), 0)

  // Currency breakdown
  const currencies = ['UZS', 'USD', 'EUR', 'RUB']
  const currencyBreakdown = currencies.map(cur => {
    const income = transactions.filter(t => t.type === 'income' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense' && (t.currency || 'UZS') === cur).reduce((s, t) => s + t.amount, 0)
    return { cur, income, expense }
  }).filter(x => x.income > 0 || x.expense > 0)

  const hasMultiCurrency = currencyBreakdown.some(x => x.cur !== 'UZS')

  // Family balances
  const memberBalances = family
    ? familyMembers.map(m => {
        const memberTx = getData('transactions', m.userId)
        const bal = memberTx.reduce((sum, tx) => {
          const inUZS = toUZS(tx.amount, tx.currency)
          return tx.type === 'income' ? sum + inUZS : sum - inUZS
        }, 0)
        return { ...m, balance: bal }
      })
    : []
  const familyTotalBalance = memberBalances.reduce((s, m) => s + m.balance, 0)

  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  const activeDebts = debts.filter(d => d.remaining > 0)
  const myDebts = activeDebts.filter(d => d.direction === 'borrowed')
  const theirDebts = activeDebts.filter(d => d.direction === 'lent')

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{t('hello')}</p>
          <h1 className="text-xl font-bold text-white">{user?.name} 👋</h1>
        </div>
        <div className="text-right flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-bold tracking-widest text-blue-400/60 uppercase">by KAFTIMDA</span>
          <p className="text-gray-500 text-xs">{format(new Date(), 'dd MMM yyyy', { locale: uz })}</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <p className="text-blue-200 text-sm mb-1">{t('balance')}</p>
          <p className="text-white text-3xl font-bold">{fmt(balance)} <span className="text-lg font-normal">so'm</span></p>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-blue-200 text-xs">{t('income')}</p>
                {currencyBreakdown.filter(x => x.income > 0).map(({ cur, income: inc }) => (
                  <p key={cur} className="text-white text-xs font-semibold leading-tight">+{fmt(inc)} {cur}</p>
                ))}
                {currencyBreakdown.filter(x => x.income > 0).length === 0 && (
                  <p className="text-white text-sm font-semibold">{fmt(totalIncome)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-blue-200 text-xs">{t('expense')}</p>
                {currencyBreakdown.filter(x => x.expense > 0).map(({ cur, expense: exp }) => (
                  <p key={cur} className="text-white text-xs font-semibold leading-tight">-{fmt(exp)} {cur}</p>
                ))}
                {currencyBreakdown.filter(x => x.expense > 0).length === 0 && (
                  <p className="text-white text-sm font-semibold">{fmt(totalExpense)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-currency breakdown */}
      {hasMultiCurrency && (
        <div className="card">
          <p className="text-gray-400 text-xs mb-3">💱 Valyutalar bo'yicha (bugungi kurs)</p>
          <div className="flex flex-col gap-2">
            {currencyBreakdown.map(({ cur, income, expense }) => (
              <div key={cur} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{FLAGS[cur] || '🌐'}</span>
                  <span className="text-gray-300 text-sm font-medium">{cur}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  {income > 0 && <span className="text-green-400">+{fmt(income)} {cur}</span>}
                  {expense > 0 && <span className="text-red-400">-{fmt(expense)} {cur}</span>}
                  {cur !== 'UZS' && (
                    <span className="text-gray-500">≈ {fmt(toUZS(income - expense, cur))} UZS</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => nav('/transactions')} className="card flex items-center gap-3 active:opacity-70 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Plus size={20} className="text-green-400" />
          </div>
          <span className="text-sm font-medium text-white">{t('addIncome')}</span>
        </button>
        <button onClick={() => nav('/transactions')} className="card flex items-center gap-3 active:opacity-70 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Plus size={20} className="text-red-400" />
          </div>
          <span className="text-sm font-medium text-white">{t('addExpense')}</span>
        </button>
      </div>

      {/* Family Balance */}
      {family && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              <h2 className="font-semibold text-white">{t('familyBalance')}</h2>
            </div>
            <button onClick={() => nav('/family')} className="text-purple-400 text-sm flex items-center gap-1">
              {t('allTx')} <ArrowRight size={14} />
            </button>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-3 mb-3">
            <p className="text-purple-300 text-xs mb-0.5">{t('familyBalance')}</p>
            <p className={`text-xl font-bold ${familyTotalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {familyTotalBalance >= 0 ? '+' : '-'}{fmt(familyTotalBalance)} so'm
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {memberBalances.map(m => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-300 text-xs font-bold">
                    {(m.fullName || m.username || '?')[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-300 text-sm flex-1 truncate">{m.fullName}</p>
                <p className={`text-sm font-semibold ${m.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {m.balance >= 0 ? '+' : '-'}{fmt(m.balance)} so'm
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debts Summary */}
      {activeDebts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">{t('activeDebts')}</h2>
            <button onClick={() => nav('/debts')} className="text-blue-400 text-sm flex items-center gap-1">
              {t('allTx')} <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex gap-3">
            {myDebts.length > 0 && (
              <div className="flex-1 bg-red-500/10 rounded-xl p-3">
                <p className="text-red-400 text-xs mb-1">{t('myDebts')}</p>
                <p className="text-white font-semibold text-sm">{myDebts.length} ta qarz</p>
              </div>
            )}
            {theirDebts.length > 0 && (
              <div className="flex-1 bg-green-500/10 rounded-xl p-3">
                <p className="text-green-400 text-xs mb-1">{t('theyOwe')}</p>
                <p className="text-white font-semibold text-sm">{theirDebts.length} ta qarz</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">{t('recentTx')}</h2>
          <button onClick={() => nav('/transactions')} className="text-blue-400 text-sm flex items-center gap-1">
            {t('allTx')} <ArrowRight size={14} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="card text-center py-8">
            <Wallet size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{t('noTransactions')}</p>
            <p className="text-gray-600 text-xs mt-1">Birinchi operatsiyangizni qo'shing</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map(tx => (
              <div key={tx.id} className="card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${tx.type === 'income' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {tx.emoji || (tx.type === 'income' ? '💰' : '💸')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{tx.category}</p>
                  <p className="text-gray-500 text-xs">{tx.note || format(new Date(tx.date), 'dd.MM.yyyy')}</p>
                </div>
                <p className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)} {tx.currency || 'UZS'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
