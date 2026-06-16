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
import AppLock from './components/AppLock'
import Onboarding from './components/Onboarding'
import { useState } from 'react'
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
  const [onboarded, setOnboarded] = useState(false)

  const handleDone = () => {
    setOnboarded(true)
  }

  return (
    <BrowserRouter>
      <AppProvider>
        {!onboarded && <Onboarding onDone={handleDone} />}
        <AppLock>
          <AppRoutes />
        </AppLock>
      </AppProvider>
    </BrowserRouter>
  )
}
