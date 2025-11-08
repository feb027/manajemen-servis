// src/components/SystemSettingsTab.jsx
import React, { useState, useEffect, Fragment } from 'react';
import {
    FiSliders, FiDatabase, FiBell, FiTool, FiSave, FiPlus, FiEdit2, FiArchive, FiPackage, FiInfo, FiX, FiAlertTriangle, FiLoader,
    FiClipboard, FiCheckSquare, FiTrash2 // Added FiTrash2 for delete modal
} from 'react-icons/fi';
import { supabase } from '../supabase/supabaseClient'; // Ensure Supabase is imported
import { toast } from 'react-hot-toast'; // Import toast for feedback
import { Popover, Transition, Switch, Dialog } from '@headlessui/react' // Added Dialog for modal
import ConfirmationModal from './ConfirmationModal'; // Import confirmation modal

// Color options for status selection
const COLOR_OPTIONS = [
  { value: 'blue', label: 'Biru', bgClass: 'bg-blue-200', textClass: 'text-blue-800', previewBg: 'bg-blue-500' },
  { value: 'yellow', label: 'Kuning', bgClass: 'bg-yellow-200', textClass: 'text-yellow-800', previewBg: 'bg-yellow-500' },
  { value: 'orange', label: 'Oranye', bgClass: 'bg-orange-200', textClass: 'text-orange-800', previewBg: 'bg-orange-500' },
  { value: 'green', label: 'Hijau', bgClass: 'bg-green-200', textClass: 'text-green-800', previewBg: 'bg-green-500' },
  { value: 'red', label: 'Merah', bgClass: 'bg-red-200', textClass: 'text-red-800', previewBg: 'bg-red-500' },
  { value: 'purple', label: 'Ungu', bgClass: 'bg-purple-200', textClass: 'text-purple-800', previewBg: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', bgClass: 'bg-pink-200', textClass: 'text-pink-800', previewBg: 'bg-pink-500' },
  { value: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-200', textClass: 'text-indigo-800', previewBg: 'bg-indigo-500' },
  { value: 'teal', label: 'Teal', bgClass: 'bg-teal-200', textClass: 'text-teal-800', previewBg: 'bg-teal-500' },
  { value: 'gray', label: 'Abu-abu', bgClass: 'bg-gray-200', textClass: 'text-gray-800', previewBg: 'bg-gray-500' },
];

// Helper to get color classes
const getColorClasses = (colorValue) => {
    const colorOption = COLOR_OPTIONS.find(c => c.value === colorValue);
    return colorOption || COLOR_OPTIONS[COLOR_OPTIONS.length - 1]; // Default to gray
};

// Define notification types with icons
const notificationSettingTypes = [
  { key: 'notification_low_stock_enabled', label: 'Peringatan Stok Menipis', description: 'Notifikasi jika stok barang mencapai batas minimum.', icon: <FiPackage className="w-4 h-4 mr-2 text-orange-500"/> },
  { key: 'notification_new_order_enabled', label: 'Order Servis Baru', description: 'Notifikasi saat order servis baru dibuat.', icon: <FiClipboard className="w-4 h-4 mr-2 text-blue-500"/> },
  { key: 'notification_status_update_enabled', label: 'Update Status Order', description: 'Notifikasi saat status order servis diperbarui.', icon: <FiCheckSquare className="w-4 h-4 mr-2 text-green-500"/> },
  // Add more types as needed
];

function SystemSettingsTab() {
  const [serviceStatuses, setServiceStatuses] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editStatusName, setEditStatusName] = useState('');
  const [editStatusColor, setEditStatusColor] = useState('blue');
  
  // Add Status Modal State
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  
  // Delete Status Modal State
  const [statusToDelete, setStatusToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingStatus, setIsDeletingStatus] = useState(false);
  // --- Inventory Settings State ---
  const [lowStockThreshold, setLowStockThreshold] = useState(null); // Fetched value
  const [editedLowStockThreshold, setEditedLowStockThreshold] = useState(''); // Value in input
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [loadingThreshold, setLoadingThreshold] = useState(true); // State for loading threshold
  // --- Notification Settings State ---
  const [notificationPreferences, setNotificationPreferences] = useState({}); // Stores { key: boolean }
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [savingNotificationKey, setSavingNotificationKey] = useState(null); // Track which toggle is saving
  // --- Company Details State ---
  const [companyDetails, setCompanyDetails] = useState(null); // Fetched data { company_name, address, ... }
  const [editedDetails, setEditedDetails] = useState({}); // Form state { company_name, address, ... }
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(true);
  const [isSavingCompanyDetails, setIsSavingCompanyDetails] = useState(false);
  const [formChanged, setFormChanged] = useState(false); // Track if form has changes

  // Fetch initial settings
  useEffect(() => {
    fetchServiceStatuses();
    fetchLowStockThreshold();
    fetchNotificationPreferences();
    fetchCompanyDetails(); // Fetch company details
  }, []);

  // --- Service Status Management ---
  const fetchServiceStatuses = async () => {
    setLoadingStatuses(true);
    console.log("Fetching service statuses from DB...");
    try {
      const { data, error } = await supabase
        .from('service_statuses')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setServiceStatuses(data || []);
    } catch (error) {
      console.error("Error fetching service statuses:", error);
      toast.error("Gagal memuat status servis.");
    } finally {
      setLoadingStatuses(false);
    }
  };

  const openAddStatusModal = () => {
    setNewStatusName('');
    setNewStatusColor('blue');
    setIsAddStatusModalOpen(true);
  };

  const closeAddStatusModal = () => {
    setIsAddStatusModalOpen(false);
    setNewStatusName('');
    setNewStatusColor('blue');
  };

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error("Nama status tidak boleh kosong.");
      return;
    }

    // Check for duplicate name
    const isDuplicate = serviceStatuses.some(
      s => s.name.toLowerCase() === newStatusName.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error("Status dengan nama ini sudah ada.");
      return;
    }

    setIsAddingStatus(true);
    try {
      const maxOrder = serviceStatuses.length > 0 
        ? Math.max(...serviceStatuses.map(s => s.display_order)) 
        : 0;

      const { data, error } = await supabase
        .from('service_statuses')
        .insert([{
          name: newStatusName.trim(),
          color: newStatusColor,
          is_default: false,
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      setServiceStatuses([...serviceStatuses, data]);
      toast.success(`Status "${data.name}" berhasil ditambahkan.`);
      closeAddStatusModal();
    } catch (error) {
      console.error("Error adding status:", error);
      toast.error(`Gagal menambahkan status: ${error.message}`);
    } finally {
      setIsAddingStatus(false);
    }
  };

  const startEditing = (status) => {
    setEditingStatusId(status.id);
    setEditStatusName(status.name);
    setEditStatusColor(status.color);
  };

  const cancelEditing = () => {
    setEditingStatusId(null);
    setEditStatusName('');
    setEditStatusColor('blue');
  };

  const handleSaveEdit = async (id) => {
    const trimmedName = editStatusName.trim();

    if (!trimmedName) {
      toast.error("Nama status tidak boleh kosong.");
      return;
    }

    // Check for duplicate name (excluding current status)
    const isDuplicate = serviceStatuses.some(
      s => s.id !== id && s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      toast.error("Status dengan nama ini sudah ada.");
      return;
    }

    try {
      const { error } = await supabase
        .from('service_statuses')
        .update({
          name: trimmedName,
          color: editStatusColor,
          updated_at: new Date()
        })
        .eq('id', id);

      if (error) throw error;

      setServiceStatuses(prev => prev.map(s => 
        s.id === id 
          ? { ...s, name: trimmedName, color: editStatusColor } 
          : s
      ));
      toast.success(`Status "${trimmedName}" berhasil diperbarui.`);
      cancelEditing();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(`Gagal memperbarui status: ${error.message}`);
    }
  };

  const openDeleteModal = (status) => {
    setStatusToDelete(status);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStatusToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!statusToDelete) return;

    setIsDeletingStatus(true);
    try {
      console.log('Checking if status is in use:', statusToDelete.name);
      
      // First, check if this status is being used by any orders
      const { count, error: checkError } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', statusToDelete.name);

      console.log('Count result:', count, 'Type:', typeof count, 'Error:', checkError);

      if (checkError) throw checkError;

      // If status is being used, show error and prevent deletion
      if (count !== null && count !== undefined && count > 0) {
        console.log('Status is in use by', count, 'orders. Blocking deletion.');
        toast.error(
          `Tidak dapat menghapus status "${statusToDelete.name}" karena masih digunakan oleh ${count} order. Ubah status order tersebut terlebih dahulu.`,
          { duration: 5000 }
        );
        closeDeleteModal();
        setIsDeletingStatus(false);
        return;
      }

      console.log('Status not in use. Proceeding with deletion...');
      
      // Hard delete if not used by any orders
      const { error } = await supabase
        .from('service_statuses')
        .delete()
        .eq('id', statusToDelete.id);

      if (error) {
        console.log('Delete error:', error);
        // Check if it's a foreign key constraint error (shouldn't happen after pre-check, but just in case)
        if (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('violates')) {
          toast.error(
            `Tidak dapat menghapus status "${statusToDelete.name}" karena masih digunakan oleh order aktif. Ubah status order tersebut terlebih dahulu.`,
            { duration: 5000 }
          );
        } else {
          throw error;
        }
        closeDeleteModal();
        setIsDeletingStatus(false);
        return;
      }

      console.log('Status deleted successfully');
      setServiceStatuses(prev => prev.filter(s => s.id !== statusToDelete.id));
      toast.success(`Status "${statusToDelete.name}" berhasil dihapus.`);
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting status:", error);
      
      // More specific error messages
      if (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('violates')) {
        toast.error(
          `Tidak dapat menghapus status "${statusToDelete.name}" karena masih digunakan oleh order aktif. Ubah status order tersebut terlebih dahulu.`,
          { duration: 5000 }
        );
      } else {
        toast.error(`Gagal menghapus status: ${error.message}`);
      }
    } finally {
      setIsDeletingStatus(false);
    }
  };

  // --- Inventory Settings Management ---
  const fetchLowStockThreshold = async () => {
    setLoadingThreshold(true); // Start loading
    console.log("Fetching low stock threshold...");
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'low_stock_threshold')
        .maybeSingle(); // Use maybeSingle as the setting might not exist yet

      if (error) throw error;

      const thresholdValue = data?.setting_value;
      if (thresholdValue !== null && thresholdValue !== undefined) {
        setLowStockThreshold(Number(thresholdValue));
        setEditedLowStockThreshold(String(thresholdValue)); // Set input field value
      } else {
         console.warn("Low stock threshold setting not found in DB. Setting default visually.");
         // Set a default or leave as null/empty? Let's default input visually
         setLowStockThreshold(5); // Example default if not found
         setEditedLowStockThreshold('5');
         // Optionally, insert the default into the DB if it doesn't exist
         // handleUpdateLowStockThreshold(5); // Careful with recursion/infinite loops here
      }
    } catch (error) {
      console.error("Error fetching low stock threshold:", error);
      toast.error("Gagal memuat pengaturan batas stok.");
      // Set defaults on error?
      setLowStockThreshold(5);
      setEditedLowStockThreshold('5');
    } finally {
      setLoadingThreshold(false); // End loading
    }
  };

  const handleUpdateLowStockThreshold = async () => {
    const newValue = editedLowStockThreshold.trim();
    const numericValue = parseInt(newValue, 10);

    // Basic validation
    if (newValue === '' || isNaN(numericValue) || !Number.isInteger(numericValue) || numericValue < 0) {
        toast.error("Batas minimum stok harus berupa angka positif (integer).");
        return;
    }

    // Check if value changed
    if (numericValue === lowStockThreshold) {
        toast.info("Nilai batas stok tidak berubah.");
        return;
    }

    setIsSavingThreshold(true);
    console.log("Attempting to update low stock threshold to:", numericValue);
    // Placeholder: Replace with Supabase call
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
           { setting_key: 'low_stock_threshold', setting_value: String(numericValue), updated_at: new Date() },
           { onConflict: 'setting_key' } // Update if key exists, insert if not
        );

      if (error) throw error;

      setLowStockThreshold(numericValue); // Update state with the new value
      setEditedLowStockThreshold(String(numericValue)); // Sync input field
      toast.success("Batas minimum stok berhasil diperbarui.");

    } catch (error) {
      console.error("Error updating low stock threshold:", error);
      toast.error(`Gagal memperbarui batas stok: ${error.message}`);
      // Optionally revert edited value back to original?
      // setEditedLowStockThreshold(String(lowStockThreshold));
    } finally {
      setIsSavingThreshold(false);
    }
  };

  // --- Notification Settings Management ---
  const fetchNotificationPreferences = async () => {
    setLoadingNotifications(true);
    console.log("Fetching notification preferences...");
    try {
      const keysToFetch = notificationSettingTypes.map(t => t.key);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', keysToFetch);

      if (error) throw error;

      const prefs = {};
      notificationSettingTypes.forEach(type => {
        const dbValue = data.find(d => d.setting_key === type.key)?.setting_value;
        // setting_value is JSONB, so it's already boolean/null
        prefs[type.key] = dbValue !== false && dbValue !== null; // Default to true if not set
      });
      setNotificationPreferences(prefs);

    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      toast.error("Gagal memuat preferensi notifikasi.");
      const defaultPrefs = {};
      notificationSettingTypes.forEach(type => { defaultPrefs[type.key] = true; });
      setNotificationPreferences(defaultPrefs);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotificationPreference = async (key, newEnabledValue) => {
    const currentPrefs = { ...notificationPreferences };
    setNotificationPreferences(prev => ({ ...prev, [key]: newEnabledValue }));
    setSavingNotificationKey(key);

    console.log(`Attempting to update ${key} to ${newEnabledValue}`);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { setting_key: key, setting_value: newEnabledValue, updated_at: new Date() },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;

      toast.success(`Pengaturan notifikasi "${notificationSettingTypes.find(t => t.key === key)?.label || key}" diperbarui.`);

    } catch (error) {
      console.error(`Error updating notification preference ${key}:`, error);
      toast.error(`Gagal memperbarui pengaturan: ${error.message}`);
      setNotificationPreferences(currentPrefs);
    } finally {
       setSavingNotificationKey(null);
    }
  };

  // --- Company Details Management ---
  const FIXED_COMPANY_PROFILE_ID = '11111111-1111-1111-1111-111111111111'; // Use the fixed ID created

  const fetchCompanyDetails = async () => {
    setLoadingCompanyDetails(true);
    console.log("Fetching company details...");
    try {
        const { data, error } = await supabase
            .from('company_profile')
            .select('company_name, address, phone_number, email, website, logo_url')
            .eq('id', FIXED_COMPANY_PROFILE_ID)
            .single(); // We expect only one row

        if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (0 rows) error, handle below
            throw error;
        }

        if (data) {
            setCompanyDetails(data);
            setEditedDetails(data); // Initialize form with fetched data
        } else {
            console.warn("Company profile not found in DB. Initializing empty form.");
            const emptyDetails = { company_name: '', address: '', phone_number: '', email: '', website: '', logo_url: '' };
            setCompanyDetails(emptyDetails);
            setEditedDetails(emptyDetails);
        }
        setFormChanged(false); // Reset form changed state
    } catch (error) {
        console.error("Error fetching company details:", error);
        toast.error("Gagal memuat detail perusahaan.");
        // Initialize with empty on error to allow editing
        const emptyDetails = { company_name: '', address: '', phone_number: '', email: '', website: '', logo_url: '' };
        setCompanyDetails(emptyDetails);
        setEditedDetails(emptyDetails);
    } finally {
        setLoadingCompanyDetails(false);
    }
  };

  const handleDetailChange = (e) => {
      const { name, value } = e.target;
      setEditedDetails(prev => ({ ...prev, [name]: value }));
      setFormChanged(true); // Mark form as changed
  };

  const handleCancelEditDetails = () => {
      setEditedDetails(companyDetails); // Reset form to original fetched data
      setFormChanged(false);
  };

  const handleUpdateCompanyDetails = async (e) => {
      e.preventDefault(); // Prevent default form submission
      if (!formChanged || isSavingCompanyDetails) return;

      setIsSavingCompanyDetails(true);
      console.log("Updating company details:", editedDetails);

      try {
          // Prepare data, ensuring null for empty optional fields if desired
          const updateData = {
              ...editedDetails,
              website: editedDetails.website || null,
              logo_url: editedDetails.logo_url || null,
              updated_at: new Date()
          };

          const { error } = await supabase
              .from('company_profile')
              .update(updateData)
              .eq('id', FIXED_COMPANY_PROFILE_ID);
              // Note: Use upsert if you want to create the row if it doesn't exist
              // .upsert({ ...updateData, id: FIXED_COMPANY_PROFILE_ID }, { onConflict: 'id' })

          if (error) throw error;

          setCompanyDetails(editedDetails); // Update main state with saved data
          setFormChanged(false);
          toast.success("Detail perusahaan berhasil diperbarui.");

      } catch (error) {
          console.error("Error updating company details:", error);
          toast.error(`Gagal memperbarui detail perusahaan: ${error.message}`);
      } finally {
          setIsSavingCompanyDetails(false);
      }
  };

  // Style definitions
  // Slightly larger buttons, clearer text
  const actionButtonClasses = "flex items-center px-2.5 py-1.5 text-xs rounded hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1 font-medium";
  const editButtonClasses = `${actionButtonClasses} text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-400`;
  const archiveButtonClasses = `${actionButtonClasses} text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-400`;
  const saveButtonClasses = `${actionButtonClasses} text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-400`;
  const cancelButtonClasses = `${actionButtonClasses} text-gray-600 bg-gray-100 hover:bg-gray-200 focus:ring-gray-400`;
  const primarySaveButtonClasses = "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition";
  const inputBaseClass = "block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed";

  // Component Return
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center">
        <FiSliders className="mr-3 text-sky-600" />
        Pengaturan Sistem
      </h2>

      {/* Section: Service Statuses */}
      <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-700 mb-2 flex items-center">
          <FiTool className="mr-2 text-indigo-500" />
          Manajemen Status Servis
        </h3>
        <p className="text-xs text-gray-500 mb-5">Kelola status yang dapat dipilih saat memperbarui order servis. Status default tidak dapat dihapus.</p>
        
        {loadingStatuses ? (
          <div className="flex justify-center items-center py-10">
            <FiLoader className="h-6 w-6 text-gray-400 animate-spin mr-3" />
            <span className="text-gray-500">Memuat status servis...</span>
          </div>
        ) : (
          <>
            {/* List Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 text-xs text-gray-500 font-medium mb-2">
              <span className="w-2/5 lg:w-1/3">Nama Status</span>
              <span className="w-3/5 lg:w-2/3 text-right pr-2">Aksi</span>
            </div>

            <ul className="space-y-2 mb-4">
              {serviceStatuses.map((status) => {
                const colorClasses = getColorClasses(status.color);
                return (
                  <li key={status.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 min-h-[54px] hover:border-gray-300 transition-colors shadow-sm hover:shadow-md">
                    {/* Status Name/Edit Input */} 
                    <div className="flex items-center flex-grow w-2/5 lg:w-1/3 mr-4">
                      {/* Badge (shown always, slightly dimmed in edit mode) */}
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full mr-3 whitespace-nowrap ${colorClasses.bgClass} ${colorClasses.textClass} ${editingStatusId === status.id ? 'opacity-60' : ''}`}>
                        {status.name}
                      </span>
                      {editingStatusId === status.id && (
                        // --- Editing view --- 
                        <div className="flex-grow flex flex-col space-y-2">
                          <input
                            type="text"
                            value={editStatusName}
                            onChange={(e) => setEditStatusName(e.target.value)}
                            className="text-sm px-2 py-1.5 border border-sky-400 rounded focus:ring-1 focus:ring-sky-500 focus:border-sky-500 w-full"
                            autoFocus
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') handleSaveEdit(status.id); 
                              if (e.key === 'Escape') cancelEditing(); 
                            }}
                            placeholder="Nama status"
                          />
                          <select
                            value={editStatusColor}
                            onChange={(e) => setEditStatusColor(e.target.value)}
                            className="text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                          >
                            {COLOR_OPTIONS.map(colorOpt => (
                              <option key={colorOpt.value} value={colorOpt.value}>
                                {colorOpt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {editingStatusId !== status.id && (
                        // --- Default view --- 
                        <div className="flex items-baseline">
                          <span className="text-xs text-gray-500 ml-2 italic whitespace-nowrap">
                            {status.is_default ? '(Default)' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex items-center justify-end space-x-1.5 w-3/5 lg:w-2/3">
                      {editingStatusId === status.id ? (
                        // --- Edit Actions --- 
                        <>
                          <button onClick={() => handleSaveEdit(status.id)} className={saveButtonClasses} title="Simpan Perubahan">
                            <FiSave size={14} className="mr-1.5"/> Simpan
                          </button>
                          <button onClick={cancelEditing} className={cancelButtonClasses} title="Batal Edit">
                            <FiX size={14} className="mr-1.5"/> Batal
                          </button>
                        </>
                      ) : ( 
                        // --- Default Actions --- 
                        <>
                          {!status.is_default && (
                            <>
                              <button
                                onClick={() => startEditing(status)}
                                className={editButtonClasses}
                                title={`Ubah Status "${status.name}"`}
                              >
                                <FiEdit2 className="h-4 w-4 mr-1.5" /> Ubah
                              </button>
                              <button
                                onClick={() => openDeleteModal(status)}
                                className={archiveButtonClasses}
                                title={`Hapus Status "${status.name}"`}
                              >
                                <FiTrash2 className="h-4 w-4 mr-1.5" /> Hapus
                              </button>
                            </>
                          )}
                          {status.is_default && (
                            <span className="text-xs text-gray-400 italic pr-2">-</span>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            
            {/* Add New Status Button */}
            <div className="flex justify-center mt-5 pt-4 border-t border-gray-200">
              <button
                onClick={openAddStatusModal}
                className={`${primarySaveButtonClasses} py-2`}
              >
                <FiPlus className="-ml-1 mr-2 h-4 w-4" /> Tambah Status Baru
              </button>
            </div>
          </>
        )}
      </div>

      {/* REMOVED Placeholder Section: Service Types */}
      {/* <div className="p-6 bg-white rounded-lg shadow border border-gray-200 opacity-60"> ... </div> */}

       {/* Section: Inventory Settings - Improved UI */}
       <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
         <h3 className="text-lg font-medium text-gray-700 mb-1 flex items-center">
           <FiPackage className="mr-2 text-orange-500" />
           Pengaturan Inventaris
         </h3>
         <p className="text-xs text-gray-500 mb-5">Konfigurasi terkait inventaris dan stok barang.</p>

         {/* Low Stock Threshold Setting Area */}
         <div className="p-4 border border-gray-200 rounded-md bg-gray-50/50">
            <div className="flex items-center space-x-3 mb-2">
                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 whitespace-nowrap">
                    Batas Minimum Stok
                </label>
                {/* Tooltip Popover */}
                <Popover className="relative flex">
                    <Popover.Button className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 rounded-full p-0.5 mt-0.5">
                        <FiInfo className="h-3.5 w-3.5" />
                    </Popover.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-75"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2.5 text-xs text-center text-white bg-gray-800 rounded-md shadow-lg">
                            Atur jumlah stok minimum. Item dengan stok dibawah atau sama dengan nilai ini akan ditandai sebagai "Stok Menipis" di halaman Inventaris.
                        </Popover.Panel>
                    </Transition>
                </Popover>
            </div>
            <div className="flex items-center space-x-3">
                <div className="relative">
                    <input
                        type="number"
                        id="lowStockThreshold"
                        name="lowStockThreshold"
                        value={editedLowStockThreshold}
                        onChange={(e) => setEditedLowStockThreshold(e.target.value)}
                        min="0"
                        step="1"
                        className={`p-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-sm w-28 ${loadingThreshold ? 'bg-gray-100 cursor-not-allowed pl-8' : 'border-gray-300'}`} // Adjust padding left when loading
                        placeholder="Contoh: 5"
                        disabled={loadingThreshold || isSavingThreshold}
                    />
                    {/* Loading Indicator */}
                    {loadingThreshold && (
                        <FiLoader className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                </div>
                <button
                    onClick={handleUpdateLowStockThreshold}
                    disabled={loadingThreshold || isSavingThreshold || editedLowStockThreshold === String(lowStockThreshold)}
                    className={`${primarySaveButtonClasses} px-4 py-2`}
                >
                <FiSave className="-ml-1 mr-2 h-4 w-4" />
                {isSavingThreshold ? 'Menyimpan...' : 'Simpan'}
                </button>
                {/* Show Cancel only if value changed and not loading/saving */}
                {!loadingThreshold && !isSavingThreshold && editedLowStockThreshold !== String(lowStockThreshold) && (
                    <button
                        onClick={() => setEditedLowStockThreshold(String(lowStockThreshold))}
                        className={`${cancelButtonClasses} px-3 py-2 text-sm`}
                        title="Batal perubahan"
                    >
                        <FiX className="mr-1.5 h-4 w-4" /> Batal
                    </button>
                )}
            </div>
         </div>
       </div>

       {/* Section: Notifications - Further UI Improvements */}
       <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
         <h3 className="text-lg font-medium text-gray-700 mb-1 flex items-center">
           <FiBell className="mr-2 text-purple-500" />
           Pengaturan Notifikasi Sistem
         </h3>
         <p className="text-xs text-gray-500 mb-5">Aktifkan atau nonaktifkan jenis notifikasi otomatis yang akan dikirim ke pengguna terkait.</p>

         {/* Container for the settings list */}
         <div className="p-4 border border-gray-200 rounded-md bg-gray-50/50 min-h-[150px] flex flex-col justify-center">
           {loadingNotifications ? (
               <div className="flex justify-center items-center py-6 text-gray-500">
                   <FiLoader className="h-5 w-5 animate-spin mr-2" />
                   <span>Memuat pengaturan...</span>
               </div>
           ) : (
               <ul className="space-y-4 divide-y divide-gray-200">
                   {notificationSettingTypes.map((type) => (
                     <Switch.Group as="li" key={type.key} className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 transition-opacity duration-150 ${savingNotificationKey === type.key ? 'opacity-60' : 'opacity-100'}`}> {/* Adjusted padding */}
                       {/* Wrap Label and Description in a clickable div with hover effect */}
                       <div
                         className="group flex-grow flex flex-col mr-4 pr-4 cursor-pointer rounded-md -m-2 p-2 transition-colors hover:bg-gray-100" // Added group and hover
                         onClick={() => handleToggleNotificationPreference(type.key, !notificationPreferences[type.key])}
                       >
                         <Switch.Label as="span" className="text-sm font-medium text-gray-800 flex items-center" passive>
                           {type.icon} {/* Display icon next to label */}
                           {type.label}
                         </Switch.Label>
                         <Switch.Description as="span" className="text-xs text-gray-500 mt-0.5 pl-6"> {/* Indent description */}
                           {type.description}
                         </Switch.Description>
                       </div>
                       <div className="flex items-center flex-shrink-0">
                           {savingNotificationKey === type.key && (
                               <FiLoader className="h-4 w-4 text-gray-400 animate-spin mr-3" />
                           )}
                           {/* Switch remains the same */}
                           <Switch
                             checked={notificationPreferences[type.key] || false}
                             onChange={(newVal) => handleToggleNotificationPreference(type.key, newVal)}
                             disabled={savingNotificationKey === type.key}
                             className={`${notificationPreferences[type.key] ? 'bg-sky-600' : 'bg-gray-200'}
                               relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                           >
                             <span className="sr-only">Use setting</span>
                             <span
                               aria-hidden="true"
                               className={`${notificationPreferences[type.key] ? 'translate-x-5' : 'translate-x-0'}
                                 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                             />
                           </Switch>
                       </div>
                     </Switch.Group>
                   ))}
               </ul>
           )}
         </div>
       </div>

      {/* Section: Company Details */}
       <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
         <h3 className="text-lg font-medium text-gray-700 mb-1 flex items-center">
           <FiInfo className="mr-2 text-gray-500" />
           Detail Perusahaan
         </h3>
         <p className="text-xs text-gray-500 mb-5">Informasi dasar perusahaan yang dapat digunakan di laporan atau fitur lain.</p>

         {loadingCompanyDetails ? (
            <div className="flex justify-center items-center py-10">
                <FiLoader className="h-6 w-6 text-gray-400 animate-spin mr-3" />
                <span className="text-gray-500">Memuat detail perusahaan...</span>
            </div>
         ) : (
            <form onSubmit={handleUpdateCompanyDetails} className="space-y-4">
               {/* Company Name */}
               <div>
                 <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                 <input
                    type="text"
                    name="company_name"
                    id="company_name"
                    value={editedDetails.company_name || ''}
                    onChange={handleDetailChange}
                    className={inputBaseClass}
                    required
                 />
               </div>

               {/* Address */}
               <div>
                 <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                 <textarea
                    name="address"
                    id="address"
                    rows="3"
                    value={editedDetails.address || ''}
                    onChange={handleDetailChange}
                    className={inputBaseClass}
                 />
               </div>

               {/* Contact Info Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
                   {/* Phone Number */}
                   <div>
                     <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                     <input
                        type="tel" // Use tel type for potential phone features
                        name="phone_number"
                        id="phone_number"
                        value={editedDetails.phone_number || ''}
                        onChange={handleDetailChange}
                        className={inputBaseClass}
                     />
                   </div>

                   {/* Email */}
                   <div>
                     <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                     <input
                        type="email"
                        name="email"
                        id="email"
                        value={editedDetails.email || ''}
                        onChange={handleDetailChange}
                        className={inputBaseClass}
                     />
                   </div>

                   {/* Website (Optional) */}
                   <div>
                     <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">Website <span className="text-xs text-gray-400">(Opsional)</span></label>
                     <input
                        type="url" // Use url type for validation hints
                        name="website"
                        id="website"
                        value={editedDetails.website || ''}
                        onChange={handleDetailChange}
                        className={inputBaseClass}
                        placeholder="https://contoh.com"
                     />
                   </div>

                    {/* Logo URL (Optional) - Consider File Upload later */}
                    <div className="md:col-span-2"> {/* Span across 2 cols on medium screens */} 
                      <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">URL Logo <span className="text-xs text-gray-400">(Opsional)</span></label>
                      <div className="flex items-center space-x-3">
                          <input
                             type="url"
                             name="logo_url"
                             id="logo_url"
                             value={editedDetails.logo_url || ''}
                             onChange={handleDetailChange}
                             className={`${inputBaseClass} flex-grow`}
                             placeholder="https://contoh.com/logo.png"
                          />
                          {/* Logo Preview Area */}
                          <div className="flex-shrink-0 h-16 w-16 border border-gray-200 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
                              {editedDetails.logo_url ? (
                                 <img 
                                    src={editedDetails.logo_url} 
                                    alt="Logo Preview" 
                                    className="max-h-full max-w-full object-contain" 
                                    onError={(e) => { 
                                        e.target.onerror = null; // Prevent infinite loop on error
                                        e.target.style.display='none'; // Hide broken image
                                        // Optionally show a placeholder text/icon inside the parent div
                                        const parent = e.target.parentNode;
                                        if (parent) {
                                            const errorText = document.createElement('span');
                                            errorText.textContent = 'Gagal memuat';
                                            errorText.className = 'text-xs text-red-500 p-1 text-center';
                                            parent.appendChild(errorText);
                                        }
                                    }} 
                                 />
                              ) : (
                                <span className="text-xs text-gray-400">Logo</span>
                              )}
                          </div>
                      </div>
                    </div>
       </div>

               {/* Action Buttons */}
               <div className="flex justify-end items-center space-x-3 pt-4 border-t border-gray-200 mt-6">
                    <button
                        type="button"
                        onClick={handleCancelEditDetails}
                        disabled={!formChanged || isSavingCompanyDetails}
                        className={`${cancelButtonClasses} px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <FiX className="-ml-0.5 mr-1.5 h-4 w-4" /> Batal
                    </button>
         <button
                        type="submit"
                        disabled={!formChanged || isSavingCompanyDetails}
                        className={`${primarySaveButtonClasses} px-5 py-2`}
                    >
                        <FiSave className="-ml-1 mr-2 h-4 w-4" />
                        {isSavingCompanyDetails ? 'Menyimpan...' : 'Simpan Detail'}
         </button>
               </div>
            </form>
         )}
       </div>

      {/* Add Status Modal */}
      <Dialog 
        open={isAddStatusModalOpen} 
        onClose={closeAddStatusModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiPlus className="mr-2 text-sky-600" />
                Tambah Status Baru
              </Dialog.Title>

              <div className="space-y-4">
                {/* Status Name Input */}
                <div>
                  <label htmlFor="newStatusName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Status <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="newStatusName"
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    className={inputBaseClass}
                    placeholder="Contoh: Dalam Pengiriman"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newStatusName.trim()) handleAddStatus();
                      if (e.key === 'Escape') closeAddStatusModal();
                    }}
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Warna <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_OPTIONS.map((colorOpt) => (
                      <button
                        key={colorOpt.value}
                        type="button"
                        onClick={() => setNewStatusColor(colorOpt.value)}
                        className={`relative flex flex-col items-center p-2 rounded border-2 transition-all ${
                          newStatusColor === colorOpt.value
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={colorOpt.label}
                      >
                        <div className={`w-8 h-8 rounded-full ${colorOpt.previewBg}`} />
                        <span className="text-[10px] text-gray-600 mt-1">{colorOpt.label}</span>
                        {newStatusColor === colorOpt.value && (
                          <div className="absolute top-1 right-1">
                            <FiCheckSquare className="w-4 h-4 text-sky-600" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    {newStatusName.trim() ? (
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getColorClasses(newStatusColor).bgClass} ${getColorClasses(newStatusColor).textClass}`}>
                        {newStatusName}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Masukkan nama status untuk melihat preview</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeAddStatusModal}
                  disabled={isAddingStatus}
                  className={`${cancelButtonClasses} px-4 py-2 disabled:opacity-50`}
                >
                  <FiX className="mr-1.5 h-4 w-4" /> Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddStatus}
                  disabled={!newStatusName.trim() || isAddingStatus}
                  className={`${primarySaveButtonClasses} px-4 py-2`}
                >
                  {isAddingStatus ? (
                    <>
                      <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FiPlus className="mr-2 h-4 w-4" />
                      Tambah Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Status Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Hapus Status Servis?"
        message={
          statusToDelete
            ? `Apakah Anda yakin ingin menghapus status "${statusToDelete.name}"? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmText="Hapus"
        cancelText="Batal"
        isLoading={isDeletingStatus}
        icon={FiAlertTriangle}
      />

    </div>
  );
}

export default SystemSettingsTab;
