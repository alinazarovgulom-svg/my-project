import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Xodimlar from './pages/Xodimlar'
import XodimDetail from './pages/XodimDetail'
import OylikHisob from './pages/OylikHisob'
import Tolovlar from './pages/Tolovlar'
import Chiqimlar from './pages/Chiqimlar'
import Chek from './pages/Chek'
import Hisobot from './pages/Hisobot'
import Sozlamalar from './pages/Sozlamalar'
import MyProfile from './pages/MyProfile'

function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Yuklanmoqda...</div>
  if (!user) return <Navigate to="/login" />
  if (roles && profile && !roles.includes(profile.rol)) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="xodimlar" element={<PrivateRoute roles={['admin','buxgalter']}><Xodimlar /></PrivateRoute>} />
          <Route path="xodimlar/:id" element={<PrivateRoute roles={['admin','buxgalter']}><XodimDetail /></PrivateRoute>} />
          <Route path="oylik" element={<PrivateRoute roles={['admin','buxgalter']}><OylikHisob /></PrivateRoute>} />
          <Route path="tolovlar" element={<PrivateRoute roles={['admin','buxgalter']}><Tolovlar /></PrivateRoute>} />
          <Route path="chiqimlar" element={<PrivateRoute roles={['admin','buxgalter']}><Chiqimlar /></PrivateRoute>} />
          <Route path="chek" element={<PrivateRoute roles={['admin','buxgalter']}><Chek /></PrivateRoute>} />
          <Route path="hisobot" element={<PrivateRoute roles={['admin','buxgalter']}><Hisobot /></PrivateRoute>} />
          <Route path="sozlamalar" element={<PrivateRoute roles={['admin']}><Sozlamalar /></PrivateRoute>} />
          <Route path="profil" element={<MyProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
