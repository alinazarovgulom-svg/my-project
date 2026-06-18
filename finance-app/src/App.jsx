import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import Family from './pages/Family'
import Hamkorlar from './pages/Hamkorlar'
import HamkorlarList from './pages/HamkorlarList'
import HamkorDetail from './pages/HamkorDetail'
import AppLock from './components/AppLock'
import Onboarding from './components/Onboarding'
import { useState, useEffect, useRef } from 'react'
import './index.css'

function ProtectedLayout() {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/exchange" element={<Exchange />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/family" element={<Family />} />
        <Route path="/hamkorlar" element={<Hamkorlar />} />
        <Route path="/hamkorlar/:type" element={<HamkorlarList />} />
        <Route path="/hamkorlar/:type/:id" element={<HamkorDetail />} />
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
        // Only show splash if no PIN lock is active (AppLock handles that case)
        const users = Object.keys(localStorage).filter(k => k.startsWith('finance_pin_'))
        if (users.length === 0) {
          setShowSplash(true)
        }
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
