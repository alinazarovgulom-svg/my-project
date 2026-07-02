import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HelpCircle, LogOut, Phone, Mail, X } from 'lucide-react'

export default function Settings() {
  const { signOut, userDoc } = useAuth()
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Sozlamalar</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* User info */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {userDoc?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-800 text-sm truncate">{userDoc?.name}</div>
            <div className="text-xs text-gray-400 truncate">{userDoc?.email}</div>
          </div>
        </div>

        {/* Yordam */}
        <button
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-gray-800">Yordam</span>
        </button>

        {/* Chiqish */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-sm font-medium text-red-600">Chiqish</span>
        </button>
      </div>

      {/* Yordam modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 modal-enter">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">Yordam</h2>
              <button onClick={() => setHelpOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <a
                href="tel:+998917606666"
                className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Telefon</div>
                  <div className="text-sm font-semibold text-gray-800">+998 91 760 66 66</div>
                </div>
              </a>

              <a
                href="mailto:kaftimda@gmail.com"
                className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Email</div>
                  <div className="text-sm font-semibold text-gray-800">kaftimda@gmail.com</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
