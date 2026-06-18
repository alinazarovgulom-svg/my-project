import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import { LangProvider } from './i18n/LangContext'
import { ThemeProvider } from './store/ThemeContext'
import BottomNav from './components/BottomNav'
import AppLock from './components/AppLock'
import Onboarding from './components/Onboarding'
import OfflineBanner from './components/OfflineBanner'
import SyncToast from './components/SyncToast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Family from './pages/Family'
import AuditLog from './pages/AuditLog'
import Suppliers from './pages/Suppliers'
import { useState, useEffect, useRef } from 'react'
import './index.css'

function ProtectedLayout() {
  const { user, online, pendingCount, syncPhase } = useApp()
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      {!online && <OfflineBanner pendingCount={pendingCount} />}
      {online && syncPhase && <SyncToast phase={syncPhase} />}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/stock-in" element={<StockIn />} />
        <Route path="/stock-out" element={<StockOut />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/team" element={<Family />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/suppliers" element={<Suppliers />} />
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
        const pins = Object.keys(localStorage).filter(k => k.startsWith('wh_pin_'))
        if (pins.length === 0) setShowSplash(true)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <AppProvider>
            {showSplash && <Onboarding onDone={() => setShowSplash(false)} />}
            <AppLock onUnlock={() => setShowSplash(false)}>
              <AppRoutes />
            </AppLock>
          </AppProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
