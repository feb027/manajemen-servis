import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiLock, FiBriefcase } from 'react-icons/fi';

const ROLES = ['admin', 'receptionist', 'technician'];
const MODAL_ANIMATION_DURATION = 300; // Assuming consistent duration

function UserFormModal({ isOpen, isClosing, onClose, onSave, userToEdit }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'receptionist', // Default role
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(userToEdit);

  useEffect(() => {
    if (isEditMode && userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        email: userToEdit.email || '',
        password: '', // Don't populate password for edit
        confirmPassword: '',
        role: userToEdit.role || 'receptionist',
      });
      setErrors({}); // Clear errors when opening for edit
    } else {
      // Reset form for add mode or when modal closes
      setFormData({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'receptionist',
      });
      setErrors({});
    }
  }, [isOpen, userToEdit, isEditMode]); // Re-run when modal opens or userToEdit changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific error when user starts typing
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
    }
    if (name === 'password' && errors.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Nama lengkap wajib diisi';
    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    if (!formData.role) newErrors.role = 'Role wajib dipilih';

    // Password validation only for add mode
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = 'Password wajib diisi';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password minimal 6 karakter';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Konfirmasi password tidak cocok';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({}); // Clear previous errors before submission attempt

    try {
        // Prepare data: exclude confirmPassword, include id if editing
        const dataToSave = {
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            // Only include password if adding a user
            ...( !isEditMode && { password: formData.password } )
        };
        
        await onSave(dataToSave, userToEdit?.id); // Pass data and optional userId
        // onSave should handle closing the modal on success
    } catch (error) { // Catch errors from the onSave promise (supabase interaction)
        console.error("Error saving user (caught in modal):", error);
        setErrors({ form: error.message || "Terjadi kesalahan saat menyimpan pengguna." });
    } finally {
        console.log("Executing finally block in UserFormModal handleSubmit");
        setIsSubmitting(false);
    }
  };

  // Handle ESC key press for closing
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Don't render the modal content if it's not open (for performance/state reset)
  if (!isOpen && !isClosing) return null;

  const modalTransitionClasses = isOpen && !isClosing
    ? 'opacity-100 scale-100'
    : 'opacity-0 scale-95';
  const backdropTransitionClasses = isOpen && !isClosing
    ? 'opacity-100'
    : 'opacity-0';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-${MODAL_ANIMATION_DURATION} ease-in-out ${backdropTransitionClasses}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose} // Close on backdrop click
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <div 
        className={`bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full transform transition-all duration-${MODAL_ANIMATION_DURATION} ease-in-out ${modalTransitionClasses}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <form onSubmit={handleSubmit}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h2 id="user-form-title" className="text-lg font-semibold text-gray-700">
                {isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h2>
              <button 
                type="button"
                onClick={onClose} 
                className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
                {errors.form && (
                    <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">
                        {errors.form}
                    </div>
                )}
                {/* Full Name */}
                <div className="relative">
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <FiUser className="absolute left-3 top-9 h-5 w-5 text-gray-400 pointer-events-none"/>
                    <input 
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2 border ${errors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Masukkan nama lengkap"
                        aria-invalid={!!errors.full_name}
                        aria-describedby={errors.full_name ? "full_name-error" : undefined}
                    />
                    {errors.full_name && <p id="full_name-error" className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
                </div>

                {/* Email */}
                <div className="relative">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <FiMail className="absolute left-3 top-9 h-5 w-5 text-gray-400 pointer-events-none"/>
                    <input 
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isEditMode} // Disable email editing
                        className={`block w-full pl-10 pr-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Masukkan alamat email"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                {/* Password (only for add mode) */}
                {!isEditMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Password */}
                        <div className="relative">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <FiLock className="absolute left-3 top-9 h-5 w-5 text-gray-400 pointer-events-none"/>
                            <input 
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`block w-full pl-10 pr-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder="Minimal 6 karakter"
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? "password-error" : undefined}
                            />
                            {errors.password && <p id="password-error" className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>
                        {/* Confirm Password */}
                        <div className="relative">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                            <FiLock className="absolute left-3 top-9 h-5 w-5 text-gray-400 pointer-events-none"/>
                            <input 
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`block w-full pl-10 pr-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder="Ulangi password"
                                aria-invalid={!!errors.confirmPassword}
                                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                            />
                            {errors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                        </div>
                    </div>
                )}

                {/* Role */}
                 <div className="relative">
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <FiBriefcase className="absolute left-3 top-9 h-5 w-5 text-gray-400 pointer-events-none"/>
                    <select 
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={`block w-full pl-10 pr-3 py-2 border ${errors.role ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white appearance-none`}
                        aria-invalid={!!errors.role}
                        aria-describedby={errors.role ? "role-error" : undefined}
                    >
                        <option value="" disabled>Pilih role pengguna</option>
                        {ROLES.map(role => (
                            <option key={role} value={role} className="capitalize">{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                        ))}
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                         <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                     </div>
                     {errors.role && <p id="role-error" className="mt-1 text-xs text-red-600">{errors.role}</p>}
                </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-4 border-t bg-gray-50 space-x-3">
                <button 
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50"
                >
                    Batal
                </button>
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : null}
                    {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Tambah Pengguna')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal; 