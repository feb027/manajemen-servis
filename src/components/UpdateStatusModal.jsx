// src/components/UpdateStatusModal.jsx
import React, { useState, useEffect } from 'react';
// Added FiUser, FiLoader, FiAlertTriangle - if needed for errors later
import { FiX, FiRefreshCw, FiUser, FiLoader } from 'react-icons/fi';
import { supabase } from '../supabase/supabaseClient';

// Fallback status options if fetch fails
const FALLBACK_STATUS_OPTIONS = ['Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'];

// Helper to get status button styling based on color from database
const getStatusButtonStyle = (statusColor, isSelected) => {
    let baseStyle = 'px-3 py-2 rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    let colorStyle = '';

    // Map database color values to Tailwind classes
    switch (statusColor) {
        case 'blue':
            colorStyle = isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-50';
            break;
        case 'yellow':
            colorStyle = isSelected ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50';
            break;
        case 'orange':
            colorStyle = isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-orange-300 text-orange-700 hover:bg-orange-50';
            break;
        case 'green':
            colorStyle = isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-green-300 text-green-700 hover:bg-green-50';
            break;
        case 'red':
            colorStyle = isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-red-300 text-red-700 hover:bg-red-50';
            break;
        case 'purple':
            colorStyle = isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-purple-300 text-purple-700 hover:bg-purple-50';
            break;
        case 'pink':
            colorStyle = isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-pink-300 text-pink-700 hover:bg-pink-50';
            break;
        case 'indigo':
            colorStyle = isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50';
            break;
        case 'teal':
            colorStyle = isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-teal-300 text-teal-700 hover:bg-teal-50';
            break;
        case 'gray':
        default:
            colorStyle = isSelected ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50';
    }
    
    const focusRing = `focus:ring-[#0ea5e9]`;
    return `${baseStyle} ${colorStyle} ${focusRing}`;
};

// Revert props: Remove isOpen, isClosing. Rename onConfirm back to onUpdate if that was original.
// Need to check ReceptionistDashboard usage to confirm original prop names.
// Assuming original props were: order, currentStatus, onClose, onUpdate
function UpdateStatusModal({ order, onClose, onConfirm }) { // Keep onConfirm for now as Technician uses it
  // Initialize state based on passed order prop
  const [newStatus, setNewStatus] = useState(order?.status || 'Baru');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // State for dynamic status options from database
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Fetch status options from database
  useEffect(() => {
    const fetchStatusOptions = async () => {
      setLoadingStatuses(true);
      try {
        const { data, error } = await supabase
          .from('service_statuses')
          .select('name, color')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setStatusOptions(data);
        } else {
          // Use fallback if no data
          setStatusOptions(FALLBACK_STATUS_OPTIONS.map(name => ({ 
            name, 
            color: name === 'Baru' ? 'blue' : name === 'Diproses' ? 'yellow' : name === 'Menunggu Spare Part' ? 'orange' : name === 'Selesai' ? 'green' : 'red'
          })));
        }
      } catch (error) {
        console.error("Error fetching status options:", error);
        // Use fallback on error
        setStatusOptions(FALLBACK_STATUS_OPTIONS.map(name => ({ 
          name, 
          color: name === 'Baru' ? 'blue' : name === 'Diproses' ? 'yellow' : name === 'Menunggu Spare Part' ? 'orange' : name === 'Selesai' ? 'green' : 'red'
        })));
      } finally {
        setLoadingStatuses(false);
      }
    };

    fetchStatusOptions();
  }, []); // Fetch once on mount 

  // Reset state if the order prop changes while modal is conceptually open
  // This relies on the PARENT re-rendering the modal with a new order object
  useEffect(() => {
      if (order) {
          setNewStatus(order.status || 'Baru');
          setSubmitError('');
          setIsSubmitting(false);
      }
  }, [order]); // Dependency on the order object itself

  const handleConfirmClick = async () => {
      setIsSubmitting(true);
      setSubmitError('');
      try {
          // Prepare update data
          const updateData = { status: newStatus };
          
          // Auto-start work time when status changes to "Diproses"
          if (newStatus === 'Diproses' && !order.actual_start_time) {
              updateData.actual_start_time = new Date().toISOString();
          }
          
          // Auto-complete work time when status changes to "Selesai"
          if (newStatus === 'Selesai' && order.actual_start_time && !order.actual_completion_time) {
              const startTime = new Date(order.actual_start_time);
              const endTime = new Date();
              const durationHours = (endTime - startTime) / (1000 * 60 * 60);
              
              updateData.actual_completion_time = endTime.toISOString();
              updateData.actual_duration_hours = durationHours;
          }
          
          // Use the passed handler (onConfirm or potentially onUpdate)
          await onConfirm(order.id, newStatus, updateData); 
      } catch (error) {
          console.error("Error updating status:", error);
          setSubmitError(`Gagal update: ${error.message || 'Terjadi kesalahan'}`);
      } finally {
         setIsSubmitting(false);
      }
  };

  // Original early return
  if (!order) return null;

  // Original root div structure (no wrappers)
  return (
    <div
      className="bg-white rounded-lg shadow-xl w-full sm:max-w-md flex flex-col" // Original classes
      // Removed onClick stopPropagation 
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
        <h2 id="status-title" className="text-lg font-semibold text-gray-800 flex items-center">
            <FiRefreshCw className="h-5 w-5 mr-2 text-[#0ea5e9]"/>
            Update Status Order #{String(order.id)?.substring(0, 8)}
        </h2>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9]" aria-label="Tutup">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
         <fieldset className="border border-gray-200 rounded-md p-3 pt-2 bg-gray-50">
             <legend className="text-sm font-medium text-gray-600 px-1">Pelanggan</legend>
             <div className="mt-1 flex items-center text-sm">
                 <FiUser className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0"/>
                 <span className='font-medium text-gray-800 truncate'>{order.customer_name}</span>
             </div>
        </fieldset>
         <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Status Baru:</label>
             {loadingStatuses ? (
               <div className="flex items-center justify-center py-8">
                 <FiLoader className="animate-spin h-5 w-5 text-gray-400 mr-2" />
                 <span className="text-sm text-gray-500">Memuat status...</span>
               </div>
             ) : (
               <div className="grid grid-cols-2 gap-3">
                 {statusOptions.map(statusObj => (
                   <button
                     key={statusObj.name}
                     type="button"
                     onClick={() => setNewStatus(statusObj.name)}
                     className={getStatusButtonStyle(statusObj.color, statusObj.name === newStatus)}
                     disabled={isSubmitting}
                   >
                     {statusObj.name}
                   </button>
                 ))}
               </div>
             )}
         </div>
         {submitError && (
            <p className="text-xs text-red-600 text-center">{submitError}</p>
         )}
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-lg flex-shrink-0">
        <button
          type="button" onClick={onClose} disabled={isSubmitting}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ea5e9] disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleConfirmClick}
          // Use order?.status directly for comparison
          disabled={isSubmitting || newStatus === (order?.status || 'Baru')} 
          className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0ea5e9] hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#93c5fd] disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-100 ease-in-out active:scale-95"
        >
          {isSubmitting && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />} 
          {isSubmitting ? 'Menyimpan...' : 'Update Status'}
        </button>
      </div>
    </div>
  );
}

export default UpdateStatusModal;