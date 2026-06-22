import React from 'react';
import { useApp } from '../context/AppContext';

const NAV = [
  { key: 'dashboard', icon: '📊', label: 'Bosh sahifa' },
  { key: 'employees', icon: '👥', label: 'Xodimlar' },
  { key: 'attendance', icon: '📅', label: 'Davomad' },
  { key: 'payroll', icon: '💰', label: 'Maosh hisoblash' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { connected } = useApp();

  return (
    <aside style={{
      width: 220, background: '#1e293b', color: '#fff',
      display: 'flex', flexDirection: 'column', minHeight: '100vh'
    }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #334155' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>💼 Maosh Tizimi</h2>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {connected ? 'Ulangan' : 'Ulanilmadi'}
          </span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              width: '100%', padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 10,
              background: activePage === item.key ? '#0f172a' : 'transparent',
              border: 'none', color: activePage === item.key ? '#38bdf8' : '#cbd5e1',
              cursor: 'pointer', fontSize: 14, textAlign: 'left',
              borderLeft: activePage === item.key ? '3px solid #38bdf8' : '3px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
