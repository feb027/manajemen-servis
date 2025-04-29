// src/components/EditOrderForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FiX, FiUser, FiPhone, FiPackage, FiTag, FiAlignLeft, FiLoader, FiAlertTriangle, FiDollarSign, FiTool } from 'react-icons/fi';

// Reusing initial state structure, but will be populated by orderData
const initialFormData = {
  deviceType: '',
  brandModel: '',
  serialNumber: '',
  customerComplaint: '',
  cost: '',
  notes: '',
  partsUsed: '',
};

// Edit form only receives the order data and a close handler
function EditOrderForm({ orderData, onClose }) {
  const [formData, setFormData] = useState(initialFormData);
  const [otherDeviceType, setOtherDeviceType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Populate form when orderData is available
  useEffect(() => {
    if (orderData) {
      // Check if deviceType is one of the standard options or other
      const standardTypes = ['Laptop', 'PC', 'Printer', 'Monitor'];
      const isOther = !standardTypes.includes(orderData.device_type);

      setFormData({
        deviceType: isOther ? 'Lainnya' : (orderData.device_type || ''),
        brandModel: orderData.brand_model || '',
        serialNumber: orderData.serial_number || '',
        customerComplaint: orderData.customer_complaint || '',
        cost: orderData.cost ?? '',
        notes: orderData.notes || '',
        partsUsed: orderData.parts_used || '',
      });
      if (isOther) {
        setOtherDeviceType(orderData.device_type || '');
      } else {
        setOtherDeviceType('');
      }
    }
  }, [orderData]); // Rerun if orderData changes (though typically modal remounts)

  // Handle changes for editable fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cost' && value !== '' && !/^[0-9]*$/.test(value)) {
        return;
    }

    setFormData(prevData => ({ ...prevData, [name]: value }));
    if (name === 'deviceType' && value !== 'Lainnya') {
      setOtherDeviceType('');
    }
    setError(null);
  };

  const handleOtherDeviceChange = (e) => {
    setOtherDeviceType(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderData || !orderData.id) {
      setError("Data order tidak valid untuk diedit.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const finalDeviceType = formData.deviceType === 'Lainnya'
                              ? otherDeviceType
                              : formData.deviceType;

    // --- Validation ---
    if (formData.deviceType === 'Lainnya' && !otherDeviceType.trim()) {
      setError('Harap masukkan jenis perangkat lainnya.');
      setIsLoading(false);
      return;
    }
     if (!formData.brandModel.trim()) {
         setError("Merk/Model perangkat harus diisi.");
         setIsLoading(false); return;
     }
     if (!formData.customerComplaint.trim()) {
         setError("Keluhan pelanggan harus diisi.");
          setIsLoading(false); return;
     }
    // --- End Validation ---

    const dataToUpdate = {
      // Fields allowed to be edited by receptionist
      device_type: finalDeviceType,
      brand_model: formData.brandModel,
      serial_number: formData.serialNumber || null,
      customer_complaint: formData.customerComplaint,
      cost: formData.cost === '' ? null : Number(formData.cost),
      notes: formData.notes || null,
      parts_used: formData.partsUsed || null,
      // Add other editable fields like 'notes', 'parts_used', 'cost' if applicable
      // Status is updated via the dedicated status modal
    };

    try {
      console.log(`Attempting to update order ${orderData.id}:`, dataToUpdate);
      const { error: updateError } = await supabase
        .from('service_orders')
        .update(dataToUpdate)
        .eq('id', orderData.id); // Match the specific order ID

      if (updateError) {
        throw updateError;
      }

      console.log('Order successfully updated.');
      // Maybe show a temporary success message *before* closing?
      onClose(true); // Call onClose provided by parent, pass true to indicate success

    } catch (err) {
      console.error('Error updating service order:', err);
      setError(`Gagal mengupdate order: ${err.message || 'Terjadi kesalahan.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!orderData) return null; // Should not happen if modal logic is correct

  return (
    // Removed h-full from form again
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Loading Overlay */}
      {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <FiLoader className="animate-spin h-8 w-8 text-[#0ea5e9]" />
          </div>
      )}

      {/* Scrollable Body */}
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h2 id="edit-modal-title" className="text-xl font-semibold text-gray-800">Edit Order Servis #{String(orderData.id)?.substring(0,8)}</h2>
             {onClose && (
                 <button type="button" onClick={() => onClose(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9]" aria-label="Tutup">
                    <FiX className="h-5 w-5" />
                 </button>
             )}
        </div>

        {/* Error Message Placeholder - Implement actual alert later */}
        {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-start" role="alert">
                <FiAlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">{error}</p>
            </div>
        )}

        {/* Display Customer Info (Read Only) */}
        <fieldset className="mb-4 border border-gray-200 rounded-md p-4 pt-2 bg-gray-50">
             <legend className="text-sm font-medium text-gray-600 px-1">Informasi Pelanggan (Read Only)</legend>
             <div className="mt-2 space-y-2">
                 <p className="text-sm"><span className="font-medium text-gray-700">Nama:</span> {orderData.customer_name}</p>
                 <p className="text-sm"><span className="font-medium text-gray-700">Kontak:</span> {orderData.customer_contact}</p>
             </div>
        </fieldset>

         {/* --- Device & Complaint Info (Editable) --- */}
         <fieldset className="mb-4 border border-gray-200 rounded-md p-4 pt-2">
            <legend className="text-sm font-medium text-gray-600 px-1">Informasi Servis</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mt-2">
                {/* Device Type (Potentially spanning cols if 'Lainnya') */} 
                <div className={`${formData.deviceType === 'Lainnya' ? 'md:col-span-2' : ''}`}> 
                    <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">Jenis Perangkat</label>
                    <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiPackage className="h-5 w-5 text-gray-400" /></div>
                        <select id="deviceType" name="deviceType" value={formData.deviceType} onChange={handleChange} required className="block w-full pl-10 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm appearance-none" disabled={isLoading}>
                            <option value="">Pilih Jenis Perangkat</option>
                            <option value="Laptop">Laptop</option>
                            <option value="PC">PC (Desktop)</option>
                            <option value="Printer">Printer</option>
                            <option value="Monitor">Monitor</option>
                            <option value="Lainnya">Lainnya...</option>
                        </select>
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"> 
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                         </div>
                    </div>
                     {/* Conditional Other Device Input - Now appears below if span-2 */}
                    {formData.deviceType === 'Lainnya' && (
                        <div className="mt-2"> {/* Add margin top */} 
                            <label htmlFor="otherDeviceType" className="sr-only">Jenis Perangkat Lainnya</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiPackage className="h-4 w-4 text-gray-400" /></div>
                                <input type="text" id="otherDeviceType" name="otherDeviceType" value={otherDeviceType} onChange={handleOtherDeviceChange} required={formData.deviceType === 'Lainnya'} disabled={isLoading} className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" placeholder="Masukkan jenis perangkat"/>
                            </div>
                        </div>
                    )}
                </div>

                {/* Brand/Model */}
                 {/* Only show if device type is not 'Lainnya' taking full width */} 
                <div className={`${formData.deviceType === 'Lainnya' ? 'hidden' : ''}`}> 
                    <label htmlFor="brandModel" className="block text-sm font-medium text-gray-700 mb-1">Merk / Model</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiTag className="h-5 w-5 text-gray-400" /></div>
                        <input type="text" id="brandModel" name="brandModel" value={formData.brandModel} onChange={handleChange} required disabled={isLoading} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm" />
                    </div>
                </div>

                {/* Serial Number */} 
                <div>
                     <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">Nomor Seri <span className="text-xs text-gray-500">(Opsional)</span></label>
                     <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiTag className="h-5 w-5 text-gray-400" /></div>
                        <input type="text" id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleChange} disabled={isLoading} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm" />
                     </div>
                </div>

                {/* Cost Field */} 
                <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">Biaya Servis (Opsional)</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-sm">Rp</span></div>
                        <input type="number" id="cost" name="cost" value={formData.cost} onChange={handleChange} min="0" step="1000" disabled={isLoading} className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0"/>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><FiDollarSign className="h-5 w-5 text-gray-400" /></div>
                    </div>
                </div>

                {/* Complaint - Span 2 cols */} 
                <div className="md:col-span-2">
                     <label htmlFor="customerComplaint" className="block text-sm font-medium text-gray-700 mb-1">Keluhan Pelanggan</label>
                    <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 top-0 pt-2 pl-3 flex items-start pointer-events-none"><FiAlignLeft className="h-5 w-5 text-gray-400" /></div>
                        <textarea id="customerComplaint" name="customerComplaint" rows="2" value={formData.customerComplaint} onChange={handleChange} required disabled={isLoading} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"></textarea>
                    </div>
                </div>
                {/* Notes - Span 2 cols */} 
                <div className="md:col-span-2">
                     <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Catatan Servis <span className="text-xs text-gray-500">(Opsional)</span></label>
                    <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 top-0 pt-2 pl-3 flex items-start pointer-events-none"><FiAlignLeft className="h-5 w-5 text-gray-400" /></div>
                        <textarea id="notes" name="notes" rows="2" value={formData.notes} onChange={handleChange} disabled={isLoading} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"></textarea>
                    </div>
                </div>
                {/* Parts Used - Span 2 cols */} 
                <div className="md:col-span-2">
                     <label htmlFor="partsUsed" className="block text-sm font-medium text-gray-700 mb-1">Sparepart Digunakan <span className="text-xs text-gray-500">(Opsional)</span></label>
                    <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 top-0 pt-2 pl-3 flex items-start pointer-events-none"><FiTool className="h-5 w-5 text-gray-400" /></div>
                        <textarea id="partsUsed" name="partsUsed" rows="2" value={formData.partsUsed} onChange={handleChange} disabled={isLoading} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"></textarea>
                    </div>
                </div>
            </div>
        </fieldset>

      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-lg flex-shrink-0">
           <button
              type="button" onClick={() => onClose(false)} disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ea5e9] disabled:opacity-50 cursor-pointer"
            > Batal </button>
            <button
              type="submit" disabled={isLoading}
              className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0ea5e9] hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#93c5fd] disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-100 ease-in-out active:scale-95 cursor-pointer"
            >
              {isLoading && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />}
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
       </div>
    </form>
  );
}

export default EditOrderForm;