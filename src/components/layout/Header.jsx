import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    FiUser, FiMenu, FiArrowLeft, FiLogOut, FiSettings, FiBell,
    FiCheckSquare, FiInbox, FiLoader, FiTrash2,
    FiPackage, FiClipboard, FiAlertCircle // Added specific icons for types
} from 'react-icons/fi';
import { supabase } from '../../supabase/supabaseClient';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../ConfirmModal'; // Import ConfirmModal

// Helper function to get page title from pathname
const getPageTitle = (pathname) => {
  // Handle potential trailing slashes
  const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  switch (cleanPath) {
    case '/receptionist':
      return 'Dashboard';
    case '/technician':
      return 'Tugas Servis';
    case '/inventory':
      return 'Inventaris';
    case '/settings':
      return 'Settings';
    case '/settings/profile':
      return 'Profile Settings';
    case '/settings/appearance':
      return 'Appearance Settings';
    // Add more cases as needed for other routes
    default: {
      // Attempt to capitalize the last part of the path as a fallback
      const parts = cleanPath.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      return lastPart ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1) : 'Page'; // Default fallback
    }
  }
};

const MAX_NOTIFICATIONS_IN_DROPDOWN = 10; // Define max items in dropdown state

// Helper to get icon based on notification type
const getNotificationIcon = (type) => {
    switch (type) {
        case 'low_stock':
            return <FiPackage className="h-5 w-5 text-orange-500" />;
        case 'new_order':
            return <FiClipboard className="h-5 w-5 text-blue-500" />;
        case 'status_update':
            return <FiCheckSquare className="h-5 w-5 text-green-500" />;
        default:
            return <FiAlertCircle className="h-5 w-5 text-gray-400" />; // Default icon
  }
};

function Header({ toggleSidebar, isSidebarOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  // --- User Menu State ---
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // --- Notification State ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const notificationDropdownRef = useRef(null);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearingRead, setIsClearingRead] = useState(false);
  const [isMarkingDropdownRead, setIsMarkingDropdownRead] = useState(false); // State for marking dropdown items
  // --- State for Clear Confirmation Modal ---
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation to login page is handled by ProtectedRoute via auth state change
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show an error toast/message
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Fetch Notifications --- 
  const fetchNotifications = async () => {
    if (!user) return; // Don't fetch if user is not logged in
    setLoadingNotifications(true);
    try {
      // Fetch latest 10 notifications and total unread count in parallel
      const [notifResponse, countResponse] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, title, message, created_at, is_read, link_to, type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_NOTIFICATIONS_IN_DROPDOWN),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true }) // Only count
          .eq('user_id', user.id)
          .eq('is_read', false)
      ]);

      if (notifResponse.error) throw notifResponse.error;
      if (countResponse.error) throw countResponse.error;

      setNotifications(notifResponse.data || []);
      setUnreadCount(countResponse.count || 0);

    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Maybe show a toast? Don't block the header.
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user) {
        fetchNotifications();
    } else {
        // Clear notifications if user logs out
        setNotifications([]);
        setUnreadCount(0);
        setLoadingNotifications(false);
    }
  }, [user]); // Re-fetch if user changes

  // --- Realtime Notification Subscription --- 
  useEffect(() => {
    if (!user) return; // Need user to subscribe

    // Define the callback function for handling new notifications
    const handleNewNotification = (payload) => {
      console.log('New notification received:', payload.new);
      const newNotification = payload.new;

      // Increment unread count
      setUnreadCount(prevCount => prevCount + 1);

      // Add to the beginning of the notifications list and limit size
      setNotifications(prevNotifications => {
        const updatedNotifications = [newNotification, ...prevNotifications];
        // Keep only the most recent X notifications in the state for the dropdown
        if (updatedNotifications.length > MAX_NOTIFICATIONS_IN_DROPDOWN) {
          return updatedNotifications.slice(0, MAX_NOTIFICATIONS_IN_DROPDOWN);
        }
        return updatedNotifications;
      });

      // Optional: Add a visual cue like a subtle animation/flash on the bell icon
    };

    // Subscribe to INSERT events on the notifications table for the current user
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}` // Ensure we only get notifications for this user
        },
        handleNewNotification // Call the handler when a new notification arrives
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
            console.log('Realtime channel subscribed for notifications for user:', user.id);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Realtime subscription error:', status, err);
            // Optionally try to resubscribe or notify the user
        }
      });

    // Cleanup function to remove the subscription when the component unmounts or user changes
    return () => {
      console.log('Unsubscribing from notification channel for user:', user.id);
      supabase.removeChannel(channel);
    };

  }, [user]); // Re-run this effect if the user changes

  // --- Mark Notifications as Read ---
  const markNotificationsInDropdownAsRead = async () => {
    if (!user || unreadCount === 0 || isMarkingDropdownRead) return; // Prevent concurrent runs
    setIsMarkingDropdownRead(true); // Start loading state

    const idsToMark = notifications.filter(n => !n.is_read).map(n => n.id);
    if (idsToMark.length === 0) {
        setIsMarkingDropdownRead(false); // Stop loading if nothing to mark
        return;
    }

    console.log("Marking dropdown notifications as read:", idsToMark);
    const previousNotifications = [...notifications];
    setNotifications(prev => prev.map(n => idsToMark.includes(n.id) ? { ...n, is_read: true } : n));

    let newUnreadCount = unreadCount; // Keep track for potential revert
    try {
        // Fetch the *actual* new unread count after marking these as read
        const { count, error: countError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (countError) {
          console.error("Error fetching new unread count:", countError);
          // Don't revert list here, just keep old count if fetch fails
        } else {
          newUnreadCount = count || 0;
          setUnreadCount(newUnreadCount);
        }

        // Now update the database
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date() })
          .eq('user_id', user.id)
          .in('id', idsToMark);

        if (error) {
          // Revert UI if DB update fails
          setNotifications(previousNotifications);
          setUnreadCount(newUnreadCount); // Keep the potentially updated (or old) count
          throw error;
        }
        // Success, UI already updated

    } catch (error) {
      console.error("Error marking notifications as read:", error);
      // Maybe revert UI fully if needed, but count might be inconsistent
      // setNotifications(previousNotifications);
      // setUnreadCount(previousNotifications.filter(n => !n.is_read).length); // Recalculate fully?
    } finally {
        setIsMarkingDropdownRead(false); // Stop loading state
    }
  };

  // --- Mark ALL Notifications as Read ---
  const handleMarkAllAsRead = async () => {
      if (!user || unreadCount === 0 || isMarkingAllRead) return;
      setIsMarkingAllRead(true);

      console.log("Marking ALL notifications as read for user:", user.id);
      // Optimistic UI update
      const previousNotifications = [...notifications];
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); // Mark all in current list as read

      try {
          const { error } = await supabase
              .from('notifications')
              .update({ is_read: true, read_at: new Date() })
              .eq('user_id', user.id)
              .eq('is_read', false); // Target only currently unread ones

          if (error) {
              // Revert optimistic UI on error
              setNotifications(previousNotifications);
              // Re-fetch count might be safest here if the update failed partially
              fetchNotifications();
              throw error;
          }
          // Success, UI updated optimistically
          toast.success("Semua notifikasi ditandai terbaca."); // Add toast feedback

      } catch (error) {
          console.error("Error marking all notifications as read:", error);
          toast.error("Gagal menandai semua notifikasi terbaca.");
      } finally {
          setIsMarkingAllRead(false);
      }
  };

  // --- Initiate Clear All READ Notifications ---
  const handleClearAllReadNotifications = () => {
      if (!user || isClearingRead) return;
      const hasReadNotifications = notifications.some(n => n.is_read);
      if (!hasReadNotifications) {
          toast.info("Tidak ada notifikasi yang sudah dibaca untuk dihapus.");
          return;
      }
      // Open the confirmation modal instead of directly deleting
      setIsClearConfirmOpen(true);
  };

  // --- Execute Clear All READ Notifications (Called by Modal) ---
  const executeClearReadNotifications = async () => {
      if (!user || isClearingRead) return;
      setIsClearingRead(true);
      console.log("Executing clear all read notifications for user:", user.id);
      try {
          const { error } = await supabase
              .from('notifications')
              .delete()
              .match({ user_id: user.id, is_read: true });

          if (error) throw error;

          toast.success("Notifikasi yang sudah dibaca berhasil dihapus.");
          closeClearConfirmModal(); // Close modal first
          fetchNotifications(); // Refresh the list
          setIsNotificationDropdownOpen(false); // Close dropdown too

      } catch (error) {
          console.error("Error clearing read notifications:", error);
          toast.error("Gagal menghapus notifikasi yang sudah dibaca.");
      } finally {
          setIsClearingRead(false);
      }
  };

  // --- Close Confirmation Modal ---
  const closeClearConfirmModal = () => {
      if (isClearingRead) return; // Prevent closing while processing
      setIsClearConfirmOpen(false);
  };

  // --- Toggle Notification Dropdown ---
  const handleToggleNotificationDropdown = () => {
    const nextState = !isNotificationDropdownOpen;
    setIsNotificationDropdownOpen(nextState);
    // Mark VISIBLE unread notifications as read when dropdown is opened
    if (nextState && unreadCount > 0) {
      markNotificationsInDropdownAsRead();
    }
  };

  return (
    <>
    <header className="bg-white shadow-sm px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0ea5e9] transition-colors"
            aria-label={isSidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          >
            {isSidebarOpen ? <FiArrowLeft className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-700">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={handleToggleNotificationDropdown}
                className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0ea5e9] transition-colors"
                aria-label="Lihat Notifikasi"
                aria-expanded={isNotificationDropdownOpen}
                aria-haspopup="true"
              >
                {unreadCount > 0 && (
                  <span
                    className={`absolute top-1 right-1 flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-bold text-white bg-red-500 ring-1 ring-white ${unreadCount > 9 ? 'px-0.5' : ''} animate-pulse`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
            <FiBell className="h-6 w-6" />
          </button>

              <div
                className={`absolute right-0 mt-2 w-80 sm:w-96 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-40 flex flex-col transition ease-out duration-100 ${isNotificationDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                 <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-800">Notifikasi</h3>
                    <div className="flex items-center space-x-2">
                        {notifications.some(n => n.is_read) && (
                            <button
                                onClick={handleClearAllReadNotifications}
                                disabled={isClearingRead || isMarkingDropdownRead || isMarkingAllRead}
                                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium p-1 hover:bg-red-50 rounded"
                                title="Hapus semua notifikasi yang sudah dibaca"
                            >
                               <FiTrash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                disabled={isMarkingAllRead || isClearingRead || isMarkingDropdownRead}
                                className="text-xs text-sky-600 hover:text-sky-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium p-1 hover:bg-sky-50 rounded"
                                title="Tandai semua sudah dibaca"
                            >
                               {isMarkingAllRead ? (
                                   <FiLoader className="h-3.5 w-3.5 animate-spin mr-1" />
                               ) : (
                                   <FiCheckSquare className="h-3.5 w-3.5 mr-1" />
                               )}
                            </button>
                        )}
                    </div>
                 </div>
                 <div className="flex-grow overflow-y-auto max-h-80">
                      {loadingNotifications && notifications.length === 0 ? (
                          <div className="px-4 py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                              <FiLoader className="h-6 w-6 animate-spin mb-2" />
                              Memuat Notifikasi...
                          </div>
                      ) : notifications.length === 0 ? (
                          <div className="px-4 py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                              <FiInbox className="h-10 w-10 mb-2 text-gray-300" />
                              Tidak ada notifikasi.
                          </div>
                      ) : (
                          <ul className="divide-y divide-gray-100">
                              {notifications.map((notif) => (
                                <li key={notif.id}>
                                    <Link
                                      to={notif.link_to || '#'}
                                      onClick={() => setIsNotificationDropdownOpen(false)}
                                      className={`flex items-start px-4 py-3 text-sm group transition-colors duration-75 hover:bg-gray-50 ${!notif.is_read ? 'bg-sky-50/60 hover:bg-sky-100/70' : ''}`}
                                    >
                                       <div className="flex-shrink-0 mr-3 mt-0.5">
                                           {getNotificationIcon(notif.type)}
                                       </div>
                                       <div className="flex-grow">
                                          <p className={`font-medium ${!notif.is_read ? 'text-gray-900 font-semibold' : 'text-gray-600'} truncate`}>
                                            {notif.title || notif.type || 'Notifikasi'}
                                          </p>
                                          <p className={`text-xs ${!notif.is_read ? 'text-gray-700' : 'text-gray-500'} mt-0.5 line-clamp-2`}>{notif.message}</p>
                                          <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                                            {new Date(notif.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                          </p>
                                      </div>
                                      {!notif.is_read && (
                                           <span className="flex-shrink-0 ml-2 mt-0.5 h-2 w-2 bg-sky-500 rounded-full"></span>
                                       )}
                                    </Link>
                                </li>
                              ))}
                          </ul>
                      )}
                 </div>
              </div>
            </div>

          <div className="relative" ref={userMenuRef}>
            {user && (
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 text-sm text-gray-600 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9] transition-colors duration-150"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                 <FiUser className="h-5 w-5 text-gray-500 pointer-events-none" />
                 <span className="font-medium pointer-events-none">{user.full_name || user.email}</span>
              </button>
            )}

            <div
              className={`absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-40 py-2 transition ease-out duration-100 ${isUserMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              {user && (
                <>
                  <Link
                    to="/settings/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 group transition-colors duration-75"
                  >
                    <FiSettings className="w-4 h-4 mr-3 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                    Profile
                  </Link>
                  <div className="border-t border-gray-100 mx-2 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 group transition-colors duration-75"
                  >
                    <FiLogOut className="w-4 h-4 mr-3 text-red-400 group-hover:text-red-500 pointer-events-none" aria-hidden="true" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* Confirmation Modal Rendered Outside Header Flow */}
      {isClearConfirmOpen && (
          <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 transition-opacity duration-300 ease-in-out"
              // Backdrop element
              onClick={closeClearConfirmModal} // Close on backdrop click
              aria-labelledby="confirm-modal-title"
              role="dialog"
              aria-modal="true"
          >
            <ConfirmModal
              // Add stopPropagation to the modal content itself
              wrapperProps={{ onClick: (e) => e.stopPropagation() }}
              isOpen={isClearConfirmOpen} // Pass isOpen for potential internal transitions if ConfirmModal supports it
              onClose={closeClearConfirmModal}
              onConfirm={executeClearReadNotifications}
              title="Hapus Notifikasi Dibaca?"
              message="Apakah Anda yakin ingin menghapus semua notifikasi yang sudah dibaca? Tindakan ini tidak dapat dibatalkan."
              confirmText="Ya, Hapus"
              cancelText="Batal"
              isDestructive={true}
              isConfirming={isClearingRead}
            />
          </div>
      )}
    </>
  );
}

export default Header; 