// src/components/Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Boxes, Settings as SettingsIcon, BarChart2, List } from 'lucide-react';

function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  const links = [
    { path: '/', label: 'Dashboard', icon: BarChart2 },
    { path: '/containers', label: 'Containers', icon: Boxes },
    { path: '/logs', label: 'Logs', icon: List },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Boxes className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-800">Reverse Proxy</span>
          </div>
          <div className="hidden md:flex space-x-8">
            {links.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive(path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
