// src/components/UpdateStatusModal.jsx
import React, { useState, useEffect } from 'react';
// Added FiUser, FiLoader, FiAlertTriangle - if needed for errors later
import { FiX, FiRefreshCw, FiUser, FiLoader } from 'react-icons/fi';

// Align status options with the database CHECK constraint
const STATUS_OPTIONS = ['Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'];

// Helper to get status button styling
const getStatusButtonStyle = (status, currentSelection) => {
    let baseStyle = 'px-3 py-2 rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    let colorStyle = '';
    const isSelected = status === currentSelection;

    // Use status directly, no need for toLowerCase() if options array is correct case
    switch (status) {
        case 'Baru':
            colorStyle = isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-50';
            break;
        // Changed 'dikerjakan' to 'Diproses'
        case 'Diproses':
            colorStyle = isSelected ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50';
            break;
        // Added 'Menunggu Spare Part' - using orange color scheme
        case 'Menunggu Spare Part':
             colorStyle = isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-orange-300 text-orange-700 hover:bg-orange-50';
            break;
        case 'Selesai':
            colorStyle = isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-green-300 text-green-700 hover:bg-green-50';
            break;
        case 'Dibatalkan':
            colorStyle = isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-red-300 text-red-700 hover:bg-red-50';
            break;
        default:
             colorStyle = isSelected ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50';
    }
    // Add focus ring color matching the theme
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
          // Use the passed handler (onConfirm or potentially onUpdate)
          await onConfirm(order.id, newStatus); 
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
             <div className="grid grid-cols-2 gap-3">
                 {STATUS_OPTIONS.map(status => (
                   <button
                     key={status}
                     type="button"
                     onClick={() => setNewStatus(status)}
                     className={getStatusButtonStyle(status, newStatus)}
                     disabled={isSubmitting}
                   >
                     {status}
                   </button>
                 ))}
             </div>
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