import { useNavigate } from 'react-router-dom'
import { Truck, Factory, ChevronRight } from 'lucide-react'

export default function Hamkorlar() {
  const nav = useNavigate()

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="page-animate px-4 pt-4">
        <h1 className="text-xl font-bold text-white mb-6">Hamkorlar</h1>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => nav('/hamkorlar/yetkazib-beruvchilar')}
            className="flex items-center gap-4 bg-gray-800 rounded-2xl p-4 w-full text-left active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Truck size={24} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Yetkazib beruvchilar</p>
              <p className="text-gray-400 text-sm mt-0.5">Xomashyo va material yetkazuvchilar</p>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </button>

          <button
            onClick={() => nav('/hamkorlar/ishlab-chiqaruvchilar')}
            className="flex items-center gap-4 bg-gray-800 rounded-2xl p-4 w-full text-left active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Factory size={24} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Ishlab chiqaruvchilar</p>
              <p className="text-gray-400 text-sm mt-0.5">Xizmat ko'rsatuvchilar</p>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
