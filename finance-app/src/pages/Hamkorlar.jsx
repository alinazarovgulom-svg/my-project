import { useNavigate } from 'react-router-dom'
import { Truck, Factory, ChevronRight } from 'lucide-react'

export default function Hamkorlar() {
  const navigate = useNavigate()

  const cards = [
    {
      to: '/hamkorlar/yetkazib-beruvchilar',
      icon: Truck,
      title: 'Yetkazib beruvchilar',
      desc: 'Xomashyo va materiallar',
      color: 'blue',
    },
    {
      to: '/hamkorlar/ishlab-chiqaruvchilar',
      icon: Factory,
      title: 'Ishlab chiqaruvchilar',
      desc: 'Xizmat va ishlab chiqarish',
      color: 'purple',
    },
  ]

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate">
        <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-4 pb-3">
          <h1 className="text-xl font-bold text-white mb-1">Hamkorlar</h1>
          <p className="text-gray-400 text-sm">Yetkazib beruvchilar va ishlab chiqaruvchilar</p>
        </div>

        <div className="px-4 flex flex-col gap-3 mt-2">
          {cards.map(({ to, icon: Icon, title, desc, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="card flex items-center gap-4 active:opacity-80 text-left w-full"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color === 'blue' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                <Icon size={22} className={color === 'blue' ? 'text-blue-400' : 'text-purple-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{title}</p>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
