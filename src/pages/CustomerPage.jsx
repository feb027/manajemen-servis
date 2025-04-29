// src/pages/CustomerPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabaseClient';
import {
  FiUsers, FiPlus, FiEye, FiEdit, FiSearch, FiX,
  FiCalendar, FiTool, FiChevronLeft, FiChevronRight, FiUser,
  FiInbox, FiBarChart2, FiFilter // Added FiFilter
} from 'react-icons/fi';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'; // Sorting icons
import { format, subMonths, getMonth, getYear, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'; // Date functions (removed unused)
import { id } from 'date-fns/locale'; // Indonesian locale
import CustomerServiceHistoryModal from '../components/CustomerServiceHistoryModal';
import CustomerFormModal from '../components/CustomerFormModal';
import Toast from '../components/Toast';
import TableSkeletonLoader from '../components/TableSkeletonLoader'; // Import Skeleton Loader
import RightColumnCardSkeleton from '../components/RightColumnCardSkeleton'; // Import Right Column Skeleton
// Import Recharts components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'; 

const MODAL_ANIMATION_DURATION = 300;
const ITEMS_PER_PAGE = 10; // Items per page for pagination

// Updated Customer Table Component for empty state
function CustomerTable({ 
    customers, 
    onCustomerClick, 
    onEditClick, 
    isFiltering, 
    requestSort, // Added for sorting
    sortConfig   // Added for sorting
}) { 
  // Helper to get sort icon
  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <FaSort className="inline ml-1 h-3 w-3 text-gray-400" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <FaSortUp className="inline ml-1 h-3 w-3 text-sky-600" />;
    }
    return <FaSortDown className="inline ml-1 h-3 w-3 text-sky-600" />;
  };

  if (!customers || customers.length === 0) {
    return (
        <div className="text-center text-gray-500 mt-4 py-10 flex flex-col items-center"> {/* Centered content */} 
            <FiInbox className="w-12 h-12 mb-3 text-gray-400" /> {/* Icon */} 
            <p>
                {isFiltering 
                    ? "Tidak ada pelanggan yang cocok dengan pencarian Anda."
                    : "Belum ada data pelanggan."
                }
            </p>
        </div>
    );
  }
  
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Make headers clickable for sorting */}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button onClick={() => requestSort('full_name')} className={`flex items-center focus:outline-none ${sortConfig?.key === 'full_name' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> 
                Nama Lengkap {getSortIcon('full_name')}
              </button>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {/* Not sorting phone/email individually for now */} 
                 Nomor Telepon
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 {/* Not sorting address */} 
                 Alamat
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
               <button onClick={() => requestSort('service_count')} className={`flex items-center justify-center w-full focus:outline-none ${sortConfig?.key === 'service_count' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> 
                 Jml Servis {getSortIcon('service_count')}
               </button>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
      {customers.map(customer => (
             <tr 
               key={customer.id} 
               className="odd:bg-white even:bg-gray-50/50 hover:bg-sky-100 transition-colors duration-150"
             >
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm font-medium text-gray-900">{customer.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm text-gray-600">{customer.phone_number || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm text-gray-600">{customer.email || '-'}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={customer.address || ''}> 
                   {customer.address || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {customer.service_count ?? 0} {/* Use pre-calculated count */} 
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {/* Action buttons */}
                  <button 
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 rounded transition duration-150 ease-in-out inline-flex items-center justify-center"
                    title="Lihat Riwayat Servis"
                    onClick={(e) => { e.stopPropagation(); onCustomerClick(customer); }}
                  >
                     <FiEye className="h-4 w-4" />
                  </button>
                   <button 
                      className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 p-1 rounded transition duration-150 ease-in-out inline-flex items-center justify-center"
                      title="Edit Data Pelanggan"
                      onClick={(e) => { e.stopPropagation(); onEditClick(customer); }}
                  >
                     <FiEdit className="h-4 w-4" />
                  </button>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Pagination Component ---
function PaginationControls({ currentPage, totalPages, onPageChange }) {
   // Helper to generate page numbers for pagination control
  const getPageNumbers = () => {
    const delta = 1;
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
     <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-md">
        <div className="flex flex-1 justify-between sm:hidden">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
                <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                </p>
          </div>
            <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="sr-only">Previous</span>
                        <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {getPageNumbers().map((page, index) => (
                      <button
                        key={index} 
                        onClick={() => typeof page === 'number' && onPageChange(page)}
                        disabled={page === '...'}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${ 
                          currentPage === page 
                            ? 'z-10 bg-sky-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600' 
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        } ${page === '...' ? 'text-gray-400 cursor-default' : ''}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
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
  );
}


function CustomerPage() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // --- Sorting State ---
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'ascending' });

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);

  // --- Date Filter State ---
  const [dateFilter, setDateFilter] = useState('Semua'); // Default to 'All'

  // --- History Modal State & Logic ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHistoryModalClosing, setIsHistoryModalClosing] = useState(false);
  const [isHistoryModalMounted, setIsHistoryModalMounted] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  // --- Add/Edit Form Modal State & Logic ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFormModalClosing, setIsFormModalClosing] = useState(false);
  const [isFormModalMounted, setIsFormModalMounted] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  // --- Open Handlers ---
  const handleCustomerClick = (customer) => {
    setSelectedCustomerForHistory(customer); 
    setIsHistoryModalOpen(true);
    setIsHistoryModalMounted(false);
  };

  const openAddModal = () => {
      setCustomerToEdit(null);
      setIsFormModalOpen(true);
      setIsFormModalMounted(false); 
  };

  const openEditModal = (customer) => {
      setCustomerToEdit(customer);
      setIsFormModalOpen(true);
      setIsFormModalMounted(false);
  };

  // --- Close Handlers (Unified) ---
  const triggerCloseModal = () => {
    if (isHistoryModalOpen) setIsHistoryModalClosing(true);
    if (isFormModalOpen) setIsFormModalClosing(true);
  };

  // --- Effects for Modal Animations & Closing ---
  useEffect(() => {
    if (isHistoryModalClosing) {
      const timer = setTimeout(() => {
        setSelectedCustomerForHistory(null);
        setIsHistoryModalOpen(false);
        setIsHistoryModalClosing(false);
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isHistoryModalClosing]);

  useEffect(() => {
    if (isHistoryModalOpen && !isHistoryModalClosing) {
      const timer = setTimeout(() => setIsHistoryModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
    if (!isHistoryModalOpen && !isHistoryModalClosing) {
      setIsHistoryModalMounted(false);
    }
  }, [isHistoryModalOpen, isHistoryModalClosing]);

  useEffect(() => {
    if (isFormModalClosing) {
      const timer = setTimeout(() => {
        setCustomerToEdit(null);
        setIsFormModalOpen(false);
        setIsFormModalClosing(false);
      }, MODAL_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isFormModalClosing]);

  useEffect(() => {
    if (isFormModalOpen && !isFormModalClosing) {
      const timer = setTimeout(() => setIsFormModalMounted(true), 10);
      return () => clearTimeout(timer);
    }
     if (!isFormModalOpen && !isFormModalClosing) {
      setIsFormModalMounted(false);
    }
  }, [isFormModalOpen, isFormModalClosing]);

  // --- Effect for Debouncing Search Term ---
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // --- Effect for ESC key close (Unified) ---
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && (isHistoryModalOpen || isFormModalOpen)) {
        triggerCloseModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isHistoryModalOpen, isFormModalOpen]);

  // --- Data Fetching ---
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetching data remains the same, including service_orders(count)
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('id, full_name, phone_number, email, address, created_at, service_orders(count)') 
        .order('created_at', { ascending: false }); // Initially fetch newest first for recent list

      if (fetchError) throw fetchError;
      
       // Pre-calculate service count for easier sorting/display
      const customersWithCount = (data || []).map(c => ({
          ...c,
          service_count: c.service_orders?.[0]?.count ?? 0
      }));

      setAllCustomers(customersWithCount);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError(`Gagal memuat data pelanggan: ${err.message}`);
      setAllCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // --- Save Customer Handler ---
  const handleSaveCustomer = async (formData, customerId) => {
      try {
          let result;
          const customerData = {
              full_name: formData.full_name,
              phone_number: formData.phone_number || null,
              email: formData.email || null,
              address: formData.address || null,
              updated_at: new Date(),
          };

          if (customerId) {
              result = await supabase
                  .from('customers')
                  .update(customerData)
                  .eq('id', customerId)
                  .select();
          } else {
              delete customerData.updated_at;
              result = await supabase
                  .from('customers')
                  .insert(customerData)
                  .select();
          }

          const { data: _data, error } = result;

          if (error) throw error;

          setToastMessage(`Pelanggan ${customerId ? 'berhasil diupdate' : 'berhasil ditambahkan'}.`);
          triggerCloseModal();
          fetchCustomers();

      } catch (err) {
          console.error("Error saving customer:", err);
          setToastMessage(`Gagal menyimpan pelanggan: ${err.message}`);
          throw err; 
      }
  };

  // --- Processed Data (Filtering, Sorting, Pagination) ---
  const processedCustomers = useMemo(() => {
    let filteredData = [...allCustomers];

    // Apply Search Filter
    if (debouncedSearchTerm) {
      const lowercasedSearchTerm = debouncedSearchTerm.toLowerCase();
      filteredData = filteredData.filter(customer => 
          (customer.full_name?.toLowerCase().includes(lowercasedSearchTerm)) ||
          (customer.phone_number?.toLowerCase().includes(lowercasedSearchTerm)) ||
          (customer.email?.toLowerCase().includes(lowercasedSearchTerm))
      );
    }

    // Apply Date Filter
    if (dateFilter !== 'Semua') {
      const now = new Date();
      let startDate, endDate;

      if (dateFilter === 'Bulan Ini') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      } else if (dateFilter === 'Bulan Lalu') {
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
      } else if (dateFilter === 'Tahun Ini') {
        startDate = startOfYear(now);
        endDate = endOfYear(now);
      }

      if (startDate && endDate) {
          // Ensure endDate includes the whole day
          endDate.setHours(23, 59, 59, 999);
          filteredData = filteredData.filter(customer => {
          const createdAt = new Date(customer.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }
    }

    // Apply Sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Basic string/number comparison
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

  }, [allCustomers, debouncedSearchTerm, sortConfig, dateFilter]);

  // Calculate Pagination related values
  const totalResults = processedCustomers.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = processedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

   // --- Reset page number when filters/search change --- 
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, dateFilter]); // Added dateFilter dependency

  // --- Summary Stats Calculation ---
   const summaryStats = useMemo(() => {
    const totalCustomers = allCustomers.length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of day
    const newCustomersThisMonth = allCustomers.filter(customer => {
      const createdAt = new Date(customer.created_at);
      return createdAt >= startOfMonth && createdAt <= endOfMonth;
    }).length;
    const totalServices = allCustomers.reduce((sum, customer) => sum + (customer.service_count ?? 0), 0);
    const averageServices = totalCustomers > 0 ? (totalServices / totalCustomers).toFixed(1) : 0;

    return {
      totalCustomers,
      newCustomersThisMonth,
      averageServices,
    };
  }, [allCustomers]);

  // --- Prepare Chart Data (Last 6 Months) ---
  const monthlyChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetDate = subMonths(now, i);
      months.push({
        date: targetDate,
        name: format(targetDate, 'MMM yyyy', { locale: id }), // Format: Jan 2024
        year: getYear(targetDate),
        month: getMonth(targetDate), // 0-indexed month
        count: 0,
      });
    }

    allCustomers.forEach(customer => {
      const createdAt = new Date(customer.created_at);
      const customerYear = getYear(createdAt);
      const customerMonth = getMonth(createdAt);

      const monthData = months.find(m => m.year === customerYear && m.month === customerMonth);
      if (monthData) {
        monthData.count++;
      }
    });

    return months.map(({ name, count }) => ({ name, Pelanggan: count })); // Format for Recharts

  }, [allCustomers]);

   // --- Get Recently Added Customers ---
  const recentCustomers = useMemo(() => {
      // allCustomers is already sorted by created_at descending from fetch
      return allCustomers.slice(0, 5); 
  }, [allCustomers]);

  // --- Handlers ---
  const handleSearchChange = (event) => {
      setSearchTerm(event.target.value);
  };

  const handleDateFilterChange = (event) => {
      setDateFilter(event.target.value);
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } 
    // If different key, always start ascending
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  const handlePageChange = (page) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  };


  return (
    <div className="p-4 md:p-6">
        <Toast 
          message={toastMessage} 
          onClose={() => setToastMessage('')} 
        />

        {/* Summary Cards Section - OK */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
             {/* Card 1 */}
            <div className="bg-white p-5 rounded-lg shadow flex items-center border-l-4 border-sky-500">
              <div className="bg-sky-100 text-sky-600 rounded-full p-3 mr-4">
                <FiUsers className="h-6 w-6"/>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Pelanggan</p>
                <p className="text-3xl font-semibold text-gray-900">{loading ? '-' : summaryStats.totalCustomers}</p>
              </div>
            </div>
             {/* Card 2 */}
            <div className="bg-white p-5 rounded-lg shadow flex items-center border-l-4 border-green-500">
               <div className="bg-green-100 text-green-600 rounded-full p-3 mr-4">
                <FiCalendar className="h-6 w-6"/>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pelanggan Baru (Bulan Ini)</p>
                <p className="text-3xl font-semibold text-gray-900">{loading ? '-' : summaryStats.newCustomersThisMonth}</p>
              </div>
            </div>
            {/* Card 3 */} 
            <div className="bg-white p-5 rounded-lg shadow flex items-center border-l-4 border-orange-500">
               <div className="bg-orange-100 text-orange-600 rounded-full p-3 mr-4">
                <FiTool className="h-6 w-6"/>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Rata-Rata Servis / Pelanggan</p>
                <p className="text-3xl font-semibold text-gray-900">{loading ? '-' : summaryStats.averageServices}</p>
              </div>
            </div>
          </div>
        )}

        {/* --- Main Content Area: Two Columns --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
          
           {/* === Left Column (Table Area) === */} 
           <div className="lg:col-span-2 space-y-6">
                
                {/* Top Bar: Filters & Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                     {/* Filters Group */} 
                     <div className="flex-grow order-2 sm:order-1 flex flex-col sm:flex-row gap-4">
                        {/* Search Input */} 
                        <div className="flex-grow sm:flex-grow-0 sm:max-w-sm">
                            <label htmlFor="customerSearch" className="sr-only">Cari Pelanggan</label>
                            <div className="relative rounded-md ">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    name="customerSearch"
                                    id="customerSearch"
                                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm shadow-sm"
                                    placeholder="Cari Nama, Telepon, Email..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                                 {searchTerm && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-10">
                                        <button type="button" onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[#0ea5e9] rounded-full p-0.5" aria-label="Clear search">
                                            <FiX className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                         {/* Date Filter Dropdown */} 
                         <div className="flex-shrink-0">
                            <label htmlFor="dateFilter" className="sr-only">Filter Tanggal</label>
                             <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiCalendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <select
                                    id="dateFilter"
                                    name="dateFilter"
                                    value={dateFilter}
                                    onChange={handleDateFilterChange}
                                    className="block w-full appearance-none pl-10 pr-8 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] cursor-pointer"
                                >
                                    <option value="Semua">Semua Tanggal</option>
                                    <option value="Bulan Ini">Bulan Ini</option>
                                    <option value="Bulan Lalu">Bulan Lalu</option>
                                    <option value="Tahun Ini">Tahun Ini</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                             </div>
                        </div>
                    </div>
                    {/* Add Customer Button */} 
                    <div className="order-1 sm:order-2 flex-shrink-0">
        <button
                        onClick={openAddModal}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-[#0ea5e9] border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-[#0c8acb] active:bg-[#0c8acb] focus:outline-none focus:border-[#0c8acb] focus:ring ring-[#93c5fd] disabled:opacity-25 transition ease-in-out duration-150 cursor-pointer"
        >
          <FiPlus className="-ml-0.5 mr-2 h-4 w-4 pointer-events-none" />
          Tambah Pelanggan
        </button>
                    </div>
      </div>

                {/* Customer Table Container - Updated loading/empty state */} 
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center px-6 pt-6 pb-4"> 
          <FiUsers className="mr-3 text-gray-500"/> Daftar Pelanggan
        </h2>
                    {/* Use Skeleton Loader during loading state */} 
                    {loading ? (
                        <TableSkeletonLoader rows={5} /> 
                    ) : error ? (
                        <p className="text-center text-red-600 p-10">Error: {error}</p>
                    ) : (
                         /* Render table only when not loading and no error */ 
                        <> 
                            <CustomerTable 
                                customers={paginatedCustomers} 
                                onCustomerClick={handleCustomerClick}
                                onEditClick={openEditModal}
                                isFiltering={!!debouncedSearchTerm}
                                requestSort={requestSort}
                                sortConfig={sortConfig}
                            />
                            {totalPages > 1 && (
                                <PaginationControls 
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </div>
            </div> { /* === End Left Column === */ } 

            {/* === Right Column (Charts & Recent List) === */}
            {/* Added background, padding, rounding for lg screens */}
            <div className="lg:col-span-1 space-y-6 mt-6 lg:mt-0 lg:bg-gray-50/50 lg:p-6 lg:rounded-lg">
                {/* Render Skeletons if main data is loading */}
                {loading ? (
                    <>
                        <RightColumnCardSkeleton />
                        <RightColumnCardSkeleton />
                    </>
                ) : (
                    <> { /* Render actual cards when not loading */ } 
                        {/* New Customers Chart */}
                        <div className="bg-white rounded-lg shadow">
                           <h3 className="text-md font-semibold text-gray-700 mb-0 border-b px-5 py-3"> 
                             Pelanggan Baru (6 Bulan)
                           </h3>
                           <div className="h-64 p-4 flex items-center justify-center">
                               {/* Use shorter loading check here, main loading is handled above */} 
                               {monthlyChartData.some(d => d.Pelanggan > 0) ? (
                                   <ResponsiveContainer width="100%" height="100%">
                                       <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}> 
                                           <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={5}/>
                                           <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30}/>
                                           <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ fontSize: '12px', borderRadius: '4px', padding: '4px 8px' }} formatter={(value) => [value, 'Pelanggan']}/>
                                           <Bar dataKey="Pelanggan" barSize={20} radius={[4, 4, 0, 0]}> 
                                              {monthlyChartData.map((entry, index) => (
                                                 <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#38bdf8' : '#0ea5e9'} /> 
                                             ))}
                                           </Bar>
                                       </BarChart>
                                   </ResponsiveContainer>
                               ) : (
                                  <div className="text-center text-gray-400 italic flex flex-col items-center"> 
                                     <FiBarChart2 className="w-10 h-10 mb-2 text-gray-400"/> 
                                     Belum ada data pelanggan baru. 
                                  </div>
                               )}
                            </div>
                         </div>
                        
                         {/* Recently Added Customers - Updated List Item Style */}
                        <div className="bg-white rounded-lg shadow">
                           <h3 className="text-md font-semibold text-gray-700 mb-0 border-b px-5 py-3"> 
                             Baru Ditambahkan
                           </h3>
                            <div className="p-1">
                                {recentCustomers.length > 0 ? (
                                <ul className="divide-y divide-gray-100">
                                    {recentCustomers.map(customer => (
                                        <li 
                                            key={customer.id} 
                                            className="flex items-center justify-between text-sm px-4 py-2.5 hover:bg-sky-100 focus:outline-none focus:ring-1 focus:ring-sky-300 focus:bg-sky-100 transition-colors duration-150 cursor-pointer rounded"
                                            onClick={() => handleCustomerClick(customer)}
                                            title={`Lihat riwayat ${customer.full_name}`}
                                            tabIndex={0}
                                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCustomerClick(customer)}
                                        >
                                            <div className="flex items-center truncate"> 
                                                 <FiUser className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0"/> 
                                                 <span className="text-gray-800 font-medium truncate pr-2" title={customer.full_name}>{customer.full_name}</span>
                                            </div>
                                            <span className="text-gray-400 text-xs whitespace-nowrap">
                                                {format(new Date(customer.created_at), 'dd MMM', { locale: id })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                ) : (
                                <div className="text-center text-gray-400 italic p-5 flex flex-col items-center"> 
                                    <FiInbox className="w-10 h-10 mb-2 text-gray-400"/> 
                                    Belum ada pelanggan. 
                                </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div> { /* === End Right Column === */ } 

        </div> { /* === End Main Grid === */ } 

        {/* Modals Section - OK outside the grid */}
        {(isHistoryModalOpen || isHistoryModalClosing) && (
            <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isHistoryModalMounted && !isHistoryModalClosing ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={triggerCloseModal}
            >
              {/* ... History modal content ... */} 
              <div 
                className={`transform transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isHistoryModalMounted && !isHistoryModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <CustomerServiceHistoryModal
                  isOpen={isHistoryModalMounted}
                  onClose={triggerCloseModal}
                  customer={selectedCustomerForHistory}
                />
              </div>
            </div>
        )}
        {(isFormModalOpen || isFormModalClosing) && (
            <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isFormModalMounted && !isFormModalClosing ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={triggerCloseModal}
            >
              {/* ... Form modal content ... */} 
              <div 
                className={`transform transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out ${isFormModalMounted && !isFormModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <CustomerFormModal
                  isOpen={isFormModalMounted}
                  onClose={triggerCloseModal}
                  onSave={handleSaveCustomer}
                  customerToEdit={customerToEdit}
                />
              </div>
      </div>
        )}
    </div>
  );
}

export default CustomerPage;