// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Import supabase
import ServiceOrderTable from '../components/ServiceOrderTable'; // Import the table component
import { FiDatabase, FiUsers, FiClipboard, FiUserPlus, FiSearch, FiFilter, FiX, FiChevronLeft, FiChevronRight, FiEye, FiCheckSquare, FiEdit, FiTrash2, FiActivity, FiList, FiSliders } from 'react-icons/fi'; // Added Eye, CheckSquare, Edit, Trash2, FiActivity, FiList, FiSliders
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'; // Added sort icons
import Toast from '../components/Toast'; // Import Toast for feedback
import UserTable from '../components/UserTable'; // Import UserTable
import UserFormModal from '../components/UserFormModal'; // Import UserFormModal
import Pagination from '../components/Pagination'; // Corrected import name
// Import Order Modals
import ServiceOrderDetailModal from '../components/ServiceOrderDetailModal';
import UpdateStatusModal from '../components/UpdateStatusModal';
import EditOrderForm from '../components/EditOrderForm';
import ConfirmationModal from '../components/ConfirmationModal'; // Import ConfirmationModal
import { toast } from 'react-hot-toast'; // Ensure toast is imported
import AnalyticsTab from '../components/AnalyticsTab'; // Import the new AnalyticsTab
import ActivityLogTab from '../components/ActivityLogTab'; // Import the new ActivityLogTab
import SystemSettingsTab from '../components/SystemSettingsTab'; // Import the new settings tab

// Helper to get Technician Name (now potentially used)
// const getTechnicianName = (id, technicians) => technicians.find(t => t.id === id)?.full_name || id || 'N/A';

const MODAL_ANIMATION_DURATION = 300; // Define animation duration

// Constants
const ORDER_STATUS_OPTIONS = ['Semua', 'Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'];
const ITEMS_PER_PAGE = 10; // Define items per page

function AdminDashboard() {
  const [allOrders, setAllOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true); // Renamed for clarity
  const [error, setError] = useState(null);
  // Add state for technicians
  const [technicians, setTechnicians] = useState([]); 
  const [loadingTechnicians, setLoadingTechnicians] = useState(true); // Loading state for technicians
  // Add state for Users
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [toastMessage, setToastMessage] = useState(''); // Add toast state

  // State for User Management Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUserModalClosing, setIsUserModalClosing] = useState(false);
  const [isUserModalMounted, setIsUserModalMounted] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  // --- Tab State ---
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'users', 'analytics', 'activityLog', 'settings'

  // --- Orders Tab State ---
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [debouncedOrderSearchTerm, setDebouncedOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('Semua');
  const [orderSortConfig, setOrderSortConfig] = useState({ key: 'created_at', direction: 'descending' }); // Default sort
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);

  // --- Order Action Modals State ---
  const [selectedOrder, setSelectedOrder] = useState(null); // For Detail View
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailModalClosing, setIsDetailModalClosing] = useState(false);
  const [isDetailModalMounted, setIsDetailModalMounted] = useState(false);

  const [orderToUpdateStatus, setOrderToUpdateStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusModalClosing, setIsStatusModalClosing] = useState(false);
  const [isStatusModalMounted, setIsStatusModalMounted] = useState(false);

  const [orderToEdit, setOrderToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalClosing, setIsEditModalClosing] = useState(false);
  const [isEditModalMounted, setIsEditModalMounted] = useState(false);

  // --- Users Tab State ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedUserSearchTerm, setDebouncedUserSearchTerm] = useState('');
  const [userSortConfig, setUserSortConfig] = useState({ key: 'full_name', direction: 'ascending' }); // Add user sort state

  // State for Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchAllOrders = async () => {
    setLoadingOrders(true); // Use specific loading state
    // setError(null); // Error is handled globally below
    try {
      const { data, error: fetchError } = await supabase
        .from('service_orders')
        .select('*') // Select all columns
        .order('created_at', { ascending: false }); // Show newest first

      if (fetchError) throw fetchError;
      setAllOrders(data || []);
    } catch (err) {
      console.error("Error fetching all service orders:", err);
      setError((prev) => prev ? `${prev}; ${err.message}` : `Gagal memuat data order: ${err.message}`); // Set global error
      setAllOrders([]);
    } finally {
      setLoadingOrders(false); // Use specific loading state
    }
  };

  // Fetch technicians to display names
  const fetchTechnicians = async () => {
    setLoadingTechnicians(true); 
    try {
      // Select only id and full_name for efficiency
      const { data, error: techError } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('role', 'technician')
            .order('full_name');
      
      if (techError) throw techError;
      setTechnicians(data || []);
    } catch (err) {
      console.error("Error fetching technicians:", err);
      // Optionally set a specific error for technicians if needed
      setError((prev) => prev ? `${prev}; ${err.message}` : `Gagal memuat data teknisi: ${err.message}`);
      setTechnicians([]);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  // Fetch all users for management
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
        const { data, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email, role') // Fetch necessary fields
            .order('created_at', { ascending: false });

        if (userError) throw userError;
        setAllUsers(data || []);
    } catch (err) {
        console.error("Error fetching users:", err);
        setError((prev) => prev ? `${prev}; ${err.message}` : `Gagal memuat data pengguna: ${err.message}`);
        setAllUsers([]);
    } finally {
        setLoadingUsers(false);
    }
  };

  useEffect(() => {
    // Reset error before fetching
    setError(null); 
    // Fetch all data in parallel
    Promise.all([fetchAllOrders(), fetchTechnicians(), fetchAllUsers()]); 
  }, []);

  // Combine loading states
  const isLoading = loadingOrders || loadingTechnicians || loadingUsers;

  // Placeholder handlers if actions were needed
  // const handleRowClick = (order) => console.log("Admin clicked:", order);
  // const handleAssign = (order) => console.log("Admin assign:", order);
  // const handleUpdateStatus = (order) => console.log("Admin update:", order);
  // const handleEdit = (order) => console.log("Admin edit:", order);

  // --- User Modal Logic ---
  const openUserModal = (user = null) => {
    setUserToEdit(user); // Set null for add, user object for edit
    setIsUserModalOpen(true);
    setIsUserModalMounted(false); // Reset mount state
  };

  const triggerCloseUserModal = () => {
    setIsUserModalClosing(true);
  };

  useEffect(() => {
    if (isUserModalClosing) {
      const timer = setTimeout(() => {
        setIsUserModalOpen(false);
        setIsUserModalClosing(false);
        setUserToEdit(null); // Clear user data when modal fully closes
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isUserModalClosing]);

  useEffect(() => {
    if (isUserModalOpen && !isUserModalClosing) {
      const timer = setTimeout(() => setIsUserModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
    if (!isUserModalOpen && !isUserModalClosing) {
      setIsUserModalMounted(false);
    }
  }, [isUserModalOpen, isUserModalClosing]);
  // --- End User Modal Logic ---

  // --- User CRUD Handlers ---
  const handleAddUserClick = () => {
      openUserModal(null); // Open modal in add mode
  };

  const handleEditUserClick = (user) => {
      openUserModal(user); // CORRECTED: Was openUserClick
  };

  // This function is passed as `onSave` to the modal
  const handleConfirmUserForm = async (formData, userId) => {
      const isEditMode = Boolean(userId);
      // We no longer need operationError here, the function handles its own errors

      try {
          if (isEditMode) {
              // --- UPDATE User ---
              // Update logic remains the same (client-side update to 'users' table is okay for edits)
              console.log("Updating user:", userId, formData);
              const { error } = await supabase
                  .from('users')
                  .update({
                      full_name: formData.full_name,
                      role: formData.role,
                      updated_at: new Date()
                  })
                  .eq('id', userId);

              if (error) throw error; // Throw error to be caught below

              setToastMessage("Pengguna berhasil diperbarui.");

          } else {
              // --- ADD User via Edge Function ---
              console.log("Invoking create-user Edge Function with:", formData);

              // IMPORTANT: We are passing the password here. Ensure your connection is HTTPS.
              const { data, error: functionError } = await supabase.functions.invoke('create-user', {
                  body: {
                      email: formData.email,
                      password: formData.password, // Pass the password
                      full_name: formData.full_name,
                      role: formData.role,
                  },
              });

              if (functionError) {
                 // Handle potential errors from the function invocation itself (e.g., network error, function crashed)
                 console.error("Edge Function invocation error:", functionError);
                 // Try to parse the error message from the function's response if available
                 let detail = functionError.context?.details || functionError.message;
                 if (functionError.context?.responseBody) {
                    try {
                       detail = JSON.parse(functionError.context.responseBody).error || detail;
                    // eslint-disable-next-line no-unused-vars, no-empty
                    } catch (_) {} // Ignore parsing errors, explicitly disabling lint rules for unused var and empty block
                 }
                 throw new Error(`Gagal memanggil fungsi: ${detail}`);
              }

              // The function itself might return an error object even if invocation succeeded
              // Check the response 'data' which would contain our JSON response { error: ... } or { message: ... }
              if (data?.error) {
                 console.error("Edge Function returned error:", data.error);
                 throw new Error(data.error); // Throw the error message from the function
              }

              console.log("Edge Function success response:", data);
              setToastMessage(data?.message || "Pengguna baru berhasil ditambahkan via Edge Function.");
          }

          // Shared success logic (runs after successful add or edit)
          triggerCloseUserModal();
          fetchAllUsers();
          if (formData.role === 'technician' || technicians.some(t => t.id === userId)) {
              fetchTechnicians();
          }

      } catch (err) {
          console.error("Error during user save operation:", err);
          // Set toast based on caught error
          setToastMessage(`Gagal menyimpan pengguna: ${err.message}`);
          // Re-throw so the modal's catch block can potentially display it in the form
          throw err;
      }
  };

  // Debounce Order Search Term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedOrderSearchTerm(orderSearchTerm);
    }, 300); // 300ms delay
    return () => clearTimeout(timerId);
  }, [orderSearchTerm]);

  // Debounce User Search Term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedUserSearchTerm(userSearchTerm);
    }, 300);
    return () => clearTimeout(timerId);
  }, [userSearchTerm]);

  // --- Processed Orders (Filter + Sort) --- 
  const processedOrders = useMemo(() => {
    let items = [...allOrders];

    // Apply Status Filter
    if (orderStatusFilter !== 'Semua') {
        items = items.filter(order => (order.status || 'Baru') === orderStatusFilter);
    }

    // Apply Search Filter
    if (debouncedOrderSearchTerm) {
        const lowerSearch = debouncedOrderSearchTerm.toLowerCase();
        items = items.filter(order => 
            (order.customer_name?.toLowerCase().includes(lowerSearch)) ||
            (order.device_type?.toLowerCase().includes(lowerSearch)) ||
            (order.brand_model?.toLowerCase().includes(lowerSearch)) ||
            (String(order.id)?.toLowerCase().includes(lowerSearch)) || 
            (order.customer_contact?.toLowerCase().includes(lowerSearch)) 
            // Add technician name search? Requires joining or mapping technician names
        );
    }
    
    // Apply Sorting
    if (orderSortConfig.key) {
      items.sort((a, b) => {
        let aValue = a[orderSortConfig.key];
        let bValue = b[orderSortConfig.key];

        // Handle potential nulls, especially for status
        if (orderSortConfig.key === 'status') {
             aValue = aValue || 'Baru';
             bValue = bValue || 'Baru';
         }
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Handle date sorting
        if (['created_at', 'updated_at'].includes(orderSortConfig.key)) {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }

        if (aValue < bValue) return orderSortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return orderSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return items;

  }, [allOrders, orderStatusFilter, debouncedOrderSearchTerm, orderSortConfig]); // Added sortConfig dependency

  // --- Pagination Calculation for Orders ---
  const totalOrderResults = processedOrders.length;
  const totalOrderPages = Math.ceil(totalOrderResults / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (orderCurrentPage - 1) * ITEMS_PER_PAGE;
    return processedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedOrders, orderCurrentPage]);

  // --- Reset page number --- 
  useEffect(() => {
    setOrderCurrentPage(1);
  }, [debouncedOrderSearchTerm, orderStatusFilter, orderSortConfig]); // Reset on filter or sort change

  // --- Handlers for Order Tab ---
  const handleOrderSearchChange = (e) => {
    setOrderSearchTerm(e.target.value);
  };

  const handleOrderStatusFilterChange = (e) => {
    setOrderStatusFilter(e.target.value);
  };

  const requestOrderSort = (key) => {
    let direction = 'ascending';
    if (orderSortConfig.key === key && orderSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setOrderSortConfig({ key, direction });
    // Resetting page is handled by the useEffect above
  };

  const handleOrderPageChange = (page) => {
    if (page >= 1 && page <= totalOrderPages) {
        setOrderCurrentPage(page);
    }
  };

  // --- Order Action Modal Logic ---
  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
    setIsDetailModalMounted(false);
  };
  const openStatusModal = (order) => {
    setOrderToUpdateStatus(order);
    setIsStatusModalOpen(true);
    setIsStatusModalMounted(false);
  };
  const openEditModal = (order) => {
    setOrderToEdit(order);
    setIsEditModalOpen(true);
    setIsEditModalMounted(false);
  };

  // Unified Close Trigger for Order Modals
  const triggerCloseOrderModal = () => {
    if (isDetailModalOpen) setIsDetailModalClosing(true);
    if (isStatusModalOpen) setIsStatusModalClosing(true);
    if (isEditModalOpen) setIsEditModalClosing(true);
  };

  // Detail Modal Animation/Close Effects
  useEffect(() => {
    if (isDetailModalClosing) {
      const timer = setTimeout(() => {
        setSelectedOrder(null);
        setIsDetailModalOpen(false);
        setIsDetailModalClosing(false);
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isDetailModalClosing]);
  useEffect(() => {
    if (isDetailModalOpen && !isDetailModalClosing) {
      const timer = setTimeout(() => setIsDetailModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
     if (!isDetailModalOpen && !isDetailModalClosing) setIsDetailModalMounted(false);
  }, [isDetailModalOpen, isDetailModalClosing]);

  // Status Modal Animation/Close Effects
  useEffect(() => {
    if (isStatusModalClosing) {
      const timer = setTimeout(() => {
        setOrderToUpdateStatus(null);
        setIsStatusModalOpen(false);
        setIsStatusModalClosing(false);
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isStatusModalClosing]);
   useEffect(() => {
    if (isStatusModalOpen && !isStatusModalClosing) {
      const timer = setTimeout(() => setIsStatusModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
     if (!isStatusModalOpen && !isStatusModalClosing) setIsStatusModalMounted(false);
  }, [isStatusModalOpen, isStatusModalClosing]);

  // Edit Modal Animation/Close Effects
   useEffect(() => {
    if (isEditModalClosing) {
      const timer = setTimeout(() => {
        setOrderToEdit(null);
        setIsEditModalOpen(false);
        setIsEditModalClosing(false);
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isEditModalClosing]);
  useEffect(() => {
    if (isEditModalOpen && !isEditModalClosing) {
      const timer = setTimeout(() => setIsEditModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
    if (!isEditModalOpen && !isEditModalClosing) setIsEditModalMounted(false);
  }, [isEditModalOpen, isEditModalClosing]);

  // ESC Key Listener for All Modals
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
         if (isUserModalOpen) triggerCloseUserModal();
         if (isDetailModalOpen || isStatusModalOpen || isEditModalOpen) triggerCloseOrderModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isUserModalOpen, isDetailModalOpen, isStatusModalOpen, isEditModalOpen]); // Add dependencies

  // --- Order Action Handlers ---
  const handleViewDetailsClick = (order) => {
      openDetailModal(order);
  };

  const handleUpdateStatusClick = (order) => {
      openStatusModal(order);
  };

  const handleEditClick = (order) => {
      openEditModal(order);
  };

  // Confirm Status Update (Admin version - simpler)
  const handleConfirmStatusUpdate = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    console.log(`Admin updating status for order ${orderId} to ${newStatus}`);
    try {
        const { error } = await supabase
          .from('service_orders')
          .update({ status: newStatus, updated_at: new Date() }) // Also update timestamp
          .eq('id', orderId);
        if (error) throw error;
        setToastMessage('Status order berhasil diperbarui!');
        triggerCloseOrderModal(); // Close the status modal
        // Data should refresh via subscription, but could force fetch if needed: fetchAllOrders(); 
    } catch (err) {
         console.error("Error updating status (Admin):", err);
         setToastMessage(`Gagal update status: ${err.message}`);
         throw err; // Re-throw for modal error handling
    }
  };

  // Handle Edit Form Close (Admin version)
  const handleEditFormClose = (refreshNeeded) => {
      triggerCloseOrderModal(); // Close edit modal
      if (refreshNeeded) {
          setToastMessage('Order berhasil diperbarui!');
          // Data should refresh via subscription, but could force fetch if needed: fetchAllOrders(); 
      }
  }

  // --- Filtering and Sorting Logic for Users ---
  const filteredUsers = useMemo(() => {
      let items = [...allUsers];

      // Search Filter
      if (debouncedUserSearchTerm) {
          const lowerSearch = debouncedUserSearchTerm.toLowerCase();
          items = items.filter(user => 
              (user.full_name?.toLowerCase().includes(lowerSearch)) ||
              (user.email?.toLowerCase().includes(lowerSearch))
          );
      }

      // Sort Filter
      if (userSortConfig.key) {
          items.sort((a, b) => {
              let aValue = a[userSortConfig.key];
              let bValue = b[userSortConfig.key];

              // Handle null/undefined values
              if (aValue === null || aValue === undefined) aValue = '';
              if (bValue === null || bValue === undefined) bValue = '';

              // Case-insensitive string comparison
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                  aValue = aValue.toLowerCase();
                  bValue = bValue.toLowerCase();
              }

              // Comparison logic
              if (aValue < bValue) {
                  return userSortConfig.direction === 'ascending' ? -1 : 1;
              }
              if (aValue > bValue) {
                  return userSortConfig.direction === 'ascending' ? 1 : -1;
              }
              return 0;
          }); // End sort callback
      } // End if (userSortConfig.key)

      return items;
  }, [allUsers, debouncedUserSearchTerm, userSortConfig]); // End useMemo

  // --- Handlers for Users Tab ---
  const handleUserSearchChange = (e) => {
      setUserSearchTerm(e.target.value);
  };

  const requestUserSort = (key) => {
    let direction = 'ascending';
    if (userSortConfig.key === key && userSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setUserSortConfig({ key, direction });
     // Reset user pagination here when implemented
  };

  // Handlers for Confirmation Modal
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setUserToDelete(null);
  };

  // Updated: This now sets state to open the modal
  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setIsConfirmModalOpen(true);
  };

  // Function called when the confirmation modal's confirm button is clicked
  const confirmDeleteUser = async () => {
    // Check if userToDelete exists
    if (!userToDelete) return;

    // Reliably get the user ID and name, whether userToDelete is an object or just the ID string
    const userId = typeof userToDelete === 'object' && userToDelete !== null ? userToDelete.id : userToDelete;
    const userName = typeof userToDelete === 'object' && userToDelete !== null ? userToDelete.full_name : 'pengguna'; // Get name for messages

    // --- MODIFIED DEBUG & VALIDATION ---
    console.log("Attempting to delete user with ID:", userId);
    console.log("User data stored in state:", JSON.stringify(userToDelete, null, 2));

    // Check if we actually got a valid UUID string
    if (!userId || typeof userId !== 'string' || userId.length < 36) { // Basic UUID check
        console.error("INVALID OR MISSING USER ID!", userId, userToDelete);
        toast.error("Gagal menghapus: ID pengguna tidak valid atau hilang.");
        closeConfirmModal();
        return; // Stop execution if ID is invalid
    }
    // -----------------------------------

    // Call the Edge Function to delete the user
    try {
        const { data, error: functionError } = await supabase.functions.invoke('delete-user', {
             body: { userIdToDelete: userId }, // Use the reliably extracted userId
        });

        if (functionError) {
            // Handle potential errors from the function invocation itself
            console.error("Edge Function invocation error:", functionError);
            let detail = functionError.context?.details || functionError.message;
            if (functionError.context?.responseBody) {
                try {
                    detail = JSON.parse(functionError.context.responseBody).error || detail;
                // eslint-disable-next-line no-unused-vars, no-empty
                } catch (_) {} 
            }
            throw new Error(`Gagal memanggil fungsi hapus: ${detail}`);
        }

        // The function itself might return an error object
        if (data?.error) {
            console.error("Delete User Edge Function returned error:", data.error);
            throw new Error(data.error);
        }

        // Success
        toast.success(data?.message || `Pengguna ${userName} berhasil dihapus.`); // Use extracted name
        setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userId)); // Use extracted userId to filter UI state

    } catch (err) {
        console.error("Error during user deletion:", err);
        toast.error(`Gagal menghapus pengguna: ${err.message}`);
        // Don't re-fetch on error, keep the user list as is
    } finally {
         closeConfirmModal(); // Close modal regardless of success/failure
    }
  };

  // --- Helper to get Tab Button Style ---
  const getTabButtonStyle = (tabName) => {
    return `flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
      activeTab === tabName
        ? 'bg-sky-100 text-sky-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      {/* RESTORED Toast Component */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Global Loading/Error States */} 
      {isLoading && <p className="text-center text-gray-500 py-4">Memuat data...</p>}
      {error && <p className="text-center text-red-600 bg-red-50 border border-red-200 p-4 rounded-md my-4">Error: {error}</p>}

      {/* Tab Navigation */} 
      {!isLoading && !error && (
        <div className="mb-6">
          <div className="sm:hidden">
             {/* Mobile dropdown - adjust if needed */}
            <label htmlFor="tabs" className="sr-only">Select a tab</label>
            <select
              id="tabs"
              name="tabs"
              className="block w-full focus:ring-sky-500 focus:border-sky-500 border-gray-300 rounded-md"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              <option value="orders">Manajemen Order</option>
              <option value="users">Manajemen Pengguna</option>
              <option value="analytics">Analitik</option>
              <option value="activityLog">Log Aktivitas</option>
              <option value="settings">Pengaturan</option> { /* Added Settings option */ }
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-3 border-b border-gray-200 pb-2" aria-label="Tabs">
              {/* Orders Tab Button */}
              <button onClick={() => setActiveTab('orders')} className={getTabButtonStyle('orders')}>
                <FiClipboard className="-ml-0.5 mr-2 h-5 w-5" /> Manajemen Order
              </button>
              {/* Users Tab Button */}
              <button onClick={() => setActiveTab('users')} className={getTabButtonStyle('users')}>
                 <FiUsers className="-ml-0.5 mr-2 h-5 w-5" /> Manajemen Pengguna
              </button>
               {/* Analytics Tab Button */}
              <button onClick={() => setActiveTab('analytics')} className={getTabButtonStyle('analytics')}>
                 <FiDatabase className="-ml-0.5 mr-2 h-5 w-5" /> Analitik
              </button>
              {/* Activity Log Tab Button */}
              <button onClick={() => setActiveTab('activityLog')} className={getTabButtonStyle('activityLog')}>
                 <FiActivity className="-ml-0.5 mr-2 h-5 w-5" /> Log Aktivitas
              </button>
              {/* Settings Tab Button - Added */}
              <button onClick={() => setActiveTab('settings')} className={getTabButtonStyle('settings')}>
                 <FiSliders className="-ml-0.5 mr-2 h-5 w-5" /> Pengaturan
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content - Conditionally Rendered */} 
      {!isLoading && !error && (
        <div className="mt-4">
          {activeTab === 'orders' && (
            <Fragment>
               {/* --- Orders Tab Content RESTORED --- */}
               <div className="flex flex-col sm:flex-row gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex-grow sm:max-w-xs">
                     <label htmlFor="orderSearch" className="sr-only">Cari Order</label>
                     <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                             <FiSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
                         </div>
                         <input
                             type="text"
                             name="orderSearch"
                             id="orderSearch"
                             className="focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2"
                             placeholder="Cari Order (ID, Nama, Perangkat...)"
                             value={orderSearchTerm}
                             onChange={handleOrderSearchChange}
                         />
                         {orderSearchTerm && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-10">
                                <button type="button" onClick={() => setOrderSearchTerm('')} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-500 rounded-full p-0.5" aria-label="Clear search">
                                    <FiX className="h-5 w-5" />
                                </button>
                            </div>
                         )}
                     </div>
                  </div>
                  <div className="flex-shrink-0">
                     <label htmlFor="orderStatusFilter" className="sr-only">Filter Status</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiFilter className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                         <select
                             id="orderStatusFilter"
                             name="orderStatusFilter"
                             value={orderStatusFilter}
                             onChange={handleOrderStatusFilterChange}
                             className="block w-full appearance-none pl-10 pr-8 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
                         >
                             {ORDER_STATUS_OPTIONS.map(status => (
                                 <option key={status} value={status}>{status}</option>
                             ))}
                         </select>
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                     </div>
                  </div>
               </div>

               <h2 className="text-xl font-semibold text-gray-800 mb-4">Daftar Lengkap Order Servis</h2>
               <ServiceOrderTable
                   orders={paginatedOrders} // Use paginated orders
                   technicians={technicians} 
                   isLoading={isLoading} // Use global loading, or loadingOrders if preferred
                   sortConfig={orderSortConfig}
                   requestSort={requestOrderSort}
                   selectedOrderIds={new Set()} // Assuming no selection needed here
                   onSelectOrder={() => {}} // Assuming no selection needed here
                   isAdminView={true} 
                   onRowClick={handleViewDetailsClick} // View details on row click
                   onAssign={null} // No direct assign from this view
                   onUpdateStatusClick={handleUpdateStatusClick} // Button to open status modal
                   onEditClick={handleEditClick} // Button to open edit modal
                />
                {totalOrderPages > 1 && (
                    <Pagination 
                       currentPage={orderCurrentPage}
                       totalPages={totalOrderPages}
                       onPageChange={handleOrderPageChange}
                       totalCount={totalOrderResults}
                       pageSize={ITEMS_PER_PAGE}
                   />
                )}
               {/* --- End Orders Tab Content --- */}
            </Fragment>
          )}

          {activeTab === 'users' && (
            <Fragment>
              {/* --- Users Tab Content RESTORED --- */}
               <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-4 border-b border-gray-200 gap-4">
                   <div className="flex-grow w-full sm:w-auto sm:max-w-xs">
                        <label htmlFor="userSearch" className="sr-only">Cari Pengguna</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                type="text"
                                name="userSearch"
                                id="userSearch"
                                className="focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2"
                                placeholder="Cari Nama atau Email..."
                                value={userSearchTerm}
                                onChange={handleUserSearchChange}
                            />
                            {userSearchTerm && (
                               <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-10">
                                   <button type="button" onClick={() => setUserSearchTerm('')} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-500 rounded-full p-0.5" aria-label="Clear search">
                                       <FiX className="h-5 w-5" />
                                   </button>
                               </div>
                            )}
                        </div>
                   </div>
                   <div className="flex-shrink-0 w-full sm:w-auto">
                       <button 
                           onClick={handleAddUserClick}
                           className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-sky-500 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-sky-600 active:bg-sky-700 focus:outline-none focus:border-sky-700 focus:ring focus:ring-sky-300 disabled:opacity-25 transition"
                       >
                          <FiUserPlus className="-ml-0.5 mr-1.5 h-4 w-4"/>
                          Tambah Pengguna
                       </button>
                   </div>
               </div>

               <h2 className="text-xl font-semibold text-gray-800 mb-4">Daftar Pengguna Sistem</h2>

               {loadingUsers && <p className="text-center text-gray-500 py-4">Memuat pengguna...</p>} 
               
               {!loadingUsers && (
                  <UserTable 
                      users={filteredUsers} 
                      onEdit={handleEditUserClick} 
                      onDelete={handleDeleteUser} 
                      sortConfig={userSortConfig}
                      requestSort={requestUserSort}
                  />
               )}
               {/* Note: Add Pagination for Users if needed, similar to Orders */}
              {/* --- End Users Tab Content --- */}
            </Fragment>
          )}

          {activeTab === 'analytics' && (
             <AnalyticsTab technicians={technicians} orders={allOrders}/>
          )}

          {activeTab === 'activityLog' && (
             <ActivityLogTab allUsers={allUsers} />
          )}

          {/* Settings Tab Content - Added */}
          {activeTab === 'settings' && (
             <SystemSettingsTab />
          )}
        </div>
      )}

      {/* Modals (User Form, Order Detail, Update Status, Edit Form, Confirmation) */} 
      {(isDetailModalOpen || isDetailModalClosing) && (
        <div className={`fixed inset-0 z-60 flex items-center justify-center p-4`} role="dialog">
           <div className={`fixed inset-0 bg-[rgba(0,0,0,0.4)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isDetailModalMounted && !isDetailModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseOrderModal} aria-hidden="true"></div>
           <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isDetailModalMounted && !isDetailModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}>
             {selectedOrder && <ServiceOrderDetailModal order={selectedOrder} technicians={technicians} onClose={triggerCloseOrderModal}/>}
          </div>
        </div>
      )}
      {(isStatusModalOpen || isStatusModalClosing) && (
           <div className={`fixed inset-0 z-60 flex items-center justify-center p-4`} role="dialog">
             <div className={`fixed inset-0 bg-[rgba(0,0,0,0.4)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isStatusModalMounted && !isStatusModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseOrderModal} aria-hidden="true"></div>
              <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-sm max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isStatusModalMounted && !isStatusModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}> 
               {orderToUpdateStatus && <UpdateStatusModal 
                  order={orderToUpdateStatus} 
                  currentStatus={orderToUpdateStatus?.status} 
                  onUpdate={handleConfirmStatusUpdate}
                  onClose={triggerCloseOrderModal}
                  allowedStatuses={['Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan']} 
                />}
            </div>
          </div>
      )}
       {(isEditModalOpen || isEditModalClosing) && (
          <div className={`fixed inset-0 z-60 flex items-center justify-center p-4`} role="dialog">
             <div className={`fixed inset-0 bg-[rgba(0,0,0,0.4)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isEditModalMounted && !isEditModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseOrderModal} aria-hidden="true"></div>
             <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isEditModalMounted && !isEditModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}> 
                {orderToEdit && <EditOrderForm 
                    orderData={orderToEdit} 
                    onClose={handleEditFormClose}
                />}
             </div>
         </div>
      )}

      {(isUserModalOpen || isUserModalClosing) && (
          <UserFormModal 
              isOpen={isUserModalMounted} 
              isClosing={isUserModalClosing} 
              onClose={triggerCloseUserModal} 
              onSave={handleConfirmUserForm} 
              userToEdit={userToEdit} 
          />
      )} 

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmDeleteUser}
        title="Konfirmasi Hapus Pengguna"
        message={`Apakah Anda yakin ingin menghapus pengguna "${userToDelete?.full_name || ''}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isDestructive={true}
      />

    </div>
  );
}

export default AdminDashboard; 