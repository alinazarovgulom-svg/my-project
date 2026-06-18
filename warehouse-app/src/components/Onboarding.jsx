import { useState, useEffect } from 'react'
import { Package, TrendingUp, Users, BarChart3, Boxes } from 'lucide-react'

const features = [
  { icon: Package, label: 'Mahsulot katalogi', desc: 'Barcha mahsulotlarni bir joyda' },
  { icon: TrendingUp, label: 'Kirim / Chiqim', desc: 'Har bir harakatni kuzatish' },
  { icon: Boxes, label: 'Joriy qoldiq', desc: 'Real vaqtda inventar' },
  { icon: BarChart3, label: 'Hisobotlar', desc: 'PDF va Excel eksport' },
  { icon: Users, label: 'Jamoa rejimi', desc: 'Ko\'p foydalanuvchi qo\'llab-quvvatlash' },
]

export default function Onboarding({ onDone }) {
  const [phase, setPhase] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => setPhase(3), 1500)
    const t4 = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [onDone])

  return (
    <div className={`fixed inset-0 z-[998] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-8 w-full max-w-sm">
        <div className={`flex flex-col items-center gap-3 transition-all duration-700 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/30">
            <Package size={48} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">OmborBek</h1>
            <p className="text-primary-400 text-sm mt-1">Ombor boshqaruv tizimi</p>
          </div>
        </div>

        <div className={`w-full space-y-2.5 transition-all duration-700 delay-200 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {features.map(({ icon: Icon, label, desc }, i) => (
            <div key={i}
              className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700/50"
              style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-primary-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white text-sm font-medium">{label}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`w-full transition-all duration-500 delay-400 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">Yuklanmoqda...</p>
        </div>
      </div>
    </div>
  )
}
