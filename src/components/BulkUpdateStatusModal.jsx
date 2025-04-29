// src/components/BulkUpdateStatusModal.jsx
import React, { useState } from 'react';
import { FiX, FiRefreshCw, FiLoader, FiAlertTriangle } from 'react-icons/fi';

// Align status options with the database CHECK constraint
const STATUS_OPTIONS = ['Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'];

// Reusing the button style function from UpdateStatusModal (Consider moving to utils)
const getStatusButtonStyle = (status, currentSelection) => {
    let baseStyle = 'px-3 py-2 rounded-md border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    let colorStyle = '';
    const isSelected = status === currentSelection;

    // Use status directly, no need for toLowerCase() if options array is correct case
    switch (status) {
        case 'Baru':
            colorStyle = isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-50'; break;
        // Changed 'dikerjakan' to 'Diproses'
        case 'Diproses':
            colorStyle = isSelected ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'; break;
        // Added 'Menunggu Spare Part'
        case 'Menunggu Spare Part':
            colorStyle = isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-orange-300 text-orange-700 hover:bg-orange-50'; break;
        case 'Selesai':
            colorStyle = isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-green-300 text-green-700 hover:bg-green-50'; break;
        case 'Dibatalkan':
            colorStyle = isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-red-300 text-red-700 hover:bg-red-50'; break;
        default:
             colorStyle = isSelected ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50';
    }
    const focusRing = `focus:ring-[#0ea5e9]`;
    return `${baseStyle} ${colorStyle} ${focusRing}`;
};


function BulkUpdateStatusModal({ selectedCount, onClose, onUpdate }) {
  const [newStatus, setNewStatus] = useState(''); // Start with no status selected
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleUpdateClick = async () => {
      if (!newStatus) {
          setSubmitError("Silakan pilih status baru.");
          return;
      }
      setIsSubmitting(true);
      setSubmitError('');
      try {
          // onUpdate comes from the parent (ReceptionistDashboard)
          // and already knows which orders are selected
          await onUpdate(newStatus);
          // Parent will close the modal on success via triggerCloseBulkStatusModal
      } catch (error) {
          // Error handling might be better handled by parent showing a toast
          console.error("Error in bulk update process:", error);
          setSubmitError(`Gagal update: ${error.message || 'Terjadi kesalahan'}`);
          // Optionally keep modal open on error by not calling onClose
      } finally {
         setIsSubmitting(false);
      }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-xl w-full sm:max-w-sm flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
        <h2 id="bulk-status-title" className="text-lg font-semibold text-gray-800 flex items-center">
            <FiRefreshCw className="h-5 w-5 mr-2 text-yellow-500"/>
            Bulk Update Status ({selectedCount} Order)
        </h2>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9]" aria-label="Tutup">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
         <p className='text-sm text-gray-600 text-center'>Pilih status baru untuk diterapkan ke <strong>{selectedCount}</strong> order yang dipilih.</p>
         {/* Status Selection Buttons */}
         <div>
             <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Pilih Status Baru:</label>
             <div className="grid grid-cols-2 gap-3">
                 {STATUS_OPTIONS.map(status => (
                   <button
                     key={status}
                     type="button"
                     onClick={() => { setNewStatus(status); setSubmitError(''); }} // Clear error on selection
                     className={getStatusButtonStyle(status, newStatus)}
                     disabled={isSubmitting}
                   >
                     {status}
                   </button>
                 ))}
             </div>
         </div>

         {/* Display submission error if any */}
         {submitError && (
            <div className="flex items-center justify-center mt-2 p-2 text-xs text-red-700 bg-red-50 rounded border border-red-200">
                <FiAlertTriangle className="h-4 w-4 mr-1.5"/>
                {submitError}
            </div>
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
          onClick={handleUpdateClick}
          disabled={isSubmitting || !newStatus} // Disable if no status is selected
          className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0ea5e9] hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#93c5fd] disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-100 ease-in-out active:scale-95"
        >
          {isSubmitting && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />}
          {isSubmitting ? 'Menyimpan...' : `Update ${selectedCount} Order`}
        </button>
      </div>
    </div>
  );
}

export default BulkUpdateStatusModal;