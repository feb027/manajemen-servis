// src/components/AssignTechnicianModal.jsx
import React, { useState } from 'react';
import { FiX, FiUser, FiTool, FiUserPlus, FiPackage, FiAlertTriangle, FiLoader } from 'react-icons/fi';

function AssignTechnicianModal({ order, technicians = [], isLoading = false, onAssign, onClose }) {
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Local submitting state
  const [validationError, setValidationError] = useState(''); // State for inline validation

  const handleAssignClick = async () => {
    setValidationError(''); // Clear previous error
    if (!selectedTechId) {
      // alert("Silakan pilih teknisi."); // Basic validation
      setValidationError("Silakan pilih teknisi terlebih dahulu."); // Set inline error
      return;
    }
    setIsSubmitting(true);
    try {
        await onAssign(order.id, selectedTechId); // Call parent handler
        // Parent handler should close modal on success
    } catch (error) {
        // Handle potential errors from the onAssign prop if needed
        console.error("Error during assignment:", error);
        setValidationError("Gagal menugaskan teknisi. Coba lagi."); // Show error in modal
    } finally {
        setIsSubmitting(false);
    }
  };

  // Handle select change, clear validation error
  const handleSelectChange = (e) => {
      setSelectedTechId(e.target.value);
      setValidationError('');
  };

  if (!order) return null;

  return (
    <div
      className="bg-white rounded-lg shadow-xl w-full sm:max-w-md overflow-y-auto flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10 flex-shrink-0">
        <h2 id="assign-title" className="text-lg font-semibold text-gray-800 flex items-center">
            <FiUserPlus className="h-5 w-5 mr-2 text-[#0ea5e9]"/>
            Tugaskan Teknisi Order #{String(order.id)?.substring(0, 8)}
        </h2>
        <button type="button" onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9]" aria-label="Tutup">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1">
         {/* Grouped Order Info */}
         <fieldset className="border border-gray-200 rounded-md p-3 pt-2 bg-gray-50">
             <legend className="text-sm font-medium text-gray-600 px-1">Detail Order</legend>
             <div className="mt-1 space-y-1 text-sm">
                 <p className="flex items-center">
                     <FiUser className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0"/>
                     <span className="text-gray-600 mr-1">Pelanggan:</span>
                     <span className='font-medium text-gray-800 truncate'>{order.customer_name}</span>
                 </p>
                 <p className="flex items-center">
                      <FiPackage className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0"/>
                     <span className="text-gray-600 mr-1">Perangkat:</span>
                     <span className='font-medium text-gray-800 truncate'>{order.device_type} - {order.brand_model}</span>
                 </p>
             </div>
         </fieldset>

         {/* Technician Selection */}
         <div>
             <label htmlFor="techSelect" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                 <FiTool className="w-4 h-4 mr-1 text-gray-500"/>
                 Pilih Teknisi:
             </label>
             {isLoading ? (
                 <div className="flex items-center text-sm text-gray-500 bg-gray-100 p-2 rounded-md">
                     <FiLoader className="animate-spin h-4 w-4 mr-2"/> Memuat teknisi...
                 </div>
             ) : technicians.length === 0 ? (
                  <div className="flex items-center text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                       <FiAlertTriangle className="h-4 w-4 mr-2"/> Tidak ada teknisi tersedia.
                  </div>
             ) : (
                 <div className="relative rounded-md shadow-sm">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <FiUser className="h-5 w-5 text-gray-400" />
                     </div>
                     <select
                         id="techSelect"
                         value={selectedTechId}
                         onChange={handleSelectChange}
                         className="block w-full pl-10 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm appearance-none"
                         required
                         disabled={isSubmitting}
                         aria-describedby={validationError ? "tech-error" : undefined}
                     >
                         <option value="" disabled>-- Pilih Teknisi --</option>
                         {technicians.map(tech => (
                         <option key={tech.id} value={tech.id}>
                             {tech.full_name || tech.id} {/* Show name or ID */}
                         </option>
                         ))}
                     </select>
                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                         <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                     </div>
                 </div>
             )}
             {validationError && (
                 <p id="tech-error" className="mt-1 text-xs text-red-600 flex items-center">
                     <FiAlertTriangle className="h-3 w-3 mr-1"/> {validationError}
                 </p>
             )}
         </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-lg sticky bottom-0 z-10 flex-shrink-0">
        <button
          type="button" onClick={onClose} disabled={isSubmitting}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ea5e9] disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleAssignClick}
          disabled={isLoading || technicians.length === 0 || !selectedTechId || isSubmitting}
          className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0ea5e9] hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#93c5fd] disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-100 ease-in-out active:scale-95"
        >
          {isSubmitting && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />}
          {isSubmitting ? 'Menugaskan...' : 'Tugaskan'}
        </button>
      </div>
    </div>
  );
}

export default AssignTechnicianModal;