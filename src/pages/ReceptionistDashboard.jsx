import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ServiceOrderForm from '../components/ServiceOrderForm';
import ServiceOrderTable from '../components/ServiceOrderTable';
import ServiceOrderDetailModal from '../components/ServiceOrderDetailModal';
import Toast from '../components/Toast';
import { supabase } from '../supabase/supabaseClient';
import { FiPlus, FiFileText, FiAlertCircle, FiTool, FiSearch, FiFilter, FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertTriangle, FiArchive, FiDollarSign, FiCalendar, FiTrash2 } from 'react-icons/fi';
import Pagination from '../components/Pagination';
import AssignTechnicianModal from '../components/AssignTechnicianModal';
import UpdateStatusModal from '../components/UpdateStatusModal';
import EditOrderForm from '../components/EditOrderForm';
import BulkUpdateStatusModal from '../components/BulkUpdateStatusModal';
import OrderStatusPieChart from '../components/OrderStatusPieChart';
import RecentActivityFeed from '../components/RecentActivityFeed';
import ConfirmationModal from '../components/ConfirmationModal';

function StatCard({ title, value, isLoading, icon, colorClass = 'bg-[#0ea5e9]', borderColorClass = 'border-[#0ea5e9]' }) {
  const IconComponent = icon;
  return (
    <div className={`bg-white p-5 rounded-lg shadow border-t-4 ${borderColorClass} flex flex-col justify-between transition-transform duration-200 ease-in-out hover:scale-[1.03]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {isLoading ? (
              <span className="inline-block w-12 h-6 bg-gray-200 rounded animate-pulse"></span>
            ) : (
              value
            )}
          </p>
        </div>
        <div className={`rounded-full p-3 ${colorClass} text-white shadow-md -mt-2`}>
          <IconComponent className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = ['Semua', 'Baru', 'Dikerjakan', 'Selesai', 'Dibatalkan'];
const ITEMS_PER_PAGE = 10;
const MODAL_ANIMATION_DURATION = 300;

// Helper for formatting currency
const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return 'Rp0'; // Default to Rp0 without space
  // Format number first, then prepend Rp
  const numberFormatted = Number(value).toLocaleString('id-ID'); 
  return `Rp${numberFormatted}`; // Prepend Rp without space
};

function ReceptionistDashboard() {
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [technicians, setTechnicians] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalClosing, setIsAddModalClosing] = useState(false);
  const [isAddModalMounted, setIsAddModalMounted] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalClosing, setIsDetailModalClosing] = useState(false);
  const [isDetailModalMounted, setIsDetailModalMounted] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isAssignModalClosing, setIsAssignModalClosing] = useState(false);
  const [isAssignModalMounted, setIsAssignModalMounted] = useState(false);
  const [orderToUpdateStatus, setOrderToUpdateStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusModalClosing, setIsStatusModalClosing] = useState(false);
  const [isStatusModalMounted, setIsStatusModalMounted] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalClosing, setIsEditModalClosing] = useState(false);
  const [isEditModalMounted, setIsEditModalMounted] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkStatusModalClosing, setIsBulkStatusModalClosing] = useState(false);
  const [isBulkStatusModalMounted, setIsBulkStatusModalMounted] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isDeleteConfirmModalClosing, setIsDeleteConfirmModalClosing] = useState(false);

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setIsAddModalMounted(false);
  };
  const openDetailModal = (order) => {
      setSelectedOrder(order);
      setIsDetailModalMounted(false);
  };
  const openAssignModal = (order) => {
      if (!loadingTechnicians && technicians.length > 0) {
          setOrderToAssign(order);
          setAssignModalOpen(true);
          setIsAssignModalMounted(false);
      } else if (loadingTechnicians) {
          setToastMessage("Sedang memuat data teknisi, silakan tunggu...");
      } else {
          setToastMessage("Tidak ada teknisi yang tersedia untuk ditugaskan.");
      }
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
  const openDeleteConfirmModal = (order) => {
    setOrderToDelete(order);
    setIsDeleteConfirmModalOpen(true);
    setIsDeleteConfirmModalClosing(false);
  };

  const triggerCloseModal = () => {
      console.log('[ReceptionistDashboard] triggerCloseModal called');
      if (isAddModalOpen) setIsAddModalClosing(true);
      if (selectedOrder) setIsDetailModalClosing(true);
      if (assignModalOpen) setIsAssignModalClosing(true);
      if (isStatusModalOpen) setIsStatusModalClosing(true);
      if (isEditModalOpen) setIsEditModalClosing(true);
      if (isBulkStatusModalOpen) setIsBulkStatusModalClosing(true);
      if (isDeleteConfirmModalOpen && !isDeleteConfirmModalClosing) {
        console.log('[ReceptionistDashboard] Setting isDeleteConfirmModalClosing = true');
        setIsDeleteConfirmModalClosing(true);
      }
  };

  useEffect(() => {
      if (isAddModalClosing) {
          const timer = setTimeout(() => {
              setIsAddModalOpen(false);
              setIsAddModalClosing(false);
          }, MODAL_ANIMATION_DURATION);
          return () => clearTimeout(timer);
      }
  }, [isAddModalClosing]);
  useEffect(() => {
    if (isDetailModalClosing) {
        const timer = setTimeout(() => {
            setSelectedOrder(null);
            setIsDetailModalClosing(false);
        }, MODAL_ANIMATION_DURATION);
        return () => clearTimeout(timer);
    }
  }, [isDetailModalClosing]);
  useEffect(() => {
    if (isAssignModalClosing) {
        const timer = setTimeout(() => {
            setOrderToAssign(null);
            setAssignModalOpen(false);
            setIsAssignModalClosing(false);
        }, MODAL_ANIMATION_DURATION);
        return () => clearTimeout(timer);
    }
  }, [isAssignModalClosing]);
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
      if (isAddModalOpen && !isAddModalClosing) {
          const timer = setTimeout(() => setIsAddModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
      if (!isAddModalOpen && !isAddModalClosing) {
          setIsAddModalMounted(false);
      }
  }, [isAddModalOpen, isAddModalClosing]);

  useEffect(() => {
      if (selectedOrder && !isDetailModalClosing) {
          const timer = setTimeout(() => setIsDetailModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
      if (!selectedOrder && !isDetailModalClosing) {
          setIsDetailModalMounted(false);
      }
  }, [selectedOrder, isDetailModalClosing]);

  useEffect(() => {
      if (assignModalOpen && !isAssignModalClosing) {
          const timer = setTimeout(() => setIsAssignModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
      if (!assignModalOpen && !isAssignModalClosing) {
          setIsAssignModalMounted(false);
      }
  }, [assignModalOpen, isAssignModalClosing]);

  useEffect(() => {
      if (isStatusModalOpen && !isStatusModalClosing) {
          const timer = setTimeout(() => setIsStatusModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
       if (!isStatusModalOpen && !isStatusModalClosing) {
          setIsStatusModalMounted(false);
      }
  }, [isStatusModalOpen, isStatusModalClosing]);

  useEffect(() => {
      if (isEditModalOpen && !isEditModalClosing) {
          const timer = setTimeout(() => setIsEditModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
       if (!isEditModalOpen && !isEditModalClosing) {
          setIsEditModalMounted(false);
      }
  }, [isEditModalOpen, isEditModalClosing]);

  useEffect(() => {
    if (isBulkStatusModalClosing) {
        const timer = setTimeout(() => {
            setIsBulkStatusModalOpen(false);
            setIsBulkStatusModalClosing(false);
        }, MODAL_ANIMATION_DURATION);
        return () => clearTimeout(timer);
    }
  }, [isBulkStatusModalClosing]);

  useEffect(() => {
    if (isBulkStatusModalOpen && !isBulkStatusModalClosing) {
        const timer = setTimeout(() => setIsBulkStatusModalMounted(true), 10);
        return () => clearTimeout(timer);
    }
    if (!isBulkStatusModalOpen && !isBulkStatusModalClosing) {
        setIsBulkStatusModalMounted(false);
    }
  }, [isBulkStatusModalOpen, isBulkStatusModalClosing]);

  useEffect(() => {
    if (isDeleteConfirmModalClosing) {
        console.log('[ReceptionistDashboard] Delete modal closing effect started (starting timer)');
        const timer = setTimeout(() => {
            console.log('[ReceptionistDashboard] Timeout finished - Setting isDeleteConfirmModalOpen = false');
            setOrderToDelete(null);
            setIsDeleteConfirmModalOpen(false);
            setIsDeleteConfirmModalClosing(false);
        }, MODAL_ANIMATION_DURATION);
        return () => {
          console.log('[ReceptionistDashboard] Clearing delete modal close timer');
          clearTimeout(timer);
        };
    }
  }, [isDeleteConfirmModalClosing]);

  const openBulkStatusModal = () => {
    if (selectedOrderIds.size === 0) return;
    setIsBulkStatusModalOpen(true);
    setIsBulkStatusModalMounted(false);
  };

  const fetchOrders = async () => {
    console.log("fetchOrders started...");
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('service_orders')
        .select(`
          id, customer_name, customer_contact, device_type, brand_model, 
          serial_number, customer_complaint, status, notes, parts_used, cost, 
          created_at, updated_at, assigned_technician_id, created_by_receptionist_id,
          customer_id 
        `)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      console.log("fetchOrders query successful.");
      setServiceOrders(data || []);
    } catch (err) {
      console.error("Error fetching service orders:", err);
      setError(`Gagal memuat data order: ${err.message}`);
      setServiceOrders([]);
    } finally {
      console.log("fetchOrders finished (in finally block).");
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      const { data, error } = await supabase.from('users').select('id, full_name').eq('role', 'technician').order('full_name', { ascending: true });
      if (error) throw error;
      setTechnicians(data || []);
    } catch (err) {
      console.error("Error fetching technicians:", err);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchTechnicians();
    const handleEsc = (event) => { if (event.keyCode === 27) triggerCloseModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleOrderAdded = async () => {
    setSelectedOrderIds(new Set());
    triggerCloseModal();
    setToastMessage('Order servis berhasil ditambahkan!');
  };

  const handleConfirmAssignment = async (orderId, technicianId) => {
    if (!orderId || !technicianId) {
      setError("Error: Order ID atau Teknisi ID tidak valid saat penugasan.");
      return;
    }

    setError(null);
    setToastMessage('');

    console.log(`Attempting to assign technician ${technicianId} to order ${orderId}`);

    try {
      // Update only the technician ID and add .select() to get returned data
      const { data: updatedData, error: updateError } = await supabase
        .from('service_orders')
        .update({ 
            assigned_technician_id: technicianId, 
            updated_at: new Date()
        })
        .eq('id', orderId)
        .select('id, assigned_technician_id') // <<< ADD THIS LINE
        .maybeSingle(); // Use maybeSingle in case update affects 0 rows (e.g., RLS blocks)

      if (updateError) {
          console.error("Supabase update error during assignment:", updateError); 
          throw updateError; // Throw error to be caught by catch block
      }

      // Log the data returned after update attempt
      console.log("Data returned after update attempt:", updatedData);

      // Check if the returned data actually has the new technician ID
      if (!updatedData || updatedData.assigned_technician_id !== technicianId) {
          console.error("Update seemed successful but returned data doesn't match or is null. RLS or Trigger likely culprit.");
          // Throw a more specific error if the update didn't stick
          throw new Error("Gagal menyimpan penugasan teknisi ke database. Periksa RLS atau Trigger.");
      }

      const assignedTechnician = technicians.find(t => t.id === technicianId);
      setToastMessage(`Order ${orderId} berhasil ditugaskan ke ${assignedTechnician?.full_name || 'Teknisi Terpilih'}.`);
      triggerCloseModal();

    } catch (err) {
      console.error("Error assigning technician:", err);
      setError(`Gagal menugaskan teknisi: ${err.message}`); 
    }
  };

  const handleConfirmStatusUpdate = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;

    const originalOrder = serviceOrders.find(o => o.id === orderId);
    if (!originalOrder) {
        console.error("Original order not found for status update:", orderId);
        setError('Gagal update status: Order tidak ditemukan.');
        triggerCloseModal(); // Close modal even if order not found
        return;
    }

    // VALIDATION: Prevent status change from 'Baru' if no technician assigned
    if (originalOrder.status === 'Baru' && newStatus !== 'Baru' && !originalOrder.assigned_technician_id) {
        console.warn(`Validation failed: Cannot change status from 'Baru' for order ${orderId} without assigned technician.`);
        // Use setError for validation failures to show error toast
        setError('Tugaskan teknisi terlebih dahulu sebelum mengubah status dari "Baru".'); 
        triggerCloseModal(); 
        return; // Stop the update process
    }

    console.log(`Updating status for order ${orderId} to ${newStatus}`);
    try {
        const { error: updateDbError } = await supabase.from('service_orders').update({ status: newStatus, updated_at: new Date() }).eq('id', orderId);
        if (updateDbError) throw updateDbError; // Throw Supabase error to catch block
        setToastMessage('Status order berhasil diperbarui!'); // Use setToastMessage for success
        triggerCloseModal();
    } catch (err) {
         console.error("Error updating status:", err);
         // Use setError for actual update errors
         setError(`Gagal update status: ${err.message}`); 
         triggerCloseModal(); 
    }
  };

  const handleEditFormClose = (refreshNeeded) => {
      triggerCloseModal();
      if (refreshNeeded) {
          setToastMessage('Order berhasil diperbarui!');
      }
  }

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    const orderIdToDelete = orderToDelete.id;
    console.log(`Attempting to delete order ${orderIdToDelete}`);
    try {
      const { error: logError } = await supabase
        .from('service_order_logs')
        .delete()
        .eq('service_order_id', orderIdToDelete);
        
      if (logError) {
        console.error("Error deleting related service order logs:", logError);
        throw new Error(`Gagal menghapus log terkait: ${logError.message}`); 
      }
      console.log(`Successfully deleted logs for order ${orderIdToDelete}`);

      const { error: deleteError } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', orderIdToDelete);

      if (deleteError) throw deleteError;

      setToastMessage(`Order #${orderIdToDelete} berhasil dihapus.`);
      triggerCloseModal();
    } catch (err) {
      console.error("Error deleting order:", err);
      setError(`Gagal menghapus order #${orderIdToDelete}: ${err.message}`);
      triggerCloseModal();
    }
  };

  const stats = useMemo(() => {
    const total = serviceOrders.length;
    // Use capitalized keys matching the actual status values
    const statsByStatus = {
      'Baru': 0,
      'Diproses': 0,
      'Menunggu Spare Part': 0,
      'Selesai': 0,
      'Dibatalkan': 0
    };
    // Calculate totals for each status
    serviceOrders.forEach(o => {
        const status = o.status || 'Baru'; // Default to Baru if null
        if (Object.hasOwn(statsByStatus, status)) {
            statsByStatus[status]++;
        }
    });

    // Calculate new stats: Revenue and Orders Completed Today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let totalRevenue = 0;
    let ordersCompletedToday = 0;
    serviceOrders.forEach(o => {
        if (o.status === 'Selesai') {
            totalRevenue += o.cost || 0; // Sum cost for completed orders
             if (o.updated_at?.startsWith(today)) { // Check if updated_at is today
                ordersCompletedToday++;
             }
        }
    });

    return { 
        total,
        ...statsByStatus, // Spread the counts by status
        totalRevenue, 
        ordersCompletedToday
     };
  }, [serviceOrders]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSearchChange = (e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
      setStatusFilter(e.target.value);
      setCurrentPage(1);
  };

  const sortedAndFilteredOrders = useMemo(() => {
    let sortableItems = [...serviceOrders];
    sortableItems = sortableItems.filter(order => {
        const customerMatch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'Semua' || (order.status || 'Baru').toLowerCase() === statusFilter.toLowerCase();
        return customerMatch && statusMatch;
    });
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'status') {
          aValue = aValue || 'Baru';
          bValue = bValue || 'Baru';
        }
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [serviceOrders, searchTerm, statusFilter, sortConfig]);

  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const lastPageIndex = firstPageIndex + ITEMS_PER_PAGE;
    return sortedAndFilteredOrders.slice(firstPageIndex, lastPageIndex);
  }, [sortedAndFilteredOrders, currentPage]);

  const handleRowClick = (order) => openDetailModal(order);

  const handleAssign = (order) => {
      console.log("Assign clicked for order:", order.id);
      openAssignModal(order);
  };

  const handleUpdateStatus = (order) => openStatusModal(order);

  const handleEdit = (order) => openEditModal(order);

  const handleDelete = (order) => openDeleteConfirmModal(order);

  useEffect(() => {
      console.log("Setting up Supabase subscription...");
      const handleRealtimeUpdate = (payload) => {
          console.log('Realtime event received:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          setServiceOrders(currentOrders => {
              let updatedOrders = [...currentOrders];
              if (eventType === 'INSERT') {
                  console.log('Handling INSERT');
                  if (!updatedOrders.some(order => order.id === newRecord.id)) {
                      updatedOrders = [newRecord, ...updatedOrders]; 
                  }
              } else if (eventType === 'UPDATE') {
                   console.log('Handling UPDATE');
                  updatedOrders = updatedOrders.map(order => order.id === newRecord.id ? newRecord : order );
              } else if (eventType === 'DELETE') {
                  console.log('Handling DELETE');
                  updatedOrders = updatedOrders.filter(order => order.id !== oldRecord.id );
              }
              return updatedOrders;
          });
      };
      const channel = supabase.channel('service-orders-channel')
          .on('postgres_changes',{ event: '*', schema: 'public', table: 'service_orders' }, handleRealtimeUpdate)
          .subscribe((status, err) => {
               if (err) {
                   console.error('Supabase subscription error:', err);
                   setError('Gagal terhubung ke pembaruan real-time.');
               } else {
                   console.log('Supabase subscription status:', status);
               }
           });
      return () => {
          console.log("Removing Supabase subscription...");
          supabase.removeChannel(channel);
      };
  }, [supabase]);

  const handleSelectRow = useCallback((orderId, isSelected) => {
    setSelectedOrderIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (isSelected) {
        newSelectedIds.add(orderId);
      } else {
        newSelectedIds.delete(orderId);
      }
      return newSelectedIds;
    });
  }, []);

  const handleSelectAll = useCallback((isSelected) => {
    setSelectedOrderIds(prevSelectedIds => {
        const newSelectedIds = new Set(prevSelectedIds);
        currentTableData.forEach(order => {
            if (isSelected) {
                newSelectedIds.add(order.id);
            } else {
                newSelectedIds.delete(order.id);
            }
        });
        return newSelectedIds;
    });
  }, [currentTableData, selectedOrderIds]);

  const handleConfirmBulkStatusUpdate = async (newStatus) => {
      const idsToUpdate = Array.from(selectedOrderIds);
      if (idsToUpdate.length === 0 || !newStatus) return;

      console.log(`Bulk updating status for orders ${idsToUpdate.join(', ')} to ${newStatus}`);
      try {
          const { error } = await supabase
              .from('service_orders')
              .update({ status: newStatus })
              .in('id', idsToUpdate);

          if (error) throw error;

          setToastMessage(`${idsToUpdate.length} order berhasil diperbarui statusnya!`);
          setSelectedOrderIds(new Set());
          triggerCloseBulkStatusModal();
      } catch (err) {
           console.error("Error bulk updating status:", err);
           setError(`Gagal update status ${idsToUpdate.length} order: ${err.message}`);
           triggerCloseBulkStatusModal();
      }
  };

  const triggerCloseBulkStatusModal = () => {
    setIsBulkStatusModalClosing(true);
  };

  return (
    <div className="p-4 md:p-6 relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div className="md:col-span-1">
            <StatCard 
              title="Total Orders Aktif"
              value={loading ? '-' : stats.total - (stats.Selesai ?? 0) - (stats.Dibatalkan ?? 0)}
              isLoading={loading} 
              icon={FiFileText} 
              colorClass="bg-indigo-500"
              borderColorClass="border-indigo-500"
            />
         </div>
          <div className="md:col-span-1">
              <StatCard 
                  title="Pendapatan Total (Selesai)"
                  value={loading ? '-' : formatCurrency(stats.totalRevenue)}
                  isLoading={loading}
                  icon={FiDollarSign}
                  colorClass="bg-green-500"
                  borderColorClass="border-green-500"
              />
          </div>
          <div className="md:col-span-1">
               <StatCard 
                  title="Selesai Hari Ini"
                  value={loading ? '-' : stats.ordersCompletedToday}
                  isLoading={loading}
                  icon={FiCalendar}
                  colorClass="bg-teal-500"
                  borderColorClass="border-teal-500"
                />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          <div className="lg:col-span-3">
              <div className="mb-4 flex justify-between items-center">
                 <div className={`transition-opacity duration-300 ${selectedOrderIds.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <button
                         onClick={openBulkStatusModal}
                         disabled={selectedOrderIds.size === 0}
                         className="inline-flex items-center px-3 py-2 border border-yellow-300 rounded-md shadow-sm text-xs font-medium text-yellow-800 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           <FiRefreshCw className="h-4 w-4 mr-1.5"/>
                           Update Status ({selectedOrderIds.size})
                       </button>
                 </div>

                 <button
                    onClick={openAddModal}
                    className="inline-flex items-center px-4 py-2 bg-[#0ea5e9] border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-[#0c8acb] active:bg-[#0c8acb] focus:outline-none focus:border-[#0c8acb] focus:ring ring-[#93c5fd] disabled:opacity-25 transition ease-in-out duration-150 cursor-pointer"
                    >
                    <FiPlus className="-ml-0.5 mr-2 h-4 w-4 pointer-events-none" />
                    Tambah Order Baru
                 </button>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-gray-800 whitespace-nowrap">Daftar Order Servis</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                       <div className="relative w-full sm:w-auto">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiSearch className="h-4 w-4 text-gray-400" /></div>
                          <input type="text" placeholder="Cari nama pelanggan..." value={searchTerm} onChange={handleSearchChange} className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"/>
                       </div>
                        <div className="relative w-full sm:w-auto">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiFilter className="h-4 w-4 text-gray-400" /></div>
                          <select value={statusFilter} onChange={handleStatusFilterChange} className="block w-full pl-9 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm appearance-none">
                             {STATUS_OPTIONS.map(status => (<option key={status} value={status}>{status}</option>))} 
                          </select>
                           <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" /></svg></div>
                       </div>
                    </div>
                 </div>
                 
                 {loading && <p className="text-center text-gray-500 py-4">Memuat tabel...</p>}
                 {error && !loading && 
                    <div className="flex items-center justify-center p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                       <FiAlertTriangle className="w-5 h-5 mr-3"/>
                       <span>Error memuat data: {error}</span> 
                    </div>
                 }
                 {!loading && (
                    <ServiceOrderTable 
                        orders={currentTableData} 
                        technicians={technicians}
                        selectedOrderIds={selectedOrderIds} 
                        onSelectRow={handleSelectRow}     
                        onSelectAll={handleSelectAll}   
                        onRowClick={handleRowClick} 
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        onAssignClick={handleAssign}
                        onStatusUpdateClick={handleUpdateStatus}
                        onEditClick={handleEdit}
                        onDeleteClick={handleDelete}
                    />
                 )}
                 {!loading && !error && sortedAndFilteredOrders.length === 0 && serviceOrders.length > 0 && (
                     <p className="text-center text-gray-500 py-4">Tidak ada order yang cocok.</p>
                 )}
                 {!loading && !error && serviceOrders.length === 0 && (
                      <p className="text-center text-gray-500 py-4">Belum ada order servis.</p>
                 )}
                 {!loading && !error && sortedAndFilteredOrders.length > ITEMS_PER_PAGE && (
                     <Pagination currentPage={currentPage} totalCount={sortedAndFilteredOrders.length} pageSize={ITEMS_PER_PAGE} onPageChange={page => setCurrentPage(page)}/>
                 )}
              </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
               <OrderStatusPieChart stats={stats} isLoading={loading} />
               <RecentActivityFeed limit={5} technicians={technicians} />
          </div>

      </div>

      {(isAddModalOpen || isAddModalClosing) && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
          <div className={`fixed inset-0 bg-[rgba(0,0,0,0.3)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isAddModalMounted && !isAddModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseModal} aria-hidden="true"></div>
          <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isAddModalMounted && !isAddModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}>
            {isAddModalOpen && <ServiceOrderForm onClose={triggerCloseModal} onOrderAdded={handleOrderAdded}/>}
          </div>
        </div>
      )}
      {(selectedOrder || isDetailModalClosing) && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
           <div className={`fixed inset-0 bg-[rgba(0,0,0,0.3)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isDetailModalMounted && !isDetailModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseModal} aria-hidden="true"></div>
           <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isDetailModalMounted && !isDetailModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}>
             {selectedOrder && <ServiceOrderDetailModal order={selectedOrder} technicians={technicians} onClose={triggerCloseModal}/>}
          </div>
        </div>
      )}
      {(assignModalOpen || isAssignModalClosing) && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-labelledby="assign-title">
            <div className={`fixed inset-0 bg-[rgba(0,0,0,0.3)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isAssignModalMounted && !isAssignModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseModal} aria-hidden="true"></div>
             <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isAssignModalMounted && !isAssignModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}>
               {assignModalOpen && <AssignTechnicianModal order={orderToAssign} technicians={technicians} isLoading={loadingTechnicians} onAssign={handleConfirmAssignment} onClose={triggerCloseModal}/>}
            </div>
          </div>
      )}
      {(isStatusModalOpen || isStatusModalClosing) && (
           <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-labelledby="status-title">
             <div className={`fixed inset-0 bg-[rgba(0,0,0,0.3)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isStatusModalMounted && !isStatusModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseModal} aria-hidden="true"></div>
              <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-sm max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isStatusModalMounted && !isStatusModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}> 
               {isStatusModalOpen && <UpdateStatusModal order={orderToUpdateStatus} currentStatus={orderToUpdateStatus?.status} onConfirm={handleConfirmStatusUpdate} onClose={triggerCloseModal}/>}
            </div>
          </div>
      )}
      {(isEditModalOpen || isEditModalClosing) && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
             <div className={`fixed inset-0 bg-[rgba(0,0,0,0.3)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isEditModalMounted && !isEditModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseModal} aria-hidden="true"></div>
             <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isEditModalMounted && !isEditModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}> 
                {isEditModalOpen && <EditOrderForm orderData={orderToEdit} onClose={handleEditFormClose} />} 
             </div>
         </div>
      )}
      {(isBulkStatusModalOpen || isBulkStatusModalClosing) && (
           <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-labelledby="bulk-status-title">
             <div className={`fixed inset-0 bg-[rgba(0,0,0,0.3)] transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${ isBulkStatusModalMounted && !isBulkStatusModalClosing ? 'opacity-100' : 'opacity-0' }`} onClick={triggerCloseBulkStatusModal} aria-hidden="true"></div>
              <div className={`relative z-10 transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out w-full sm:max-w-sm max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl ${ isBulkStatusModalMounted && !isBulkStatusModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95' }`} onClick={(e) => e.stopPropagation()}> 
               {isBulkStatusModalOpen && (
                 <BulkUpdateStatusModal
                   selectedCount={selectedOrderIds.size}
                   onUpdate={handleConfirmBulkStatusUpdate}
                   onClose={triggerCloseBulkStatusModal}
                 />
               )}
            </div>
          </div>
      )}
      {(isDeleteConfirmModalOpen || isDeleteConfirmModalClosing) && (
           <ConfirmationModal
             isOpen={isDeleteConfirmModalOpen}
             onClose={triggerCloseModal}
             onConfirm={handleConfirmDelete}
             title="Konfirmasi Hapus Order"
             message={`Anda yakin ingin menghapus permanen Order Servis #${orderToDelete?.id} (${orderToDelete?.customer_name} - ${orderToDelete?.device_type})? Tindakan ini tidak dapat dibatalkan dan akan menghapus log terkait.`}
             confirmText="Ya, Hapus"
             cancelText="Batal"
             confirmButtonVariant="danger"
             icon={FiTrash2}
           />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage('')} type="success" />
      )}
       {error && (
           <Toast message={error} onClose={() => setError(null)} type="error" />
       )}
    </div>
  );
}

export default ReceptionistDashboard;