import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FiUser, FiMonitor } from 'react-icons/fi';

function SettingsPage() {
  const location = useLocation();

  // Define tabs
  const settingTabs = [
    { path: '/settings/profile', label: 'Profil', icon: FiUser },
    { path: '/settings/appearance', label: 'Tampilan', icon: FiMonitor },
    // Add more tabs here later if needed
  ];

  // Determine the base path for NavLink active state
  const isSettingsBase = location.pathname === '/settings';

  const baseTabClass = "flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out";
  const activeTabClass = "bg-sky-100 text-sky-700";
  const inactiveTabClass = "text-gray-500 hover:text-gray-700 hover:bg-gray-100";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Pengaturan</h1>

      <div className="flex border-b border-gray-200">
        {settingTabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            // Special case: Activate 'Profile' tab if on base '/settings' path
            className={({ isActive }) =>
              `${baseTabClass} ${ (isActive || (tab.path === '/settings/profile' && isSettingsBase)) ? activeTabClass : inactiveTabClass}`
            }
            // `end` prop ensures matching only the exact path unless it's the base path case
            end={!isSettingsBase || tab.path !== '/settings/profile'}
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Render the content of the active tab using Outlet */}
      <div className="mt-4">
          <Outlet />
      </div>
    </div>
  );
}

export default SettingsPage;
