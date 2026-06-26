import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Debts from './pages/Debts'
import Exchange from './pages/Exchange'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Categories from './pages/Categories'
import Hamkorlar from './pages/Hamkorlar'
import HamkorlarList from './pages/HamkorlarList'
import HamkorDetail from './pages/HamkorDetail'
import Korxona from './pages/Korxona'
import Haydovchilar from './pages/Haydovchilar'
import MenuPage from './pages/MenuPage'
import Profile from './pages/Profile'
import AppLock from './components/AppLock'
import Onboarding from './components/Onboarding'
import { useState, useEffect, useRef } from 'react'
import './index.css'

function AnimatedPage({ children }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-animate" style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}

function ProtectedLayout() {
  const { user } = useApp()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Routes location={location}>
        <Route path="/" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
        <Route path="/menu" element={<AnimatedPage><MenuPage /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
        <Route path="/notifications" element={
          <AnimatedPage>
            <div className="min-h-screen flex items-center justify-center page-bg" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Tez orada...
            </div>
          </AnimatedPage>
        } />
        <Route path="/transactions" element={<AnimatedPage><Transactions /></AnimatedPage>} />
        <Route path="/debts" element={<AnimatedPage><Debts /></AnimatedPage>} />
        <Route path="/exchange" element={<AnimatedPage><Exchange /></AnimatedPage>} />
        <Route path="/reports" element={<AnimatedPage><Reports /></AnimatedPage>} />
        <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
        <Route path="/categories" element={<AnimatedPage><Categories /></AnimatedPage>} />
        <Route path="/hamkorlar" element={<AnimatedPage><Hamkorlar /></AnimatedPage>} />
        <Route path="/hamkorlar/:sectionId" element={<AnimatedPage><HamkorlarList /></AnimatedPage>} />
        <Route path="/hamkorlar/:sectionId/:id" element={<AnimatedPage><HamkorDetail /></AnimatedPage>} />
        <Route path="/korxona" element={<AnimatedPage><Korxona /></AnimatedPage>} />
        <Route path="/haydovchilar" element={<AnimatedPage><Haydovchilar /></AnimatedPage>} />
      </Routes>
      <BottomNav />
    </>
  )
}

function AppRoutes() {
  const { user } = useApp()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const wasHidden = useRef(false)

  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        wasHidden.current = true
      } else if (wasHidden.current) {
        wasHidden.current = false
        const users = Object.keys(localStorage).filter(k => k.startsWith('finance_pin_'))
        if (users.length === 0) setShowSplash(true)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <BrowserRouter>
      <AppProvider>
        {showSplash && <Onboarding onDone={() => setShowSplash(false)} />}
        <AppLock onUnlock={() => setShowSplash(false)}>
          <AppRoutes />
        </AppLock>
      </AppProvider>
    </BrowserRouter>
  )
}
