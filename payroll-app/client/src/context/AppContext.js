import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [employees, setEmployees] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('employees:updated', setEmployees);
    s.on('payroll:updated', setPayrollRecords);
    s.on('attendance:updated', setAttendanceRecords);

    return () => s.disconnect();
  }, []);

  const api = {
    addEmployee: (data) => axios.post('/api/employees', data),
    updateEmployee: (id, data) => axios.put(`/api/employees/${id}`, data),
    deleteEmployee: (id) => axios.delete(`/api/employees/${id}`),

    saveAttendance: (data) => {
      const existing = attendanceRecords.find(
        r => r.employeeId === data.employeeId && r.month === data.month
      );
      return existing
        ? axios.put(`/api/attendance/${existing.id}`, data)
        : axios.post('/api/attendance', data);
    },

    calculatePayroll: (month, year) =>
      axios.post('/api/payroll/calculate', { month, year }),

    approvePayroll: (id) => axios.put(`/api/payroll/${id}/approve`),
  };

  return (
    <AppContext.Provider value={{ employees, payrollRecords, attendanceRecords, connected, api }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
