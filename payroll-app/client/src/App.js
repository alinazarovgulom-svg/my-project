import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeReport from './pages/EmployeeReport';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const openEmployeeReport = (id) => {
    setSelectedEmployeeId(id);
    setPage('employee-report');
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'employees': return <Employees onViewReport={openEmployeeReport} />;
      case 'employee-report': return (
        <EmployeeReport
          employeeId={selectedEmployeeId}
          onBack={() => setPage('employees')}
        />
      );
      case 'attendance': return <Attendance />;
      case 'payroll': return <Payroll />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <AppProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar activePage={page} onNavigate={setPage} />
        <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
}
