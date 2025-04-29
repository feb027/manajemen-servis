import React, { useState, useEffect } from 'react';
import { FiX, FiClipboard, FiTool, FiUser, FiSmartphone, FiSave, FiLoader } from 'react-icons/fi';

const MODAL_ANIMATION_DURATION = 300; // Consistent duration

function TechnicianEditModal({ order, isOpen, isClosing, onClose, onSave }) {
  const [notes, setNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Populate state when modal opens or order changes
  useEffect(() => {
    if (isOpen && order) {
      setNotes(order.notes || '');
      setPartsUsed(order.parts_used || '');
      setSubmitError('');
      setIsSubmitting(false);
    } else if (!isOpen && !isClosing) {
      // Optional: Clear state when fully closed if needed, though useEffect above handles repopulation
      // setNotes('');
      // setPartsUsed('');
    }
  }, [isOpen, isClosing, order]);

  const handleSaveClick = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      // Call the onSave prop passed from the parent dashboard
      await onSave(order.id, { notes: notes, parts_used: partsUsed });
      // Parent (Dashboard) is responsible for closing the modal on success
    } catch (error) {
      console.error("Error saving technician edits:", error);
      setSubmitError(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Basic check: If no order, don't render content. Parent handles visibility.
  if (!order) return null;

  return (
    /* Inner wrapper is now the top-level element returned */
    <div
      className={`bg-white rounded-lg shadow-xl w-full sm:max-w-lg flex flex-col overflow-hidden`}
      style={{ maxHeight: '90vh' }} // Keep max height constraint
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-edit-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0 bg-gray-50">
        <h2 id="tech-edit-title" className="text-lg font-semibold text-gray-800 flex items-center">
          <FiClipboard className="h-5 w-5 mr-2 text-blue-600"/>
          Edit Catatan/Sparepart - Order #{String(order.id)?.substring(0, 8)}
        </h2>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400" aria-label="Tutup">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {/* Display basic order info for context - Added background and title */}
         <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Detail Order</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                 <div className="flex items-center text-gray-600">
                     <FiUser className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0"/>
                     <span className="text-gray-500 mr-1">Pelanggan:</span>
                     <span className='font-medium text-gray-800 truncate' title={order.customer_name}>{order.customer_name}</span>
                 </div>
                 <div className="flex items-center text-gray-600">
                     <FiSmartphone className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0"/>
                     <span className="text-gray-500 mr-1">Perangkat:</span>
                     <span className='font-medium text-gray-800 truncate' title={`${order.device_type} - ${order.brand_model}`}>{order.device_type} - {order.brand_model}</span>
                </div>
             </div>
         </div>

        {/* Notes Input */}
        <div>
          <label htmlFor="technicianNotes" className="block text-sm font-medium text-gray-700 mb-1">Catatan Servis Teknisi</label>
          <textarea
            id="technicianNotes"
            name="technicianNotes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
            placeholder="Masukkan catatan diagnosis, perbaikan, kendala, dll."
          />
        </div>

        {/* Parts Used Input */}
        <div>
          <label htmlFor="partsUsed" className="block text-sm font-medium text-gray-700 mb-1">Sparepart Digunakan</label>
          <textarea
            id="partsUsed"
            name="partsUsed"
            rows={3}
            value={partsUsed}
            onChange={(e) => setPartsUsed(e.target.value)}
            disabled={isSubmitting}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
            placeholder="Contoh: LCD x1, Baterai x1"
          />
        </div>

        {submitError && (
          <p className="text-xs text-red-600 text-center">{submitError}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-lg flex-shrink-0">
        <button
          type="button" 
          onClick={onClose} 
          disabled={isSubmitting}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSubmitting}
          className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-100 ease-in-out active:scale-95"
        >
          {isSubmitting && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />} 
          {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan'}
        </button>
      </div>
    </div> /* End Inner Wrapper / Top-level element */
  ); // Ensure this closing parenthesis for return is present
} // Ensure this closing brace for the function is present

export default TechnicianEditModal; 