import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom'; // Import Link for internal navigation
import { formatDistanceToNowStrict } from 'date-fns'; // Import date-fns function
import { id } from 'date-fns/locale'; // Import Indonesian locale for date-fns
// No longer need useAuth for this view
// import { useAuth } from '../contexts/AuthContext'; 
import { supabase } from '../supabase/supabaseClient'; // Import supabase
import { Popover, Transition } from '@headlessui/react'; // Import Popover and Transition
import UpdateStatusModal from '../components/UpdateStatusModal'; // Import Modal
import Toast from '../components/Toast'; // Import Toast
import ServiceOrderDetailModal from '../components/ServiceOrderDetailModal'; // Re-import Detail Modal
import TechnicianEditModal from '../components/TechnicianEditModal'; // Import the new modal
import RecentActivityFeed from '../components/RecentActivityFeed'; // Import Activity Feed
import { FiEdit3, FiCheckSquare, FiEye, FiFilter, FiUser, FiList, FiHardDrive, FiTool, FiClock, FiX, FiAlertCircle } from 'react-icons/fi'; // Import edit, check-square, eye, filter, user, list, hard drive, tool, clock, X icons, and FiAlertCircle
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'; // Import sorting icons
import { FiSearch } from 'react-icons/fi'; // Import search icon
import { FiChevronLeft, FiChevronRight, FiBookOpen, FiGrid, FiTag, FiPackage } from 'react-icons/fi'; // Added FiTag, FiPackage

const MODAL_ANIMATION_DURATION = 300;
const ITEMS_PER_PAGE = 10; // Define items per page for pagination

// Define possible statuses for filtering
const STATUS_OPTIONS = ['Semua', 'Baru', 'Diproses', 'Selesai', 'Dibatalkan', 'Menunggu Spare Part'];

function TechnicianDashboard() {
  // const { user } = useAuth(); // Removed unused user variable
  const [allFetchedOrders, setAllFetchedOrders] = useState([]); // Store raw fetched data
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(''); // State for toast
  const fetchInitiatedRef = useRef(false); // Add this ref

  // State for Filters
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [technicianFilter, setTechnicianFilter] = useState('Semua');

  // State for Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });

  // State for Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // Debounced value

  // State for Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // State for Update Status Modal
  const [orderToUpdateStatus, setOrderToUpdateStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusModalClosing, setIsStatusModalClosing] = useState(false);
  const [isStatusModalMounted, setIsStatusModalMounted] = useState(false);

  // Re-add State for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailModalClosing, setIsDetailModalClosing] = useState(false);
  const [isDetailModalMounted, setIsDetailModalMounted] = useState(false);

  // Technician Edit Modal (New)
  const [orderToEditTech, setOrderToEditTech] = useState(null);
  const [isTechEditModalOpen, setIsTechEditModalOpen] = useState(false);
  const [isTechEditModalClosing, setIsTechEditModalClosing] = useState(false);
  const [isTechEditModalMounted, setIsTechEditModalMounted] = useState(false);

  // Wrap fetch functions in useCallback for stable references
  const fetchTechnicianViewOrders = useCallback(async () => {
    try {
      let query = supabase
        .from('service_orders')
        .select('*');

      query = query.not('assigned_technician_id', 'is', null)
                   .order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAllFetchedOrders(data || []); // Store raw data
    } catch (err) {
      console.error("Error fetching technician view orders:", err);
      setError((prev) => prev ? `${prev}; ${err.message}` : `Gagal memuat tugas: ${err.message}`);
      setAllFetchedOrders([]); // Clear raw data on error
    }
  }, []); // Empty dependency array as it doesn't depend on component state/props

  const fetchTechnicians = useCallback(async () => {
    try {
      const { data, error: techError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'technician')
        .order('full_name');
      if (techError) throw techError;
      setTechnicians(data || []);
    } catch (err) {
      console.error("Error fetching technicians:", err);
      setError((prev) => prev ? `${prev}; ${err.message}` : `Gagal memuat data teknisi: ${err.message}`);
      setTechnicians([]);
    }
  }, []); // Empty dependency array

  useEffect(() => {
    // Prevent double fetch in StrictMode
    if (fetchInitiatedRef.current) {
        return;
    }
    fetchInitiatedRef.current = true;

    setLoading(true);
    setError(null);
    console.log("TechnicianDashboard: Starting data fetch (useEffect)...");
    Promise.all([fetchTechnicianViewOrders(), fetchTechnicians()])
      .catch((e) => {
        console.error("TechnicianDashboard: Error during initial data fetch:", e)
      })
      .finally(() => {
        console.log("TechnicianDashboard: Fetch Promise.all finally block reached.");
        setLoading(false);
      });

     // Optional cleanup function if needed, though not strictly necessary for fetch 
     // return () => { fetchInitiatedRef.current = false; } // Reset if component fully unmounts
  }, [fetchTechnicianViewOrders, fetchTechnicians]); // Add fetch functions as dependencies

  // Effect to debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timerId); // Cleanup timeout on unmount or if searchTerm changes again quickly
    };
  }, [searchTerm]);

  // --- Derived Data (Filtering, Sorting, Pagination) using useMemo ---
  const filteredSortedOrders = useMemo(() => {
    let filteredData = [...allFetchedOrders];

    // Apply Status Filter
    if (statusFilter !== 'Semua') {
      filteredData = filteredData.filter(order => order.status === statusFilter);
    }

    // Apply Technician Filter
    if (technicianFilter !== 'Semua') {
      filteredData = filteredData.filter(order => order.assigned_technician_id === technicianFilter);
    }

    // Use debouncedSearchTerm for filtering
    if (debouncedSearchTerm) {
      const lowercasedSearchTerm = debouncedSearchTerm.toLowerCase();
      filteredData = filteredData.filter(order => 
        (order.customer_name?.toLowerCase().includes(lowercasedSearchTerm)) ||
        (order.device_type?.toLowerCase().includes(lowercasedSearchTerm)) ||
        (order.brand_model?.toLowerCase().includes(lowercasedSearchTerm)) ||
        (order.customer_complaint?.toLowerCase().includes(lowercasedSearchTerm)) ||
        (String(order.id)?.toLowerCase().includes(lowercasedSearchTerm)) // Convert ID to string before lowercasing
      );
    }

    // Apply Sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle potential null/undefined values for robustness
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Special handling for date sorting
        if (sortConfig.key === 'created_at') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;

  }, [allFetchedOrders, statusFilter, technicianFilter, sortConfig, debouncedSearchTerm]);

  // Calculate paginated data
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSortedOrders.slice(startIndex, endIndex);
  }, [filteredSortedOrders, currentPage]);

  // --- Reset page number when filters change --- 
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters/search change
  }, [statusFilter, technicianFilter, debouncedSearchTerm]);

  // --- Derived Data for Focus Panel --- 
  const { oldestDiprosesTasks, waitingForPartsTasks } = useMemo(() => {
    const diproses = filteredSortedOrders
      .filter(order => order.status === 'Diproses')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Sort oldest first
      
    const waiting = filteredSortedOrders
      .filter(order => order.status === 'Menunggu Spare Part')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Sort oldest first

    return {
      oldestDiprosesTasks: diproses.slice(0, 3), // Take top 3
      waitingForPartsTasks: waiting.slice(0, 3)  // Take top 3
    };
  }, [filteredSortedOrders]);

  // --- Realtime Subscription --- 
  useEffect(() => {
    console.log("Setting up Supabase subscription...");

    // Define the callback function for handling changes
    const handleDbChanges = (payload) => {
      console.log('Change received!', payload);
      // Re-fetch orders whenever any change occurs in the service_orders table
      // This ensures data consistency with filters/sorting/pagination
      fetchTechnicianViewOrders();
    };

    // Subscribe to changes in the 'service_orders' table
    const channel = supabase
      .channel('service_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_orders' },
        handleDbChanges
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to service_orders changes!');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('Subscription failed:', status, err);
              setError((prev) => prev ? `${prev}; Subscription failed` : 'Subscription failed');
          } else {
              console.log('Subscription status:', status);
          }
      });

    // Cleanup function: Remove the subscription when the component unmounts
    return () => {
      console.log("Removing Supabase subscription...");
      supabase.removeChannel(channel);
    };
  }, [fetchTechnicianViewOrders]); // Re-run if fetch function reference changes (though unlikely with useCallback)

  // --- Modal Logic --- 
  const openStatusModal = (order) => {
    setOrderToUpdateStatus(order);
    setIsStatusModalOpen(true);
    setIsStatusModalMounted(false); // Reset mount state
  };

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
    setIsDetailModalMounted(false);
  };

  const openTechEditModal = (order) => { // New Open Handler
    setOrderToEditTech(order);
    setIsTechEditModalOpen(true);
    setIsTechEditModalMounted(false);
  };

  // Wrap triggerCloseModal in useCallback
  const triggerCloseModal = useCallback(() => {
      // Dependencies are the state setters, which are stable
      if (isStatusModalOpen) setIsStatusModalClosing(true);
      if (isDetailModalOpen) setIsDetailModalClosing(true);
      if (isTechEditModalOpen) setIsTechEditModalClosing(true); // Add Tech Edit Modal
  }, [isStatusModalOpen, isDetailModalOpen, isTechEditModalOpen]); // Add dependencies it reads

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
      const timer = setTimeout(() => setIsStatusModalMounted(true), 10); // Mount after a short delay
      return () => clearTimeout(timer);
    }
    if (!isStatusModalOpen && !isStatusModalClosing) {
      setIsStatusModalMounted(false);
    }
  }, [isStatusModalOpen, isStatusModalClosing]);

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
    if (!isDetailModalOpen && !isDetailModalClosing) {
      setIsDetailModalMounted(false);
    }
  }, [isDetailModalOpen, isDetailModalClosing]);

  useEffect(() => {
    if (isTechEditModalClosing) {
      const timer = setTimeout(() => {
        setOrderToEditTech(null);
        setIsTechEditModalOpen(false);
        setIsTechEditModalClosing(false);
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isTechEditModalClosing]);

  useEffect(() => {
    if (isTechEditModalOpen && !isTechEditModalClosing) {
      const timer = setTimeout(() => setIsTechEditModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
    if (!isTechEditModalOpen && !isTechEditModalClosing) {
      setIsTechEditModalMounted(false);
    }
  }, [isTechEditModalOpen, isTechEditModalClosing]);

  // Add triggerCloseModal to dependency array
  useEffect(() => {
      const handleEsc = (event) => {
          if (event.keyCode === 27) {
              triggerCloseModal();
          }
      };
      if (isStatusModalOpen || isDetailModalOpen || isTechEditModalOpen) {
          window.addEventListener('keydown', handleEsc);
      }
      return () => {
          window.removeEventListener('keydown', handleEsc);
      };
  }, [isStatusModalOpen, isDetailModalOpen, isTechEditModalOpen, triggerCloseModal]); // Add triggerCloseModal here

  const handleConfirmStatusUpdate = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;

    try {
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ status: newStatus, updated_at: new Date() })
        .eq('id', orderId);

      if (updateError) throw updateError;
      console.log("Setting toast: Success Update");
      setToastMessage(`Status order ${orderId} berhasil diupdate ke ${newStatus}.`);
      triggerCloseModal();
      fetchTechnicianViewOrders(); // Refresh list after update

    } catch (err) {
      console.error("Error updating order status:", err);
      console.log("Setting toast: Error Update");
      setToastMessage(`Gagal update status: ${err.message}`);
      // Keep modal open on error? Optional.
    }
  };

  // Save Technician Edits (New)
  const handleSaveTechEdit = async (orderId, updatedData) => {
      try {
          const { error } = await supabase
              .from('service_orders')
              .update({ 
                  notes: updatedData.notes, 
                  parts_used: updatedData.parts_used, 
                  updated_at: new Date() 
              })
              .eq('id', orderId);
          
          if (error) throw error;

          setToastMessage('Catatan & sparepart berhasil disimpan.');
          triggerCloseModal(); // Close the tech edit modal
          // Refresh only the orders list, technicians list is unlikely to change
          fetchTechnicianViewOrders(); 

      } catch (err) {
          console.error("Error saving technician edits:", err);
          setToastMessage(`Gagal menyimpan: ${err.message}`);
          throw err; // Re-throw to allow modal to potentially display error
      }
  };

  // Handler for the button click
  const handleUpdateStatusClick = (order, e) => {
    e.stopPropagation(); // Prevent row click
    openStatusModal(order);
  };

  const handleViewDetailsClick = (order, e) => {
    e?.stopPropagation(); // Prevent row click (check if e exists)
    openDetailModal(order);
  };

  const handleTechEditClick = (order, e) => {
    e.stopPropagation(); // Prevent row click
    openTechEditModal(order);
  };

  // --- Filter and Sort Handlers ---
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleTechnicianFilterChange = (event) => {
    setTechnicianFilter(event.target.value);
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
        // Optional: Third click resets to default or removes sort for this column
        // For now, let's just keep toggling
         direction = 'ascending'; 
    }
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleClearFilters = () => {
    setStatusFilter('Semua');
    setTechnicianFilter('Semua');
    setSearchTerm('');
    // Debounced term will update automatically via its useEffect
    // Current page reset is handled by the useEffect watching filters/search term
  };

  // Helper to get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="inline ml-1 h-3 w-3 text-gray-400" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <FaSortUp className="inline ml-1 h-3 w-3 text-blue-500" />;
    }
    return <FaSortDown className="inline ml-1 h-3 w-3 text-blue-500" />;
  };
  // --- End Filter and Sort Handlers ---

  // --- Pagination Logic & Helpers --- 
  const totalResults = filteredSortedOrders.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (page) => {
     setCurrentPage(page);
  };

  // Helper to generate page numbers for pagination control
  const getPageNumbers = () => {
    const delta = 1; // How many pages to show around the current page
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    let l;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Component */} 
      <Toast 
          message={toastMessage} 
          onClose={() => { 
              console.log("Toast onClose triggered, clearing message");
              setToastMessage(''); 
          }} 
      />

      {/* <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">Technician View (All Assigned Tasks)</h1> */}

      {/* Summary Cards Section - Now based on filtered data */} 
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {/* Card 1: Total Filtered Tugas */} 
          <div className="bg-white p-5 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-[1.02]">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Tugas (Filter)</p>
              <p className="text-2xl font-semibold text-gray-900">{filteredSortedOrders.length}</p>
            </div>
            <div className="bg-blue-100 text-blue-600 rounded-lg p-3">
              <FiHardDrive className="h-6 w-6"/>
            </div>
          </div>

          {/* Card 2: Diproses (formerly Dikerjakan) */}
          <div className="bg-white p-5 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-[1.02]">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Diproses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredSortedOrders.filter(order => order.status === 'Diproses').length}
              </p>
            </div>
            <div className="bg-yellow-100 text-yellow-600 rounded-lg p-3">
              <FiTool className="h-6 w-6"/>
            </div>
          </div>

          {/* Card 3: Menunggu Sparepart */}
          <div className="bg-white p-5 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-[1.02]">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Menunggu Sparepart</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredSortedOrders.filter(order => order.status === 'Menunggu Spare Part').length}
              </p>
            </div>
            <div className="bg-purple-100 text-purple-600 rounded-lg p-3">
              <FiClock className="h-6 w-6"/>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */} 
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
        {/* Left/Main Column */} 
        <div className="lg:col-span-2 space-y-6">

          {/* Loading State - Removed from here */}
          {/* Error State - Removed from here, handled below */}
          
          {/* Table Area Container (Always Visible) */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Tugas Aktif</h2>

              {/* Filter Controls (Sticky Wrapper) */} 
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pt-4 pb-4 mb-4 border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6"> {/* Added sticky classes, background, padding adjustment */} 
                <div className="flex flex-wrap items-end gap-4">
                  {/* Status Filter */} 
                  <div className="flex-grow sm:flex-grow-0 min-w-[150px]">
                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiFilter className="h-4 w-4 mr-1.5 text-gray-400"/>Status
                    </label>
                    <select
                      id="statusFilter"
                      name="statusFilter"
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      className="block w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 bg-white rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 focus:border-indigo-500 transition ease-in-out duration-150"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  {/* Technician Filter */} 
                  <div className="flex-grow sm:flex-grow-0 min-w-[180px]">
                    <label htmlFor="technicianFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <FiUser className="h-4 w-4 mr-1.5 text-gray-400"/>Teknisi
                    </label>
                    <select
                      id="technicianFilter"
                      name="technicianFilter"
                      value={technicianFilter}
                      onChange={handleTechnicianFilterChange}
                      className="block w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 bg-white rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 focus:border-indigo-500 transition ease-in-out duration-150"
                    >
                      <option value="Semua">Semua Teknisi</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Search Input */} 
                  <div className="flex-grow sm:flex-grow-0 min-w-[200px]">
                     <label htmlFor="searchFilter" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <FiSearch className="h-4 w-4 mr-1.5 text-gray-400"/>Cari Order
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="searchFilter"
                          name="searchFilter"
                          placeholder="Nama, perangkat, keluhan..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          className="block w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 bg-white rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 focus:border-indigo-500 transition ease-in-out duration-150"
                        />
                        {searchTerm && (
                          <button 
                            type="button"
                            onClick={() => setSearchTerm('')} 
                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            aria-label="Clear search"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                  </div>
                  {/* Clear Filters Button (only show if filters active) */} 
                  {(statusFilter !== 'Semua' || technicianFilter !== 'Semua' || searchTerm !== '') && (
                     <div className="flex-shrink-0"> {/* Prevent stretching */} 
                       <button
                          onClick={handleClearFilters}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
                          title="Hapus semua filter"
                       >
                          <FiX className="h-3 w-3 mr-1 -ml-0.5"/> Clear Filters
                        </button>
                      </div>
                  )}
                </div>
              </div>

              {/* Error Message Display (Above Table) */} 
              {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded mb-4">Error: {error}</p>}

              {/* Table Container */} 
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      {/* Updated TH elements with sorting & active highlight (text color) */} 
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                        <button onClick={() => requestSort('assigned_technician_id')} className={`flex items-center focus:outline-none ${sortConfig.key === 'assigned_technician_id' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> {/* Text Highlight */} 
                            Teknisi {getSortIcon('assigned_technician_id')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                        <button onClick={() => requestSort('created_at')} className={`flex items-center focus:outline-none ${sortConfig.key === 'created_at' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> {/* Text Highlight */} 
                            Tanggal Masuk {getSortIcon('created_at')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                        <button onClick={() => requestSort('customer_name')} className={`flex items-center focus:outline-none ${sortConfig.key === 'customer_name' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> {/* Text Highlight */} 
                            Pelanggan {getSortIcon('customer_name')}
                        </button>
                      </th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                        <button onClick={() => requestSort('device_type')} className={`flex items-center focus:outline-none ${sortConfig.key === 'device_type' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> {/* Text Highlight */} 
                            Perangkat {getSortIcon('device_type')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Keluhan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> 
                        <button onClick={() => requestSort('status')} className={`flex items-center focus:outline-none ${sortConfig.key === 'status' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> {/* Text Highlight */} 
                            Status {getSortIcon('status')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Conditional Rendering inside tbody */} 
                    {loading ? (
                      // Loading Row
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                           <div className="inline-flex items-center">
                             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Memuat data tugas...
                          </div>
                        </td>
                      </tr>
                    ) : paginatedOrders.length === 0 ? (
                      // Empty State Row (Error state doesn't need a row here)
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">
                          {(statusFilter !== 'Semua' || technicianFilter !== 'Semua' || debouncedSearchTerm !== '') 
                            ? "Tidak ada tugas yang cocok dengan filter/pencarian Anda." 
                            : "Tidak ada tugas yang perlu ditampilkan."}
                        </td>
                      </tr>
                    ) : (
                      // Data Rows
                      paginatedOrders.map((order) => (
                        <tr 
                          key={order.id} 
                          className="odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition duration-150 ease-in-out cursor-pointer"
                          onClick={() => handleViewDetailsClick(order)}
                        >
                           {/* ... existing td elements for data ... */} 
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {technicians.find(t => t.id === order.assigned_technician_id)?.full_name || order.assigned_technician_id || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(order.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.customer_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.device_type} - {order.brand_model}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs" title={order.customer_complaint}>
                            <Popover className="relative">
                              {({ open }) => (
                                <>
                                  <Popover.Button className="text-left focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 rounded px-0.5 py-0.5 -ml-0.5 -my-0.5">
                                    <span className="block max-w-xs truncate cursor-pointer hover:text-gray-900">
                                      {order.customer_complaint || '-'} 
                                    </span>
                                  </Popover.Button>
                                  <Transition
                                    show={open}
                                    as={React.Fragment}
                                    enter="transition ease-out duration-200"
                                    enterFrom="opacity-0 translate-y-1"
                                    enterTo="opacity-100 translate-y-0"
                                    leave="transition ease-in duration-150"
                                    leaveFrom="opacity-100 translate-y-0"
                                    leaveTo="opacity-0 translate-y-1"
                                  >
                                    <Popover.Panel className="absolute z-20 w-72 px-3 py-2 mt-1 text-sm text-white bg-gray-800 rounded-md shadow-lg transform -translate-x-1/2 left-1/2 sm:left-auto sm:transform-none sm:-translate-x-4">
                                      {order.customer_complaint}
                                    </Popover.Panel>
                                  </Transition>
                                </>
                              )}
                            </Popover>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'Baru' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'Diproses' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'Selesai' ? 'bg-green-100 text-green-800' :
                              order.status === 'Dibatalkan' ? 'bg-red-100 text-red-800' :
                              order.status === 'Menunggu Spare Part' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                             {/* ... Action buttons ... */} 
                              <button
                              onClick={(e) => handleTechEditClick(order, e)}
                              className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 rounded p-1 inline-flex items-center justify-center cursor-pointer"
                              title="Edit Catatan/Sparepart"
                            >
                              <FiEdit3 className="h-4 w-4"/>
                            </button>
                            <button
                              onClick={(e) => handleUpdateStatusClick(order, e)}
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 rounded p-1 inline-flex items-center justify-center cursor-pointer"
                              title="Update Status"
                            >
                              <FiCheckSquare className="h-4 w-4"/>
                            </button>
                             <button
                              onClick={(e) => handleViewDetailsClick(order, e)}
                              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 rounded p-1 inline-flex items-center justify-center cursor-pointer"
                              title="Lihat Detail"
                            >
                              <FiEye className="h-4 w-4"/>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls (Always visible if needed) */} 
              {filteredSortedOrders.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-lg shadow-md">
                      {/* ... Pagination content ... */} 
                       {/* Left Side: Results Text */}
                      <div className="flex flex-1 justify-between sm:hidden">
                          {/* ... mobile pagination buttons ... */} 
                          <button
                              onClick={handlePrevPage}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              Previous
                          </button>
                          <button
                              onClick={handleNextPage}
                              disabled={currentPage === totalPages}
                              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              Next
                          </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                          {/* ... desktop results text and pagination buttons ... */} 
                          <div>
                              <p className="text-sm text-gray-700">
                                  Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalResults)}</span> of{' '}
                                  <span className="font-medium">{totalResults}</span> results
                              </p>
                          </div>
                          <div>
                              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                  {/* ... desktop pagination buttons ... */} 
                                  <button
                                      onClick={handlePrevPage}
                                      disabled={currentPage === 1}
                                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      <span className="sr-only">Previous</span>
                                      <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                                  </button>
                                  {/* Page Numbers */} 
                                  {getPageNumbers().map((page, index) => (
                                     <button
                                       key={index} // Use index as key for potentially duplicate '...'
                                       onClick={() => typeof page === 'number' && handlePageClick(page)}
                                       disabled={page === '...'}
                                       className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${ 
                                         currentPage === page 
                                           ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' 
                                           : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                       } ${page === '...' ? 'text-gray-400 cursor-default' : ''}`}
                                       aria-current={currentPage === page ? 'page' : undefined}
                                     >
                                      {page}
                                    </button>
                                  ))}
                                  <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      <span className="sr-only">Next</span>
                                      <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                                  </button>
                              </nav>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */} 
        <div className="lg:col-span-1 space-y-6">

          {/* Conditionally render Quick Access and Activity Feed */} 
          {!loading && !error && (
            <>
              {/* Quick Access Panel -> Renamed to Task Focus Panel */} 
              <div className="bg-white p-5 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-600 border-b border-gray-200 pb-2 mb-3 flex items-center">
                  <FiAlertCircle className="h-4 w-4 mr-2 text-orange-500" /> Task Focus
                </h3>
                <div className="space-y-4"> {/* Main container for sections */}
                  {/* Oldest Diproses Section */} 
                  <div>
                     <h4 className="text-xs font-semibold text-gray-500 mb-1.5">Terlama Diproses</h4>
                     {oldestDiprosesTasks.length > 0 ? (
                        <ul className="space-y-1.5 text-xs">
                           {oldestDiprosesTasks.map(order => (
                              <li key={order.id}>
                                 <button 
                                   onClick={(e) => handleViewDetailsClick(order, e)} 
                                   className="text-left text-gray-700 hover:text-blue-600 focus:outline-none focus:underline transition-colors duration-150 cursor-pointer"
                                   title={`Lihat detail Order #${String(order.id).substring(0,8)}`}
                                  >
                                   <span className="font-medium">{order.customer_name}</span> ({order.device_type || 'N/A'}) -
                                   <span className="text-gray-500 ml-1">
                                      ({formatDistanceToNowStrict(new Date(order.created_at), { addSuffix: true, locale: id })})
                                   </span>
                                </button>
                              </li>
                           ))}
                        </ul>
                     ) : (
                        <p className="text-xs text-gray-400 italic">Tidak ada order 'Diproses'.</p>
                     )}
                  </div>

                  {/* Menunggu Spare Part Section */} 
                  <div>
                     <h4 className="text-xs font-semibold text-gray-500 mb-1.5">Menunggu Spare Part</h4>
                      {waitingForPartsTasks.length > 0 ? (
                        <ul className="space-y-1.5 text-xs">
                           {waitingForPartsTasks.map(order => (
                              <li key={order.id}>
                                 <button 
                                   onClick={(e) => handleViewDetailsClick(order, e)} 
                                   className="text-left text-gray-700 hover:text-blue-600 focus:outline-none focus:underline transition-colors duration-150 cursor-pointer"
                                   title={`Lihat detail Order #${String(order.id).substring(0,8)}`}
                                  >
                                     <span className="font-medium">{order.customer_name}</span> ({order.device_type || 'N/A'}) -
                                     <span className="text-gray-500 ml-1">
                                        ({formatDistanceToNowStrict(new Date(order.created_at), { addSuffix: true, locale: id })})
                                     </span>
                                  </button>
                              </li>
                           ))}
                        </ul>
                     ) : (
                        <p className="text-xs text-gray-400 italic">Tidak ada order menunggu spare part.</p>
                     )}
                  </div>
                </div>
              </div>

              {/* Activity Feed */} 
              <RecentActivityFeed limit={10} technicians={technicians}/> 
            </>
          )}

        </div>
      </div>

      {/* Update Status Modal - Wrapped with modal structure */} 
      {(isStatusModalOpen || isStatusModalClosing) && (
         // Outer backdrop
         <div 
           className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isStatusModalMounted && !isStatusModalClosing ? 'opacity-100' : 'opacity-0'}`}
           style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
           onClick={triggerCloseModal} // Close on backdrop click
         >
             {/* Inner wrapper for content and transition */}
             <div 
                 className={`transform transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isStatusModalMounted && !isStatusModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                 onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
             >
                 <UpdateStatusModal 
                   order={orderToUpdateStatus}
                   // Pass original props expected by the reverted component
                   onClose={triggerCloseModal} 
                   onConfirm={handleConfirmStatusUpdate} 
                   // Remove isOpen/isClosing props if reverted component doesn't use them
                   // isOpen={isStatusModalMounted} 
                   // isClosing={isStatusModalClosing} 
                   // Add currentStatus prop if needed by original component logic
                   // currentStatus={orderToUpdateStatus?.status}
                   // Pass allowedStatuses if the component still uses it internally
                   allowedStatuses={['Diproses', 'Selesai', 'Menunggu Spare Part', 'Dibatalkan']} 
                 />
             </div>
         </div>
      )}

      {/* Detail Modal - Wrapped with modal structure */} 
      {(isDetailModalOpen || isDetailModalClosing) && (
        // Outer backdrop
        <div 
          className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isDetailModalMounted && !isDetailModalClosing ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={triggerCloseModal} 
        >
            {/* Inner wrapper for content and transition */}
            <div 
                className={`transform transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isDetailModalMounted && !isDetailModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                style={{ maxHeight: '90vh', maxWidth: 'calc(100vw - 2rem)' }} 
                onClick={(e) => e.stopPropagation()} 
            >
                <ServiceOrderDetailModal
                  order={selectedOrder} 
                  onClose={triggerCloseModal} 
                  technicians={technicians} 
                />
            </div>
        </div>
      )}

      {/* Technician Edit Modal (New) - Apply wrapper structure for animation */}
      {(isTechEditModalOpen || isTechEditModalClosing) && (
        // Outer backdrop
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isTechEditModalMounted && !isTechEditModalClosing ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={triggerCloseModal} 
        >
            {/* Inner wrapper for content and transition */}
            <div 
                className={`transform transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isTechEditModalMounted && !isTechEditModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                // Removed maxHeight/maxWidth here, let the modal itself define size if needed
                onClick={(e) => e.stopPropagation()} 
            >
              <TechnicianEditModal
                order={orderToEditTech}
                // isOpen and isClosing are now primarily for *internal* logic if needed, 
                // but the *animation* is driven by the wrapper divs above.
                isOpen={isTechEditModalMounted} 
                isClosing={isTechEditModalClosing}
                onClose={triggerCloseModal}
                onSave={handleSaveTechEdit}
              />
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicianDashboard; 