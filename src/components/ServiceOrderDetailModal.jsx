// src/components/ServiceOrderDetailModal.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FiX, FiUser, FiPhone, FiMail, FiCalendar, FiTag, FiClipboard, FiTool, FiDollarSign, FiArchive, FiEdit3, FiInfo, FiPrinter, FiClock, FiActivity, FiCheckSquare, FiPlusCircle, FiUserCheck, FiMessageSquare, FiPaperclip, FiLoader } from 'react-icons/fi';
import { supabase } from '../supabase/supabaseClient';
import TimeEstimationDisplay from './TimeEstimationDisplay';

// Helper to format date/time
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// Helper to format currency (basic)
const formatCurrency = (value) => {
  if (value == null) return 'N/A';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

// Status display with more prominence
const displayStatus = (status) => {
  const currentStatus = status || 'Baru';
  let colorClass = 'bg-gray-100 text-gray-800';
  switch (currentStatus.toLowerCase()) {
    case 'baru': colorClass = 'bg-blue-100 text-blue-800'; break;
    case 'diproses': colorClass = 'bg-yellow-100 text-yellow-800'; break;
    case 'menunggu spare part': colorClass = 'bg-orange-100 text-orange-800'; break;
    case 'selesai': colorClass = 'bg-green-100 text-green-800'; break;
    case 'dibatalkan': colorClass = 'bg-red-100 text-red-800'; break;
  }
  // Adjusted padding/font size slightly
  return <span className={`px-3 py-1 rounded-md text-xs font-semibold ${colorClass}`}>{currentStatus}</span>;
};

// Detail Item Component with Icon and improved empty state
function DetailItem({ label, value, icon, className = '', preserveWhitespace = false }) {
  const IconComponent = icon;
  const displayValue = value || <span className="text-gray-400 italic text-xs">Tidak ada data</span>;
  return (
    <div className={`mb-2 ${className}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center mb-1">
         {IconComponent && <IconComponent className="h-3.5 w-3.5 mr-1.5 text-gray-400" />}
         {label}
      </p>
      <p className={`text-base text-gray-800 break-words ${preserveWhitespace ? 'whitespace-pre-wrap' : ''}`}>{displayValue}</p>
    </div>
  );
}

// --- Helper Function to Render Log Entry ---
const renderLogEntry = (log, users = []) => {
  const user = users.find(u => u.id === log.user_id);
  const userName = user ? user.full_name : 'Sistem';
  const time = formatDateTime(log.created_at);
  let message = 'Aksi tidak diketahui';
  let Icon = FiActivity;

  switch (log.event_type) {
    case 'CREATED':
      message = `Order dibuat oleh ${userName}.`;
      Icon = FiPlusCircle;
      break;
    case 'STATUS_CHANGED':
      // Handle both old/new and old_status/new_status formats
      {
        const oldStatus = log.details?.old || log.details?.old_status || 'N/A';
        const newStatus = log.details?.new || log.details?.new_status || 'N/A';
        
        // Skip if both are N/A or same (duplicate logs)
        if (oldStatus === 'N/A' && newStatus === 'N/A') {
          return null;
        }
        
        message = `Status diubah dari "${oldStatus}" menjadi "${newStatus}" oleh ${userName}.`;
        Icon = FiCheckSquare;
      }
      break;
    case 'TECHNICIAN_ASSIGNED':
      {
        const oldTechId = log.details?.old_id;
        const newTechId = log.details?.new_id || log.details?.technician_id;
        const newTech = users.find(u => u.id === newTechId);
        const newTechName = newTech ? newTech.full_name : 'Tidak Ada';
        
        if (oldTechId) {
          const oldTech = users.find(u => u.id === oldTechId);
          const oldTechName = oldTech ? oldTech.full_name : 'Sebelumnya';
          message = `Teknisi diganti dari ${oldTechName} menjadi ${newTechName} oleh ${userName}.`;
        } else {
          message = `Teknisi ${newTechName} ditugaskan oleh ${userName}.`;
        }
        Icon = FiUserCheck;
      }
      break;
    case 'COST_UPDATED':
      message = `Biaya servis diubah dari ${formatCurrency(log.details?.old)} menjadi ${formatCurrency(log.details?.new)} oleh ${userName}.`;
      Icon = FiDollarSign;
      break;
    case 'NOTES_UPDATED':
      message = `Catatan servis diperbarui oleh ${userName}.`;
      Icon = FiMessageSquare;
      break;
    case 'PARTS_UPDATED':
      message = `Sparepart digunakan diperbarui oleh ${userName}.`;
      Icon = FiTool;
      break;
    case 'DETAILS_EDITED':
      message = `Detail order (perangkat/keluhan) diedit oleh ${userName}.`;
      Icon = FiEdit3;
      break;
    default:
      message = `Event: ${log.event_type} oleh ${userName}.`;
  }

  return (
    <li key={log.id} className="mb-3 ml-6 flex items-start">
      <span className="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -left-3 ring-4 ring-white">
        <Icon className="w-3 h-3 text-gray-600" />
      </span>
      <div className="ml-2 flex-1">
          <p className="text-sm font-normal text-gray-700 leading-tight">{message}</p>
          <time className="block text-xs font-normal leading-none text-gray-400 mt-0.5">{time}</time>
      </div>
    </li>
  );
};
// --- End Log Entry Renderer ---

// Revert props: Remove isOpen, isClosing
function ServiceOrderDetailModal({ order: initialOrder, technicians = [], onClose }) { 
  const componentRef = useRef();
  
  // State for current order data (can be refreshed)
  const [order, setOrder] = useState(initialOrder);
  const [setLoadingOrder] = useState(false);
  
  // ... state for logs ...
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  
  // Function to refresh order data
  const refreshOrderData = async () => {
    if (!order?.id) return;
    
    console.log('[ServiceOrderDetailModal] Refreshing order data for ID:', order.id);
    setLoadingOrder(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', order.id)
        .single();
        
      if (error) throw error;
      console.log('[ServiceOrderDetailModal] Order data refreshed:', data);
      setOrder(data);
    } catch (err) {
      console.error("Error refreshing order data:", err);
    } finally {
      setLoadingOrder(false);
    }
  };
  
  // Update order state when initialOrder prop changes and fetch fresh data
  useEffect(() => {
    console.log('[ServiceOrderDetailModal] initialOrder changed:', initialOrder?.id);
    setOrder(initialOrder);
    // Fetch fresh data when modal opens
    if (initialOrder?.id) {
      // Small delay to ensure database write has completed
      const timer = setTimeout(() => {
        refreshOrderData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialOrder?.id]); // eslint-disable-line react-hooks/exhaustive-deps 

  // ... handlePrint hook ...
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Order-${String(order?.id ?? '').substring(0, 8)}-${order?.customer_name?.replace(/\s+/g, '_') || 'Service'}`,
  });

  // ... fetchLogsAndUsers effect ...
  useEffect(() => {
    if (!order?.id) return; 
    const fetchLogsAndUsers = async () => {
        setLoadingLogs(true);
        setLogsError(null);
        try {
            // Fetch logs
            const { data: logData, error: logFetchError } = await supabase
              .from('service_order_logs_backup')
              .select('*') 
              .eq('service_order_id', order.id)
              .order('created_at', { ascending: false });
            if (logFetchError) throw logFetchError;
            setLogs(logData || []);

            // Fetch all users for name mapping
            const { data: userData, error: userFetchError } = await supabase
              .from('users')
              .select('id, full_name, email');
            if (userFetchError) throw userFetchError;
            
            // Combine with technicians
            let usersMap = new Map();
            technicians.forEach(t => usersMap.set(t.id, t)); 
            userData?.forEach(u => {
              if (!usersMap.has(u.id)) {
                usersMap.set(u.id, u);
              }
            });
            setAllUsers(Array.from(usersMap.values()));
          } catch (err) {
            console.error("Error fetching order logs or users:", err);
            setLogsError(`Gagal memuat riwayat: ${err.message}`);
            setLogs([]);
          } finally {
            setLoadingLogs(false);
          }
    };
    fetchLogsAndUsers();
  }, [order?.id, technicians]);

  // ... technicianName calculation ...
  const technicianName = useMemo(() => {
      if (!order?.assigned_technician_id || !technicians || technicians.length === 0) {
          return 'Belum Ditugaskan';
      }
      const tech = technicians.find(t => t.id === order.assigned_technician_id);
      return tech ? tech.full_name : `ID: ${order.assigned_technician_id}`;
  }, [order?.assigned_technician_id, technicians]);

  // Revert: Remove transition/visibility logic, original early return
  if (!order) return null;

  // Revert: Remove outer modal wrappers and transition classes
  return (
    // Original root div - Remove h-full, add max-h for scroll
    <div
      className="bg-white rounded-lg shadow-xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col print:shadow-none print:border print:border-gray-300 overflow-hidden"
    >
      {/* Header - Keep updated layout if desired */}
      <div className="flex justify-between items-center p-4 px-5 border-b bg-gray-50 rounded-t-lg flex-shrink-0 gap-4 print:hidden">
         <h2 id="order-detail-title" className="text-lg font-semibold text-gray-800 flex items-center">
            <FiInfo className="h-5 w-5 mr-2 text-[#0ea5e9] flex-shrink-0"/> 
            <span className="truncate">Detail Order: {order.customer_name} - {order.device_type}</span>
         </h2>
         <div className="flex items-center gap-3 flex-shrink-0">
            {displayStatus(order.status)} 
            <button
               type="button" onClick={onClose}
               className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9]"
               aria-label="Tutup"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
      </div>

      {/* Body - Keep content, ensure ref is present */}
      <div ref={componentRef} className="p-4 md:p-5 flex-1 overflow-y-auto print:p-6 print:overflow-visible">
          {/* ... existing content of the modal body ... */}
          <h1 className="text-xl font-bold text-center mb-4 hidden print:block">
              Bukti Terima Servis - Order #{String(order.id)?.substring(0, 8)}
          </h1>
          <div className="text-center mb-4 hidden print:block">
              Status: {displayStatus(order.status)}
          </div>
          {/* Customer & Device Info */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 mb-3">
              <section className="mb-2 md:mb-0 md:border-r md:pr-6 border-gray-200">
                   <h3 className="text-sm font-semibold text-[#0ea5e9] border-b pb-1 mb-2 flex items-center"><FiUser className="h-4 w-4 mr-2"/> Informasi Pelanggan</h3>
                   <DetailItem label="Nama" value={order.customer_name} icon={FiUser}/>
                   <DetailItem label="Kontak" value={order.customer_contact} icon={FiPhone}/>
              </section>
              <section>
                   <h3 className="text-sm font-semibold text-[#0ea5e9] border-b pb-1 mb-2 flex items-center"><FiArchive className="h-4 w-4 mr-2"/> Informasi Perangkat</h3>
                   <DetailItem label="Jenis Perangkat" value={order.device_type} icon={FiArchive}/>
                   <DetailItem label="Merk / Model" value={order.brand_model} icon={FiTag}/>
                   <DetailItem label="Nomor Seri" value={order.serial_number} icon={FiTag}/>
              </section>
          </div>
          {/* Service Details & Timestamps */} 
          <section className="mt-3 pt-3 border-t border-gray-200">
               <h3 className="text-sm font-semibold text-[#0ea5e9] border-b pb-1 mb-2 flex items-center"><FiClipboard className="h-4 w-4 mr-2"/> Detail Servis & Riwayat Waktu</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0">
                   <DetailItem label="Keluhan Pelanggan" value={order.customer_complaint} icon={FiEdit3} className="md:col-span-2 lg:col-span-3" preserveWhitespace={true}/>
                   <DetailItem label="Catatan Servis" value={order.notes} icon={FiEdit3} className="md:col-span-2 lg:col-span-3" preserveWhitespace={true}/>
                   <DetailItem label="Sparepart Digunakan" value={order.parts_used} icon={FiTool} className="lg:col-span-2" preserveWhitespace={true}/>
                   <DetailItem label="Biaya Servis" value={formatCurrency(order.cost)} icon={FiDollarSign}/>
                   <DetailItem label="Teknisi" value={technicianName} icon={FiUserCheck}/> {/* Corrected icon */}
                   <DetailItem label="Tanggal Masuk" value={formatDateTime(order.created_at)} icon={FiCalendar}/>
                   <DetailItem label="Terakhir Update" value={formatDateTime(order.updated_at)} icon={FiClock}/>
               </div>
          </section>
          
          {/* Time Estimation Section */}
          <section className="mt-4 pt-4 border-t border-gray-200 print:hidden">
            <TimeEstimationDisplay 
              order={order} 
              onUpdate={refreshOrderData} 
            />
          </section>
          
          {/* Order History Section */} 
           <section className="mt-4 pt-4 border-t border-gray-200 print:border-t-0">
               <h3 className="text-sm font-semibold text-[#0ea5e9] border-b pb-1 mb-3 flex items-center"><FiClock className="h-4 w-4 mr-2"/> Riwayat Order</h3>
                {loadingLogs && <div className="flex items-center justify-center text-gray-500 py-4"><FiLoader className="animate-spin h-4 w-4 mr-2"/> Memuat riwayat...</div>}
                {logsError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">Error: {logsError}</p>}
                {!loadingLogs && !logsError && logs.length === 0 && <p className="text-sm text-gray-500 italic">Belum ada riwayat untuk order ini.</p>}
                {!loadingLogs && !logsError && logs.length > 0 && (
                  <ol className="relative border-l border-gray-200 ml-3">
                    {logs.map(log => renderLogEntry(log, allUsers)).filter(Boolean)}
                  </ol>
                )}
           </section>
           {/* Printed signature area */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-400 hidden print:block">
               <div className="flex justify-between items-start">
                   <div><p className="text-sm mb-10">Tanda Terima Pelanggan,</p><p className="text-sm">(..............................)</p></div>
                   <div className="text-right"><p className="text-sm mb-10">Diterima Oleh,</p><p className="text-sm">(..............................)</p></div>
               </div>
               <p className="text-xs text-center mt-6 text-gray-500">Terima kasih telah menggunakan jasa kami.</p>
           </div>
      </div>

      {/* Footer - Keep updated layout if desired */}
      <div className="flex justify-between items-center space-x-3 p-4 px-5 bg-gray-50 border-t rounded-b-lg flex-shrink-0 print:hidden">
         <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 active:scale-95"
         >
            <FiPrinter className="h-4 w-4 mr-2"/> Cetak
         </button>
         <button
           type="button" onClick={onClose}
           className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ea5e9]"
         > Tutup </button>
      </div>
    </div>
  );
}

export default ServiceOrderDetailModal;