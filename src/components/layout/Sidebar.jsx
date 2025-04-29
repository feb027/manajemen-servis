import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';
import { FiGrid, FiTool, FiUsers, FiArchive, FiSettings, FiLogOut, FiChevronDown, FiChevronUp, FiUser, FiMonitor, FiBell } from 'react-icons/fi';

function Sidebar({ isOpen }) {
  const { user, logout } = useAuth();
  const [baruCount, setBaruCount] = useState(0);

  // --- Persistent Submenu State ---
  const LOCAL_STORAGE_KEY = 'sidebarOpenSubmenus';

  const getInitialSubmenuState = () => {
    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error("Error reading submenu state from localStorage:", error);
      return {};
    }
  };

  const [openSubmenus, setOpenSubmenus] = useState(getInitialSubmenuState);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(openSubmenus));
    } catch (error) {
      console.error("Error saving submenu state to localStorage:", error);
    }
  }, [openSubmenus]);

  // --- Fetch and Subscribe to Baru Count ---
  const fetchBaruCount = useCallback(async () => {
    // Fetch only the count for efficiency
    const { count, error } = await supabase
      .from('service_orders')
      .select('id', { count: 'exact', head: true }) // head:true makes it even lighter
      .eq('status', 'Baru');

    if (error) {
      console.error("Error fetching 'Baru' count:", error);
      // Optionally handle error state
    } else {
      setBaruCount(count || 0);
    }
  }, []);

  useEffect(() => {
    // Fetch initial count
    fetchBaruCount();

    // Set up subscription
    const channel = supabase
      .channel('sidebar-baru-count-subscription')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen to all events for simplicity 
          schema: 'public', 
          table: 'service_orders', 
          // Optional: Add filter if Supabase supports it well for count updates
          // filter: 'status=eq.Baru' // Check Supabase docs if filter works reliably for count changes
        },
        (payload) => {
          console.log('Sidebar change detected, refetching Baru count:', payload);
          // Refetch count on any relevant table change
          fetchBaruCount(); 
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBaruCount]);
  // --- End Persistent Submenu State ---

  const toggleSubmenu = (path) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const defaultPath = user?.role === 'technician' ? '/technician' : '/receptionist';

  const baseLinkClass = "flex items-center justify-between space-x-3 w-full text-left py-2.5 rounded-lg transition-all duration-200 ease group relative";
  const activeLinkClass = "bg-[#0c8acb] border-[#0c8acb] text-white shadow-md scale-[1.02] border-l-4 px-3 font-semibold";
  const inactiveLinkClass = "text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-4 group-hover:scale-[1.02]";

  const parentActiveLinkClass = "bg-sky-100 text-[#0ea5e9] border-l-4 border-[#0ea5e9] px-3 font-medium";

  const baseSubmenuLinkClass = "flex items-center space-x-3 pl-11 pr-4 py-2 text-sm rounded-lg transition-all duration-200 ease group relative";
  const activeSubmenuLinkClass = "bg-sky-100 text-[#0c8acb] font-semibold";
  const inactiveSubmenuLinkClass = "text-gray-500 hover:bg-gray-100 hover:text-gray-700";

  const menuItems = [
    { path: '/receptionist', label: 'Dashboard', icon: FiGrid, roles: ['receptionist', 'admin'] },
    { path: '/technician', label: 'Tugas Servis', icon: FiTool, roles: ['technician', 'admin'] },
    { path: '/inventory', label: 'Inventaris', icon: FiArchive, roles: ['receptionist', 'technician', 'admin'] },
    { path: '/customers', label: 'Pelanggan', icon: FiUsers, roles: ['receptionist', 'admin'] },
    {
      path: '/settings',
      label: 'Settings',
      icon: FiSettings,
      roles: ['admin', 'receptionist', 'technician']
    },
    { path: '/admin', label: 'Admin', icon: FiBell, roles: ['admin'] }
  ];

  const accessibleMenuItems = menuItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  const isSubmenuActive = (children) => {
    return children?.some(child => window.location.pathname.startsWith(child.path));
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-72 bg-white flex flex-col border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="px-6 py-5 border-b border-gray-200">
        <NavLink to={defaultPath} className="block group transition-opacity duration-200 hover:opacity-80" title="Go to Dashboard">
          <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#0ea5e9]/10 rounded-lg border border-[#0ea5e9]/20">
                  <FiTool className="h-6 w-6 text-[#0ea5e9]" title="Manajemen Servis" />
              </div>
              <h1 className="text-lg font-semibold text-gray-800 tracking-tight">Manajemen Servis</h1>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        <ul className="space-y-1">
           {accessibleMenuItems.map((item) => {
              const isSubOpen = !!openSubmenus[item.path];
              const isParentActive = item.children && isSubmenuActive(item.children);

              return (
              <li key={item.path}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.path)}
                      className={`${baseLinkClass} ${isParentActive ? parentActiveLinkClass : inactiveLinkClass}`}
                      title={item.label}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon
                          className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ease-in-out ${isParentActive ? 'text-[#0ea5e9]' : 'text-gray-400 group-hover:text-gray-600'}`}
                          aria-hidden="true"
                          title={item.label}
                        />
                        <span
                          className={`text-sm font-medium transition-colors duration-200 ease-in-out ${isParentActive ? 'text-[#0ea5e9]' : 'text-gray-700 group-hover:text-gray-900'}`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {item.path === '/technician' && baruCount > 0 && (
                          <span className="mr-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            {baruCount}
                          </span>
                        )}
                        {isSubOpen ? (
                          <FiChevronUp className={`h-4 w-4 transition-colors duration-200 ease-in-out ${isParentActive ? 'text-[#0ea5e9]' : 'text-gray-400'}`} />
                        ) : (
                          <FiChevronDown className={`h-4 w-4 transition-colors duration-200 ease-in-out ${isParentActive ? 'text-[#0ea5e9]' : 'text-gray-400'}`} />
                        )}
                      </div>
                    </button>
                    <ul
                      className={`mt-1 grid transition-[grid-template-rows] duration-200 ease ${isSubOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    >
                      <div className="overflow-hidden">
                        {item.children.filter(subItem => user?.role && subItem.roles.includes(user.role)).map(subItem => (
                          <li key={subItem.path} className="space-y-1">
                            <NavLink
                              to={subItem.path}
                              className={({ isActive }) =>
                                `${baseSubmenuLinkClass} ${isActive ? activeSubmenuLinkClass : inactiveSubmenuLinkClass}`
                              }
                              title={subItem.label}
                              end
                            >
                              {({ isActive }) => (
                                <>
                                  <subItem.icon
                                    className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ease-in-out ${isActive ? 'text-[#0c8acb]' : 'text-gray-400 group-hover:text-gray-500'}`}
                                    aria-hidden="true"
                                    title={subItem.label}
                                  />
                                  <span className="truncate">
                                    {subItem.label}
                                  </span>
                                  {subItem.path === '/technician' && baruCount > 0 && (
                                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                      {baruCount}
                                    </span>
                                  )}
                                </> 
                              )}
                            </NavLink>
                          </li>
                        ))}
                      </div>
                    </ul>
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                    }
                    title={item.label}
                    end
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center space-x-3">
                            <item.icon
                              className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ease-in-out ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}
                              aria-hidden="true"
                              title={item.label}
                            />
                            <span
                               className={`text-sm font-medium transition-colors duration-200 ease-in-out ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}`}
                            >
                              {item.label}
                            </span>
                        </div>
                        {item.path === '/technician' && baruCount > 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            {baruCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )}
              </li>
             )}
           )}
        </ul>
      </nav>

      <div className="px-6 py-4 mt-auto border-t border-gray-200 bg-gray-50">
        {user && (
          <div className="flex flex-col space-y-3">
            <div className="text-sm text-gray-500 truncate" title={user.email}>
              Logged in as: <span className="font-medium text-gray-700">{user.email}</span>
            </div>
            <button
              onClick={async () => {
                try {
                  await logout();
                  console.log("Logout successful (local function finished)");
                  // Navigation should be handled by Auth state change & ProtectedRoute
                } catch (error) {
                  console.error("Error during logout attempt:", error);
                  // Consider displaying a user-friendly error message here
                }
              }}
              className="flex items-center justify-center space-x-2 w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ease group"
            >
              <FiLogOut className="h-4 w-4 text-red-500 group-hover:text-red-700 pointer-events-none" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar; 