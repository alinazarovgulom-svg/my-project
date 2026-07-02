import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DepartmentsProvider } from './contexts/DepartmentsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Operations from './pages/Operations'
import Employees from './pages/Employees'
import DepartmentWork from './pages/DepartmentWork'
import Reports from './pages/Reports'
import Members from './pages/Members'
import Departments from './pages/Departments'
import Attendance from './pages/Attendance'
import Shifts from './pages/Shifts'
import TVDisplay from './pages/TVDisplay'
import MonthlyReport from './pages/MonthlyReport'
import EmployeeCard from './pages/EmployeeCard'
import Settings from './pages/Settings'
import { useAuth } from './contexts/AuthContext'

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/tv/:deptId" element={<TVDisplay />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/operations" element={<Operations />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employee/:empId" element={<EmployeeCard />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/department/:deptId" element={<DepartmentWork />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/monthly" element={<MonthlyReport />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/members" element={<Members />} />
                <Route path="/shifts" element={<Shifts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DepartmentsProvider>
          <AppRoutes />
        </DepartmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
