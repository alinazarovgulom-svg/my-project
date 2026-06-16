import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ArrowLeftRight, CreditCard, RefreshCw, BarChart2, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Bosh' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Operatsiya' },
  { to: '/debts', icon: CreditCard, label: 'Qarz' },
  { to: '/exchange', icon: RefreshCw, label: 'Valyuta' },
  { to: '/reports', icon: BarChart2, label: 'Hisobot' },
  { to: '/settings', icon: Settings, label: 'Sozlama' },
];

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-50 safe-bottom">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 pt-3 transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs mt-0.5 font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
