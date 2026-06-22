import React from 'react';
import { useApp } from '../context/AppContext';

function StatCard({ label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 12, padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`, flex: 1, minWidth: 180
      }}
    >
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{value}</p>
    </div>
  );
}

function fmt(n) {
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so\'m';
}

export default function Dashboard({ onNavigate }) {
  const { employees, payrollRecords } = useApp();
  const active = employees.filter(e => e.status === 'active').length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = payrollRecords.filter(r => r.month === currentMonth);
  const monthTotal = monthRecords.reduce((s, r) => s + r.netSalary, 0);
  const avgSalary = active ? Math.round(employees.reduce((s, e) => s + e.baseSalary, 0) / active) : 0;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Bosh sahifa
      </h1>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Faol xodimlar" value={active} color="#38bdf8" onClick={() => onNavigate('employees')} />
        <StatCard label="O'rtacha maosh" value={fmt(avgSalary)} color="#a78bfa" />
        <StatCard label="Bu oylik maosh jamg'armasi" value={fmt(monthTotal)} color="#22c55e" onClick={() => onNavigate('payroll')} />
        <StatCard label="Hisoblangan yozuvlar" value={payrollRecords.length} color="#f59e0b" onClick={() => onNavigate('payroll')} />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1e293b' }}>
          So'nggi xodimlar
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Ism', 'Lavozim', 'Bo\'lim', 'Asosiy maosh', 'Holati'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.slice(0, 5).map(emp => (
              <tr key={emp.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontWeight: 500 }}>{emp.name}</td>
                <td style={{ padding: '12px', color: '#475569' }}>{emp.position}</td>
                <td style={{ padding: '12px', color: '#475569' }}>{emp.department}</td>
                <td style={{ padding: '12px' }}>{fmt(emp.baseSalary)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    background: emp.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: emp.status === 'active' ? '#16a34a' : '#dc2626',
                    padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                  }}>
                    {emp.status === 'active' ? 'Faol' : 'Faol emas'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
