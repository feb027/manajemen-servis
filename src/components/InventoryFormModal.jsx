// src/components/InventoryFormModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiLoader, FiPackage } from 'react-icons/fi';

const MODAL_ANIMATION_DURATION = 300; // Match parent component

function InventoryFormModal({ isOpen, onClose, onSave, itemToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    stock: 0,
    price: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isEditMode = Boolean(itemToEdit);

  // Populate form when itemToEdit changes (for edit mode) or reset for add mode
  useEffect(() => {
    if (isOpen && itemToEdit) {
      setFormData({
        name: itemToEdit.name || '',
        sku: itemToEdit.sku || '',
        category: itemToEdit.category || '',
        description: itemToEdit.description || '',
        stock: itemToEdit.stock ?? 0,
        price: itemToEdit.price ?? 0,
      });
      setSubmitError(''); // Clear previous errors
    } else if (isOpen && !itemToEdit) {
      // Reset form for Add mode when modal opens
      setFormData({
        name: '',
        sku: '',
        category: '',
        description: '',
        stock: 0,
        price: 0,
      });
       setSubmitError('');
    }
    // Don't clear form during closing animation
  }, [isOpen, itemToEdit]); // Rerun when modal opens or item changes

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    // Basic Validation (Example)
    if (!formData.name) {
        setSubmitError('Nama item tidak boleh kosong.');
        setIsSubmitting(false);
        return;
    }
    if (formData.stock < 0 || formData.price < 0) {
        setSubmitError('Stok dan Harga tidak boleh negatif.');
        setIsSubmitting(false);
        return;
    }


    try {
      // Call the onSave function passed from InventoryPage
      // Pass the formData and the item ID (if editing)
      await onSave(formData, itemToEdit?.id);
      // Parent (InventoryPage) is responsible for closing modal on success
    } catch (error) {
      console.error("Error saving item:", error);
      setSubmitError(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`);
      // Keep modal open on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render null if not open and not closing (parent handles wrapper)
  // if (!isOpen && !isClosing) return null;

  return (
    // The parent component provides the backdrop and animation container
    <div
      className={`bg-white rounded-lg shadow-xl w-full sm:max-w-lg flex flex-col overflow-hidden`}
      style={{ maxHeight: '90vh' }} // Prevent excessive height
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-modal-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0 bg-gray-50">
        <h2 id="inventory-modal-title" className="text-lg font-semibold text-gray-800 flex items-center">
          <FiPackage className="h-5 w-5 mr-2 text-blue-600"/>
          {isEditMode ? 'Edit Item Inventaris' : 'Tambah Item Inventaris Baru'}
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
      <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Item <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">SKU (Stock Keeping Unit)</label>
          <input
            type="text"
            name="sku"
            id="sku"
            value={formData.sku}
            onChange={handleChange}
            disabled={isSubmitting}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori</label>
          <input
            type="text"
            name="category"
            id="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isSubmitting}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Contoh: Sparepart Laptop, Aksesoris"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Deskripsi</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            disabled={isSubmitting}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Detail atau catatan tambahan..."
          />
        </div>

        {/* Stock & Price (Inline) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Stok</label>
            <input
              type="number"
              name="stock"
              id="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0" // Prevent negative numbers via HTML5 validation
              step="1"
              disabled={isSubmitting}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Harga (Rp)</label>
            <input
              type="number"
              name="price"
              id="price"
              value={formData.price}
              onChange={handleChange}
              min="0" // Prevent negative numbers via HTML5 validation
              step="any" // Allow decimals if needed, or "1" for integers
              disabled={isSubmitting}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Submit Error Message */}
        {submitError && (
          <p className="text-xs text-red-600 text-center bg-red-50 p-2 rounded border border-red-200">{submitError}</p>
        )}
      </form>

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
          type="submit" // Trigger the form's onSubmit
          onClick={handleSubmit} // Also call directly to ensure state updates are captured
          disabled={isSubmitting || !formData.name} // Basic disable condition
          className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
          ) : (
            <FiSave className="-ml-1 mr-2 h-4 w-4 text-white" />
          )}
          {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Tambah Item')}
        </button>
      </div>
    </div>
  );
}

export default InventoryFormModal;