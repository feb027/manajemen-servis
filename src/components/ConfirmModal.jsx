import React from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

function ConfirmModal({ 
  onClose, 
  onConfirm,
  title = "Konfirmasi Tindakan", 
  message = "Apakah Anda yakin ingin melanjutkan? Tindakan ini mungkin tidak dapat diurungkan.", 
  confirmText = "Konfirmasi", 
  cancelText = "Batal",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 focus:ring-red-500", // Default to danger
  isConfirming = false // Optional: to show loading state on confirm button
}) {

  // Parent component handles the conditional rendering and animation wrappers
  // This component just renders the modal content structure

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`bg-white rounded-lg shadow-xl w-full sm:max-w-md flex flex-col overflow-hidden`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Header (Optional, often just includes title and icon) */} 
      <div className="p-5 sm:p-6 flex items-start space-x-4">
        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmButtonClass.includes('red') ? 'bg-red-100' : 'bg-blue-100'} sm:mx-0 sm:h-10 sm:w-10`}>
           {confirmButtonClass.includes('red') ? (
             <FiAlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
           ) : (
             <FiAlertTriangle className="h-6 w-6 text-blue-600" aria-hidden="true" /> // Or another icon for non-danger
           )}
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
           <h3 className="text-lg leading-6 font-medium text-gray-900" id="confirm-modal-title">
             {title}
           </h3>
           <div className="mt-2">
             <p className="text-sm text-gray-500">
               {message}
             </p>
           </div>
         </div>
          <button // Close button top right
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            aria-label="Tutup"
          >
            <FiX className="h-5 w-5" />
          </button>
      </div>

      {/* Footer with Buttons */} 
      <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse bg-gray-50 rounded-b-lg">
        <button
          type="button"
          disabled={isConfirming}
          className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          onClick={onConfirm}
        >
           {isConfirming ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
           ) : null}
           {isConfirming ? 'Memproses...' : confirmText}
        </button>
        <button
          type="button"
          disabled={isConfirming} // Also disable cancel while confirming
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-60"
          onClick={onClose}
        >
          {cancelText}
        </button>
      </div>
    </div>
  );
}

export default ConfirmModal; 