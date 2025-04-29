import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSave, FiLoader, FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

function CustomerFormModal({ isOpen, onClose, onSave, customerToEdit }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    address: '', // Added address field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const nameInputRef = useRef(null); // Ref for the name input

  const isEditMode = Boolean(customerToEdit);

  // Populate form when customerToEdit changes (for edit mode) or reset for add mode
  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setFormData({
          full_name: customerToEdit.full_name || '',
          phone_number: customerToEdit.phone_number || '',
          email: customerToEdit.email || '',
          address: customerToEdit.address || '', // Populate address
        });
      } else {
        // Reset form for Add mode when modal opens
        setFormData({
          full_name: '',
          phone_number: '',
          email: '',
          address: '', // Reset address
        });
      }
      setSubmitError('');

      // Set focus to name input after a short delay to allow modal transition
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100); // Small delay
      return () => clearTimeout(timer);
    }
    // Don't clear form during closing animation
  }, [isOpen, customerToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // Basic Validation
    if (!formData.full_name) {
        setSubmitError('Nama lengkap tidak boleh kosong.');
        setIsSubmitting(false);
        return;
    }
     if (!formData.phone_number && !formData.email) {
        setSubmitError('Setidaknya Nomor Telepon atau Email harus diisi.');
        setIsSubmitting(false);
        return;
    }
    // Optional: Add email format validation if email is provided
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        setSubmitError('Format email tidak valid.');
        setIsSubmitting(false);
        return;
    }

    try {
      // Call the onSave function passed from CustomerPage
      await onSave(formData, customerToEdit?.id);
      // Parent (CustomerPage) is responsible for closing modal on success
    } catch (error) {
      console.error("Error saving customer:", error);
      setSubmitError(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Parent component provides backdrop/animation
    <div
      className={`bg-white rounded-lg shadow-xl w-full sm:max-w-xl flex flex-col overflow-hidden`}
      style={{ maxHeight: '90vh' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 px-6 border-b flex-shrink-0 bg-gray-50">
        <h2 id="customer-modal-title" className="text-lg font-semibold text-gray-800 flex items-center">
          <FiUser className="h-5 w-5 mr-2.5 text-[#0ea5e9]"/>
          {isEditMode ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="p-1 rounded-full text-gray-400 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
          aria-label="Tutup"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body - Form */}
      <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5">
        {/* Full Name with Icon */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiUser className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              name="full_name"
              id="full_name"
              ref={nameInputRef} // Assign ref
              value={formData.full_name}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              className="focus:ring-[#0ea5e9] focus:border-[#0ea5e9] block w-full pl-11 pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Phone Number with Icon */}
        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
          <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                 <FiPhone className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="tel"
                name="phone_number"
                id="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={isSubmitting}
                className="focus:ring-[#0ea5e9] focus:border-[#0ea5e9] block w-full pl-11 pr-3 py-2 sm:text-sm border-gray-300 rounded-md placeholder-gray-400"
                placeholder="Contoh: 08123456789"
              />
          </div>
        </div>

         {/* Email with Icon */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative rounded-md shadow-sm">
             <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                 <FiMail className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                className="focus:ring-[#0ea5e9] focus:border-[#0ea5e9] block w-full pl-11 pr-3 py-2 sm:text-sm border-gray-300 rounded-md placeholder-gray-400"
                placeholder="contoh@email.com"
              />
          </div>
        </div>

        {/* Address with Icon */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <div className="relative rounded-md shadow-sm">
             <div className="absolute inset-y-0 left-0 top-0 pt-2.5 pl-3.5 flex items-start pointer-events-none">
                 <FiMapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                disabled={isSubmitting}
                className="focus:ring-[#0ea5e9] focus:border-[#0ea5e9] block w-full pl-11 pr-3 py-2 sm:text-sm border-gray-300 rounded-md placeholder-gray-400 resize-none"
                placeholder="Alamat lengkap pelanggan..."
              />
          </div>
        </div>

        {/* Submit Error Message */}
        {submitError && (
          <p className="text-sm text-red-600 text-center bg-red-100 p-3 rounded-md border border-red-200">{submitError}</p>
        )}
      </form>

      {/* Footer */}
      <div className="flex justify-end space-x-4 p-4 px-6 bg-gray-50 border-t rounded-b-lg flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-5 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit" // Trigger the form's onSubmit
          onClick={handleSubmit} // Also call directly to ensure state updates are captured
          disabled={isSubmitting || !formData.full_name || (!formData.phone_number && !formData.email)}
          className="inline-flex justify-center items-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0ea5e9] hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ea5e9] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <FiLoader className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" />
          ) : (
            <FiSave className="-ml-1 mr-2 h-4 w-4 text-white" />
          )}
          {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Tambah Pelanggan')}
        </button>
      </div>
    </div>
  );
}

export default CustomerFormModal; 