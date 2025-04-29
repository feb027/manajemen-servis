import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Import supabase
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX } from 'react-icons/fi'; // Import icons
import { FiPackage, FiArchive, FiAlertTriangle, FiDollarSign, FiChevronLeft, FiChevronRight, FiDownload, FiFilter, FiChevronDown, FiTag, FiClock, FiPlusCircle, FiMinusCircle, FiInfo } from 'react-icons/fi'; // Added Plus/Minus Circle and Info
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'; // Import sorting icons
import { Menu, Transition, Popover } from '@headlessui/react' // Added Popover
import * as XLSX from 'xlsx'; // Import xlsx library
import InventoryFormModal from '../components/InventoryFormModal'; // Import modal (Placeholder)
import Toast from '../components/Toast'; // Import Toast component
import InventoryHistoryModal from '../components/InventoryHistoryModal'; // Import History Modal
import ConfirmModal from '../components/ConfirmModal'; // Import Confirm Modal

// Helper function to format currency
const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return 'Rp0';
  const numberFormatted = Number(value).toLocaleString('id-ID');
  return `Rp${numberFormatted}`;
};

// const LOW_STOCK_THRESHOLD = 5; // REMOVED: Will fetch dynamically
const ITEMS_PER_PAGE = 10;

function InventoryPage() {
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // --- Dynamic Settings State ---
  const [dynamicLowStockThreshold, setDynamicLowStockThreshold] = useState(5); // Default value
  const [loadingThreshold, setLoadingThreshold] = useState(true);

  // State for Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // State for Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // State for Advanced Filtering
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [availableCategories, setAvailableCategories] = useState(['Semua']);

  // State for Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // State for Bulk Selection
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  // State for Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null); // null for Add, item object for Edit

  // State for History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHistoryModalClosing, setIsHistoryModalClosing] = useState(false);
  const [isHistoryModalMounted, setIsHistoryModalMounted] = useState(false);
  const [itemForHistory, setItemForHistory] = useState(null); // Stores {id, name} for the history modal

  // State for Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirmModalClosing, setIsConfirmModalClosing] = useState(false);
  const [isConfirmModalMounted, setIsConfirmModalMounted] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // Stores { type: 'delete_single' | 'delete_bulk', payload: itemId | null }
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setAllInventoryItems(data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError(`Gagal memuat inventaris: ${err.message}`);
      setAllInventoryItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch Dynamic Settings ---
  const fetchDynamicLowStockThreshold = useCallback(async () => {
    setLoadingThreshold(true);
    try {
      const { data, error: thresholdError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'low_stock_threshold')
        .maybeSingle();

      if (thresholdError) throw thresholdError;

      const thresholdValue = data?.setting_value;
      if (thresholdValue !== null && thresholdValue !== undefined) {
        setDynamicLowStockThreshold(Number(thresholdValue));
      } else {
        console.warn("Low stock threshold setting not found, using default:", dynamicLowStockThreshold);
        // Keep the default state value if not found
      }
    } catch (err) {
      console.error("Error fetching low stock threshold:", err);
      // Don't set page error, maybe just a toast, keep default value
      // setToastMessage("Gagal memuat pengaturan batas stok, menggunakan default.");
    } finally {
      setLoadingThreshold(false);
    }
  }, [dynamicLowStockThreshold]); // Dependency on default state to avoid re-fetching if not found

  // Fetch available categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('category');

      if (error) throw error;

      const uniqueCategories = [
          'Semua',
          ...[...new Set(data.map(item => item.category).filter(cat => cat))].sort()
      ];
      setAvailableCategories(uniqueCategories);

    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(`Gagal memuat inventaris: ${err.message}`);
      setAllInventoryItems([]);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchDynamicLowStockThreshold(); // Fetch threshold on mount
  }, [fetchInventory, fetchCategories, fetchDynamicLowStockThreshold]); // Add fetchDynamicLowStockThreshold

  // Effect to debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Derived Data (Filtering & Sorting)
  const filteredSortedItems = useMemo(() => {
    let filteredData = [...allInventoryItems];

    // Apply Advanced Filters First
    if (showLowStockOnly) {
        filteredData = filteredData.filter(item => item.stock <= dynamicLowStockThreshold);
    }

    // Apply Category Filter
    if (categoryFilter !== 'Semua') {
        filteredData = filteredData.filter(item => item.category === categoryFilter);
    }

    // Apply Search Filter
    if (debouncedSearchTerm) {
      const lowercasedSearchTerm = debouncedSearchTerm.toLowerCase();
      filteredData = filteredData.filter(item =>
        (item.name?.toLowerCase().includes(lowercasedSearchTerm)) ||
        (item.sku?.toLowerCase().includes(lowercasedSearchTerm)) ||
        (item.description?.toLowerCase().includes(lowercasedSearchTerm))
      );
    }

    // Apply Sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (sortConfig.key === 'stock' || sortConfig.key === 'price') {
           aValue = Number(aValue) || 0;
           bValue = Number(bValue) || 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
           aValue = aValue.toLowerCase();
           bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  }, [allInventoryItems, debouncedSearchTerm, sortConfig, showLowStockOnly, categoryFilter, dynamicLowStockThreshold]); // Added dynamicLowStockThreshold dependency

  // Derived Data for Summary Cards (based on filtered & sorted)
  const summaryData = useMemo(() => {
    const totalItems = filteredSortedItems.length;
    const lowStockItems = filteredSortedItems.filter(item => item.stock <= dynamicLowStockThreshold).length;
    const totalValue = filteredSortedItems.reduce((sum, item) => sum + (item.stock * item.price), 0);
    return { totalItems, lowStockItems, totalValue };
  }, [filteredSortedItems, dynamicLowStockThreshold]); // Added dynamicLowStockThreshold dependency

  // Derived Data for Pagination
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSortedItems.slice(startIndex, endIndex);
  }, [filteredSortedItems, currentPage]);

  // Reset page number when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, sortConfig, showLowStockOnly, categoryFilter]);

  // Clear selection when filters, sort, or page change
  useEffect(() => {
    setSelectedItemIds(new Set());
  }, [debouncedSearchTerm, sortConfig, showLowStockOnly, currentPage, categoryFilter]);

  // --- Modal Control Logic ---
  const openModal = (item = null) => {
      setItemToEdit(item); // Set item for editing, or null for adding
      setIsModalOpen(true);
      setIsModalMounted(false); // Reset mount state for animation
  };

  const triggerCloseModal = () => {
      setIsModalClosing(true);
  };

  useEffect(() => {
      if (isModalClosing) {
          const timer = setTimeout(() => {
              setItemToEdit(null); // Clear item on close
              setIsModalOpen(false);
              setIsModalClosing(false);
          }, 300); // Match animation duration
          return () => clearTimeout(timer);
      }
  }, [isModalClosing]);

  useEffect(() => {
      if (isModalOpen && !isModalClosing) {
          const timer = setTimeout(() => setIsModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
      if (!isModalOpen && !isModalClosing) {
          setIsModalMounted(false);
      }
  }, [isModalOpen, isModalClosing]);

  useEffect(() => {
      const handleEsc = (event) => {
          // Close either modal on ESC
          if (event.keyCode === 27) {
              if (isModalOpen) triggerCloseModal();
              if (isHistoryModalOpen) triggerCloseHistoryModal();
              if (isConfirmModalOpen) triggerCloseConfirmModal(); // Close confirm modal too
          }
      };
      // Add listener if any modal is open
      if (isModalOpen || isHistoryModalOpen || isConfirmModalOpen) {
          window.addEventListener('keydown', handleEsc);
      }
      return () => {
          window.removeEventListener('keydown', handleEsc);
      };
  }, [isModalOpen, isHistoryModalOpen, isConfirmModalOpen]);

  // --- History Modal Control ---
  const openHistoryModal = (item) => {
      setItemForHistory({ id: item.id, name: item.name });
      setIsHistoryModalOpen(true);
      setIsHistoryModalMounted(false); // Reset mount state for animation
  };

  const triggerCloseHistoryModal = () => {
      setIsHistoryModalClosing(true);
  };

  useEffect(() => {
      if (isHistoryModalClosing) {
          const timer = setTimeout(() => {
              setItemForHistory(null); // Clear item on close
              setIsHistoryModalOpen(false);
              setIsHistoryModalClosing(false);
          }, 300); // Match animation duration
          return () => clearTimeout(timer);
      }
  }, [isHistoryModalClosing]);

  useEffect(() => {
      if (isHistoryModalOpen && !isHistoryModalClosing) {
          const timer = setTimeout(() => setIsHistoryModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
      if (!isHistoryModalOpen && !isHistoryModalClosing) {
          setIsHistoryModalMounted(false);
      }
  }, [isHistoryModalOpen, isHistoryModalClosing]);

  // --- Confirmation Modal Control ---
  const openConfirmModal = (actionType, payload = null) => {
      setConfirmAction({ type: actionType, payload: payload });
      setIsConfirmModalOpen(true);
      setIsConfirmModalMounted(false); // Reset mount state for animation
  };

  const triggerCloseConfirmModal = () => {
      if (isProcessingConfirm) return; // Prevent closing while processing
      setIsConfirmModalClosing(true);
  };

  useEffect(() => {
      if (isConfirmModalClosing) {
          const timer = setTimeout(() => {
              setConfirmAction(null); // Clear action on close
              setIsConfirmModalOpen(false);
              setIsConfirmModalClosing(false);
              setIsProcessingConfirm(false); // Reset processing state
          }, 300); // Match animation duration
          return () => clearTimeout(timer);
      }
  }, [isConfirmModalClosing]);

  useEffect(() => {
      if (isConfirmModalOpen && !isConfirmModalClosing) {
          const timer = setTimeout(() => setIsConfirmModalMounted(true), 10);
          return () => clearTimeout(timer);
      }
      if (!isConfirmModalOpen && !isConfirmModalClosing) {
          setIsConfirmModalMounted(false);
      }
  }, [isConfirmModalOpen, isConfirmModalClosing]);

  // --- Highlight Helper ---
  const highlightMatch = (text, query) => {
    if (!query || !text) {
      return text;
    }
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-yellow-200 font-semibold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // --- Quick Stock Adjustment Handler ---
  const handleAdjustStock = async (item, amount) => {
      const newStock = (item.stock || 0) + amount;
      if (newStock < 0) {
          setToastMessage("Stok tidak boleh kurang dari 0.");
          return; // Prevent going below zero
      }

      // Optimistic UI update (optional but improves perceived performance)
      // setAllInventoryItems(prevItems => 
      //     prevItems.map(i => i.id === item.id ? { ...i, stock: newStock } : i)
      // );

      try {
          const { error } = await supabase
              .from('inventory_items')
              .update({ stock: newStock, updated_at: new Date() })
              .eq('id', item.id);

          if (error) throw error;

          // No toast needed for quick adjust usually, rely on log and visual update
          // setToastMessage(`Stok ${item.name} diupdate.`);

          // Refresh data to get latest state and trigger log (if trigger is set up)
          // If using optimistic update, maybe only fetch if error occurred
          fetchInventory(); 

      } catch (err) {
          console.error("Error adjusting stock:", err);
          setToastMessage(`Gagal update stok: ${err.message}`);
          // Revert optimistic update if it failed
          // fetchInventory(); // Ensure data is correct after error
      }
  };

  // Placeholder handlers for actions
  const handleEdit = (item) => {
      console.log("Edit item:", item); 
      openModal(item); // Open modal in edit mode
  };

  const handleDelete = async (itemId, itemName) => {
      // Open confirmation modal instead of window.confirm
      openConfirmModal('delete_single', { id: itemId, name: itemName });
  };

  // Moved actual delete logic here
  const executeDeleteSingle = async (itemId) => {
      console.log("Attempting delete item ID:", itemId);

      try {
          setIsProcessingConfirm(true); // Use processing state
          setError(null);
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', itemId);

          if (error) {
            throw error; // Throw error to be caught below
          }

          // Success
          setToastMessage('Item berhasil dihapus.');
          fetchInventory(); // Refresh the list after delete
          triggerCloseConfirmModal(); // Close modal on success

      } catch (err) {
        console.error("Error deleting inventory item:", err);
        setToastMessage(`Gagal menghapus item: ${err.message}`);
        setError(`Gagal menghapus item: ${err.message}`); // Also set page error potentially
        // Keep confirmation modal open on error? Or close? Let's close for now.
        triggerCloseConfirmModal(); 
      } finally {
          setIsProcessingConfirm(false); // Reset processing state
      }
  };

  // --- Sort Handlers --- 
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending'; // Toggle back or remove sort optionally
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="inline ml-1 h-3 w-3 text-gray-400" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <FaSortUp className="inline ml-1 h-3 w-3 text-blue-500" />;
    }
    return <FaSortDown className="inline ml-1 h-3 w-3 text-blue-500" />;
  };

  // --- Pagination Handlers & Helpers --- 
  const totalResults = filteredSortedItems.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
    }
  };

  const handlePageClick = (page) => {
     setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const delta = 1;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    let l;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  // --- Filter Clear Handler ---
  const handleClearFilters = () => {
      setSearchTerm(''); // Clears debounced term via useEffect
      setShowLowStockOnly(false);
      setCategoryFilter('Semua');
      // Optionally reset sorting?
      // setSortConfig({ key: 'name', direction: 'ascending' });
      // Page reset is handled by useEffect watching filters
  };

  // --- Search Handler ---
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Placeholder for saving (Add/Edit)
  const handleSaveItem = async (formData, itemId) => {
    const isEditMode = Boolean(itemId);

    // Prepare data for Supabase (ensure numbers are numbers)
    const itemData = {
      name: formData.name,
      sku: formData.sku || null, // Use null if empty string
      category: formData.category || null, // Add category
      description: formData.description || null,
      stock: Number(formData.stock) || 0, // Ensure it's a number
      price: Number(formData.price) || 0, // Ensure it's a number
      updated_at: new Date() // Always set updated_at
    };

    try {
      let error;
      if (isEditMode) {
        // --- UPDATE --- 
        console.log("Updating item:", itemId, itemData);
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', itemId);
        error = updateError;
      } else {
        // --- INSERT --- 
        console.log("Inserting new item:", itemData);
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert([{ ...itemData, created_at: new Date() }]); // Add created_at for new items
        error = insertError;
      }

      if (error) {
        throw error; // Throw error to be caught by catch block
      }

      // Success
      setToastMessage(isEditMode ? 'Item berhasil diperbarui.' : 'Item baru berhasil ditambahkan.');
      triggerCloseModal();
      fetchInventory(); // Re-fetch the inventory list
      fetchCategories(); // Re-fetch categories in case a new one was added

    } catch (err) {
        console.error("Error saving inventory item:", err);
        // Set error message for the modal (passed back via throw)
        // We also set a toast for general feedback
        setToastMessage(`Gagal menyimpan item: ${err.message}`); 
        throw err; // Re-throw the error so the modal can display it internally
    }
  };

  // --- Bulk Selection Handlers ---
  const handleSelectItem = (itemId) => {
    setSelectedItemIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(itemId)) {
        newSelectedIds.delete(itemId);
      } else {
        newSelectedIds.add(itemId);
      }
      return newSelectedIds;
    });
  };

  const handleSelectAllOnPage = (event) => {
    const isChecked = event.target.checked;
    setSelectedItemIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      paginatedItems.forEach(item => {
        if (isChecked) {
          newSelectedIds.add(item.id);
        } else {
          newSelectedIds.delete(item.id);
        }
      });
      return newSelectedIds;
    });
  };

  // Determine header checkbox state (checked, indeterminate, unchecked)
  const isAllSelectedOnPage = useMemo(() => {
      return paginatedItems.length > 0 && paginatedItems.every(item => selectedItemIds.has(item.id));
  }, [paginatedItems, selectedItemIds]);

  const isSomeSelectedOnPage = useMemo(() => {
      return paginatedItems.some(item => selectedItemIds.has(item.id)) && !isAllSelectedOnPage;
  }, [paginatedItems, selectedItemIds, isAllSelectedOnPage]);

  // --- Bulk Delete Handler ---
  const handleDeleteSelected = async () => {
      // Open confirmation modal instead of window.confirm
      if (selectedItemIds.size > 0) {
          openConfirmModal('delete_bulk');
      } else {
          setToastMessage("Tidak ada item yang dipilih.");
      }
  };

  // Moved actual bulk delete logic here
  const executeDeleteBulk = async () => {
      if (selectedItemIds.size === 0) {
          setToastMessage("Tidak ada item yang dipilih untuk dihapus.");
          return;
      }

      setIsProcessingConfirm(true); // Use processing state
      setError(null);
      try {
          const idsToDelete = Array.from(selectedItemIds);
          const { error: deleteError } = await supabase
              .from('inventory_items')
              .delete()
              .in('id', idsToDelete);

          if (deleteError) throw deleteError;

          setToastMessage(`${idsToDelete.length} item berhasil dihapus.`);
          setSelectedItemIds(new Set()); // Clear selection
          fetchInventory(); // Refresh data
          triggerCloseConfirmModal(); // Close modal on success
      } catch (err) {
          console.error("Error deleting selected items:", err);
          setToastMessage(`Gagal menghapus item: ${err.message}`);
          setError(`Gagal menghapus item: ${err.message}`);
          // Keep confirmation modal open on error? Or close? Let's close for now.
          triggerCloseConfirmModal();
      } finally {
          setIsProcessingConfirm(false); // Reset processing state
      }
  };

  // --- Export Handlers ---

  // Function to safely format CSV fields (handles commas, quotes, newlines)
  const formatCSVField = (field) => {
      if (field === null || field === undefined) return '';
      const stringField = String(field);
      // Escape double quotes by doubling them
      const escapedField = stringField.replace(/"/g, '""');
      // If field contains comma, newline, or double quote, enclose in double quotes
      if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
        return `"${escapedField}"`;
      }
      return escapedField;
  };

  // Shared export data preparation
  const getExportData = () => {
      const headers = ['ID', 'Nama Item', 'SKU', 'Deskripsi', 'Stok', 'Harga', 'Dibuat', 'Diperbarui'];
      const keys = ['id', 'name', 'sku', 'description', 'stock', 'price', 'created_at', 'updated_at'];
      const data = filteredSortedItems.map(item => {
          return keys.map(key => item[key]); // Get raw values
      });
      return { headers, data };
  };

  const handleExportCSV = () => {
    if (filteredSortedItems.length === 0) {
        setToastMessage("Tidak ada data untuk diekspor.");
        return;
    }

    const { headers, data } = getExportData();

    // Create CSV header row
    const csvHeader = headers.map(formatCSVField).join(',') + '\r\n';

    // Create CSV data rows
    const csvRows = data.map(row => {
        return row.map(formatCSVField).join(',');
    }).join('\r\n');

    // Combine header and rows
    const csvString = csvHeader + csvRows;

    // Create Blob
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const date = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `inventaris_${date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage("Data berhasil diekspor ke CSV.");
    } else {
        setToastMessage("Ekspor CSV tidak didukung oleh browser Anda.");
    }
  };

  const handleExportXLSX = () => {
      if (filteredSortedItems.length === 0) {
          setToastMessage("Tidak ada data untuk diekspor.");
          return;
      }

      try {
        const { headers, data } = getExportData();
        
        // Combine headers and data for aoa_to_sheet
        const exportData = [headers, ...data];

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(exportData);

        // Optional: Adjust column widths (example: set first column width)
        // ws['!cols'] = [{ wch: 30 }]; // Adjust width as needed

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventaris");

        // Trigger download
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `inventaris_${date}.xlsx`);

        setToastMessage("Data berhasil diekspor ke XLSX.");

      } catch (err) {
          console.error("Error exporting XLSX:", err);
          setToastMessage(`Gagal mengekspor XLSX: ${err.message || 'Terjadi kesalahan'}`);
          // Potentially set page error as well
          // setError(`Gagal mengekspor XLSX: ${err.message}`); 
      }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Component */} 
      <Toast 
          message={toastMessage} 
          onClose={() => setToastMessage('')} 
      />
    
      
      {/* Summary Cards Section */} 
      {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {/* Card 1: Total Items */} 
              <div 
                  className="bg-white p-5 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-[1.02]"
              >
                  <div>
                      <div className="flex items-center space-x-1.5">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Item Unik</p>
                          <Popover className="relative flex">
                              <Popover.Button className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 rounded-full p-0.5">
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
                                  <Popover.Panel className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 text-xs text-center text-white bg-gray-700 rounded-md shadow-lg">
                                      Jumlah item unik yang sesuai dengan filter aktif.
                                  </Popover.Panel>
                              </Transition>
                          </Popover>
                      </div>
                      <p className="text-2xl font-semibold text-gray-900">{summaryData.totalItems}</p>
                  </div>
                  <div className="bg-blue-100 text-blue-600 rounded-lg p-3">
                      <FiArchive className="h-6 w-6" />
                  </div>
              </div>
              {/* Card 2: Low Stock Items */} 
              <div 
                  className={`bg-white p-5 rounded-lg shadow-md flex items-center justify-between transition-all duration-150 transform hover:scale-[1.02] cursor-pointer ${summaryData.lowStockItems > 0 ? 'border border-red-300' : ''} ${showLowStockOnly ? 'ring-2 ring-yellow-400 ring-offset-1 scale-[1.01]' : ''}`}
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)} // Toggle filter on click
              >
                  <div>
                      <div className="flex items-center space-x-1.5">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Stok Menipis (&le; {loadingThreshold ? '...' : dynamicLowStockThreshold})</p>
                          <Popover className="relative flex">
                              {({ open }) => (
                                  <>
                                      <Popover.Button className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 rounded-full p-0.5">
                                          <FiInfo className="h-3.5 w-3.5" />
                                      </Popover.Button>
                                      <Transition
                                          show={open} // Control visibility
                                          as={Fragment}
                                          enter="transition ease-out duration-100"
                                          enterFrom="opacity-0 translate-y-1"
                                          enterTo="opacity-100 translate-y-0"
                                          leave="transition ease-in duration-75"
                                          leaveFrom="opacity-100 translate-y-0"
                                          leaveTo="opacity-0 translate-y-1"
                                      >
                                          <Popover.Panel static className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 p-2 text-xs text-center text-white bg-gray-700 rounded-md shadow-lg">
                                              Jumlah item dengan stok {loadingThreshold ? '...' : dynamicLowStockThreshold} atau kurang. Klik kartu ini untuk memfilter.
                                          </Popover.Panel>
                                      </Transition>
                                  </>
                              )}
                          </Popover>
                      </div>
                      <p className={`text-2xl font-semibold ${summaryData.lowStockItems > 0 ? 'text-red-600' : 'text-gray-900'}`}>{summaryData.lowStockItems}
                          {summaryData.totalItems > 0 && (
                              <span className="text-sm font-normal text-gray-500 ml-1">
                                  ({((summaryData.lowStockItems / summaryData.totalItems) * 100).toFixed(0)}%)
                              </span>
                          )}
                      </p>
                  </div>
                  <div className={`${summaryData.lowStockItems > 0 ? (showLowStockOnly ? 'bg-red-500' : 'bg-red-100') : (showLowStockOnly ? 'bg-yellow-500' : 'bg-yellow-100')} ${summaryData.lowStockItems > 0 ? (showLowStockOnly ? 'text-white' : 'text-red-600') : (showLowStockOnly ? 'text-white' : 'text-yellow-600') } rounded-lg p-3 transition-colors duration-150`}>
                      <FiAlertTriangle className="h-6 w-6" />
                  </div>
              </div>
              {/* Card 3: Total Inventory Value */} 
              <div 
                  className="bg-white p-5 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-[1.02]"
              >
                  <div>
                      <div className="flex items-center space-x-1.5">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Estimasi Nilai</p>
                          <Popover className="relative flex">
                              <Popover.Button className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 rounded-full p-0.5">
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
                                  <Popover.Panel className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-60 p-2 text-xs text-center text-white bg-gray-700 rounded-md shadow-lg">
                                      Estimasi total nilai dari item yang ditampilkan (Jumlah Stok x Harga Item).
                                  </Popover.Panel>
                              </Transition>
                          </Popover>
                      </div>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summaryData.totalValue)}</p>
                  </div>
                  <div className="bg-green-100 text-green-600 rounded-lg p-3">
                      <FiDollarSign className="h-6 w-6" />
                  </div>
              </div>
          </div>
      )}
      
      {/* Toolbar Section */} 
      <div className="mb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4 p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200">
          {/* Left Side: Filters & Actions Grouped */} 
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 w-full md:w-auto">
              {/* Filter Group */} 
              <div className="flex items-center gap-3 flex-wrap border-b sm:border-b-0 sm:border-r border-gray-300 pb-3 sm:pb-0 sm:pr-4">
                  {/* Low Stock Filter */} 
                  <button
                      onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                      className={`inline-flex items-center px-3 py-1.5 border rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-150 ${showLowStockOnly 
                          ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600 focus:ring-yellow-500 font-semibold' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-blue-500'}`}
                      title={showLowStockOnly ? "Tampilkan Semua Stok" : `Hanya Stok Menipis (≤ ${loadingThreshold ? '...' : dynamicLowStockThreshold})`}
                      disabled={loadingThreshold} // Disable while loading threshold
                  >
                      <FiFilter className={`mr-1.5 h-4 w-4 ${showLowStockOnly ? 'text-white' : 'text-gray-400'}`} />
                      {showLowStockOnly ? 'Stok Menipis Aktif' : 'Filter Stok Menipis'}
                  </button>
                  
                  {/* Category Filter */} 
                  <div className={`relative ${categoryFilter !== 'Semua' ? 'ring-2 ring-blue-400 ring-offset-1 rounded-md' : ''}`}> 
                      <label htmlFor="categoryFilter" className="sr-only">Filter Kategori</label>
                      <div className={`absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none ${categoryFilter !== 'Semua' ? 'text-blue-600' : 'text-gray-400'}`}>
                          <FiTag className="h-3.5 w-3.5" />
                      </div>
                      <select
                          id="categoryFilter"
                          name="categoryFilter"
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className={`block w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 bg-white rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 focus:border-blue-500 transition ease-in-out duration-150 ${categoryFilter !== 'Semua' ? 'font-semibold text-blue-700' : ''}`}
                      >
                          {availableCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                          ))}
                      </select>
                  </div>

                  {/* Clear Filters Button (Conditional) */} 
                  {(showLowStockOnly || categoryFilter !== 'Semua' || searchTerm !== '') && (
                      <button
                          onClick={handleClearFilters}
                          className="inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md text-xs font-medium bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition"
                          title="Hapus semua filter & pencarian"
                      >
                          <FiX className="-ml-0.5 mr-1 h-3 w-3" /> Clear Filters
                      </button> 
                  )}
              </div> 

              {/* Action Group */} 
              <div className="flex items-center gap-3 flex-wrap pt-3 sm:pt-0">
                  {/* Export Dropdown */} 
                  <Menu as="div" className="relative inline-block text-left">
                      <div>
                          <Menu.Button className="inline-flex w-full justify-center items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-100 transition">
                              <FiDownload className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
                              Ekspor
                              <FiChevronDown className="-mr-1 ml-1 h-4 w-4" aria-hidden="true" />
                          </Menu.Button>
                      </div>
                      <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                      >
                          <Menu.Items className="absolute left-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                  <Menu.Item>
                                      {({ active }) => (
                                          <button
                                              onClick={handleExportCSV}
                                              className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-md px-3 py-1.5 text-xs`}
                                          >
                                              <span className="mr-1.5">CSV</span> (.csv)
                                          </button>
                                      )}
                                  </Menu.Item>
                                  <Menu.Item>
                                      {({ active }) => (
                                          <button
                                              onClick={handleExportXLSX}
                                              className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center rounded-md px-3 py-1.5 text-xs`}
                                          >
                                              <span className="mr-1.5">Excel</span> (.xlsx)
                                          </button>
                                      )}
                                  </Menu.Item>
                              </div>
                          </Menu.Items>
                      </Transition>
                  </Menu>

                  {/* Delete Selected Button (Conditional) */} 
                  {selectedItemIds.size > 0 && (
                      <button
                          onClick={handleDeleteSelected}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={`Hapus ${selectedItemIds.size} item terpilih`}
                      >
                          <FiTrash2 className="-ml-0.5 mr-1.5 h-4 w-4" />
                          Hapus ({selectedItemIds.size})
                      </button>
                  )}
              </div>
          </div> 

          {/* Right Side: Search & Add Group */} 
          <div className="flex items-center gap-3 w-full md:w-auto md:flex-shrink-0">
              {/* Search Input */} 
              <div className="relative flex-grow w-full md:w-auto max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                      type="text"
                      id="inventorySearch"
                      name="inventorySearch"
                      placeholder="Cari Nama, SKU..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="block w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                  />
                  {searchTerm && (
                      <button 
                          type="button"
                          onClick={() => setSearchTerm('')} 
                          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label="Clear search"
                      >
                          <FiX className="h-4 w-4" />
                      </button>
                  )}
              </div>
              {/* Add Item Button */} 
              <button
                  onClick={() => openModal(null)} 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:border-blue-800 focus:ring focus:ring-blue-300 disabled:opacity-25 transition whitespace-nowrap"
              >
                  <FiPlus className="-ml-0.5 mr-1.5 h-4 w-4"/> Tambah Item
              </button>
          </div>
      </div>

      {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded mb-4">Error: {error}</p>}

      {/* Inventory Table */} 
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
         {/* Removed H2 here as header is above */} 

         {/* Loading State */} 
          {loading && (
             <div className="px-6 py-10 text-center text-gray-500">
                  <div className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memuat data inventaris...
                  </div>
              </div>
          )}

          {/* Table Container */} 
          {!loading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    {/* Checkbox Header */} 
                    <th scope="col" className="p-4">
                      <div className="flex items-center">
                        <input
                          id="checkbox-all-search"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          checked={isAllSelectedOnPage}
                          ref={el => el && (el.indeterminate = isSomeSelectedOnPage)}
                          onChange={handleSelectAllOnPage}
                          disabled={paginatedItems.length === 0} // Disable if no items on page
                        />
                        <label htmlFor="checkbox-all-search" className="sr-only">checkbox</label>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => requestSort('name')} className={`flex items-center focus:outline-none ${sortConfig.key === 'name' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                        Nama Item {getSortIcon('name')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => requestSort('category')} className={`flex items-center focus:outline-none ${sortConfig.key === 'category' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                        Kategori {getSortIcon('category')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => requestSort('stock')} className={`flex items-center focus:outline-none ${sortConfig.key === 'stock' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                        Stok {getSortIcon('stock')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => requestSort('price')} className={`flex items-center focus:outline-none ${sortConfig.key === 'price' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                        Harga {getSortIcon('price')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Conditional Rendering inside tbody */} 
                  {!loading && filteredSortedItems.length === 0 ? (
                    /* Empty State Row */
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500"> {/* Increased colspan */} 
                        <div className="flex flex-col items-center justify-center">
                          <FiPackage className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-lg italic">
                            {debouncedSearchTerm
                              ? "Tidak ada item yang cocok dengan pencarian Anda."
                              : "Belum ada item inventaris."}
                          </p>
                          {!debouncedSearchTerm && (
                             <button
                               onClick={() => openModal(null)} // Open add modal directly
                               className="mt-4 inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 border border-transparent rounded-md font-semibold text-xs hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                             >
                               <FiPlus className="-ml-0.5 mr-1 h-4"/> Tambah Item Baru
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* Data Rows */
                    paginatedItems.map((item) => (
                      <tr 
                        key={item.id}
                        className={`group transition duration-150 ease-in-out ${selectedItemIds.has(item.id) ? 'bg-blue-100' : 'odd:bg-white even:bg-gray-50'} hover:bg-blue-50`} // Added group class for hover effect
                      >
                        {/* Checkbox Cell */} 
                        <td className="w-4 p-4">
                           <div className="flex items-center">
                            <input
                              id={`checkbox-table-search-${item.id}`}
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              checked={selectedItemIds.has(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                            />
                            <label htmlFor={`checkbox-table-search-${item.id}`} className="sr-only">checkbox</label>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {highlightMatch(item.name, debouncedSearchTerm)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={item.description || ''}>
                          {highlightMatch(item.description, debouncedSearchTerm) || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.stock <= dynamicLowStockThreshold ? 'text-red-600 font-semibold' : 'text-gray-500'}`}> 
                          <div className="flex items-center justify-between"> {/* Use flex to position buttons */} 
                            <span>{item.stock}</span>
                            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"> {/* Buttons appear on hover */} 
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAdjustStock(item, -1); }} 
                                className="text-red-500 hover:text-red-700 disabled:opacity-30 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer"
                                title="Kurangi Stok (-1)"
                                disabled={item.stock <= 0} // Disable if stock is 0
                              >
                                <FiMinusCircle className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAdjustStock(item, 1); }} 
                                className="text-green-500 hover:text-green-700 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-green-400 cursor-pointer"
                                title="Tambah Stok (+1)"
                              >
                                <FiPlusCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1"> 
                          <button
                            onClick={(e) => { e.stopPropagation(); openHistoryModal(item); }} // Prevent row select, open history
                            className="text-cyan-600 hover:text-cyan-900 hover:bg-cyan-100 p-1 rounded transition duration-150 ease-in-out cursor-pointer"
                            title="Lihat Riwayat Perubahan"
                          >
                            <FiClock className="h-4 w-4"/>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }} // Prevent row select
                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 p-1 rounded transition duration-150 ease-in-out cursor-pointer"
                            title="Edit Item"
                          >
                            <FiEdit2 className="h-4 w-4"/>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name); }} // Pass name too
                            className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1 rounded transition duration-150 ease-in-out cursor-pointer"
                            title="Hapus Item" // Tooltip added
                          >
                            <FiTrash2 className="h-4 w-4"/>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

         {/* Pagination Controls */} 
         {!loading && totalPages > 1 && (
             <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg shadow-md">
                 {/* Left Side: Results Text */} 
                 <div className="flex flex-1 justify-between sm:hidden">
                     <button
                         onClick={handlePrevPage}
                         disabled={currentPage === 1}
                         className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         Previous
                     </button>
                     <button
                         onClick={handleNextPage}
                         disabled={currentPage === totalPages}
                         className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         Next
                     </button>
                 </div>
                 <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                     <div>
                         <p className="text-sm text-gray-700">
                             Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalResults)}</span> of{' '}
                             <span className="font-medium">{totalResults}</span> results
                         </p>
                     </div>
                     <div>
                         <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                             <button
                                 onClick={handlePrevPage}
                                 disabled={currentPage === 1}
                                 className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 <span className="sr-only">Previous</span>
                                 <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                             </button>
                             {/* Page Numbers */} 
                             {getPageNumbers().map((page, index) => (
                                <button
                                    key={index} // Use index as key
                                    onClick={() => typeof page === 'number' && handlePageClick(page)}
                                    disabled={page === '...'}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${ 
                                        currentPage === page 
                                            ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                    } ${page === '...' ? 'text-gray-400 cursor-default' : ''}`}
                                    aria-current={currentPage === page ? 'page' : undefined}
                                >
                                    {page}
                                </button>
                             ))}
                             <button
                                 onClick={handleNextPage}
                                 disabled={currentPage === totalPages}
                                 className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 <span className="sr-only">Next</span>
                                 <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                             </button>
                         </nav>
                     </div>
                 </div>
             </div>
         )}
      </div>

      {/* Inventory Form Modal */} 
      {(isModalOpen || isModalClosing) && (
        // Outer backdrop
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isModalMounted && !isModalClosing ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={triggerCloseModal} 
        >
          {/* Inner wrapper for content and transition */}
          <div 
            className={`transform transition-all duration-300 ease-in-out ${isModalMounted && !isModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()} 
          >
             {/* Placeholder for the actual modal component */} 
             {/* In a real scenario, InventoryFormModal would be rendered here */} 
             <InventoryFormModal 
                isOpen={isModalMounted}
                isClosing={isModalClosing}
                onClose={triggerCloseModal} 
                onSave={handleSaveItem} 
                itemToEdit={itemToEdit}
             />
          </div>
        </div>
      )}

      {/* History Modal */} 
      {(isHistoryModalOpen || isHistoryModalClosing) && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isHistoryModalMounted && !isHistoryModalClosing ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={triggerCloseHistoryModal} // Close on backdrop click
        >
          {/* Inner wrapper for content and transition */} 
          <div 
            className={`transform transition-all duration-300 ease-in-out ${isHistoryModalMounted && !isHistoryModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
             <InventoryHistoryModal
                isOpen={isHistoryModalMounted} // Pass mount state for internal checks if needed
                onClose={triggerCloseHistoryModal}
                itemId={itemForHistory?.id}
                itemName={itemForHistory?.name}
             />
          </div>
        </div>
      )}

      {/* Confirmation Modal */} 
      {(isConfirmModalOpen || isConfirmModalClosing) && (
        <div 
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isConfirmModalMounted && !isConfirmModalClosing ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={!isProcessingConfirm ? triggerCloseConfirmModal : undefined}
        >
          <div 
            className={`transform transition-all duration-300 ease-in-out ${isConfirmModalMounted && !isConfirmModalClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()} 
          >
             <ConfirmModal
                onClose={triggerCloseConfirmModal}
                onConfirm={() => {
                    if (confirmAction?.type === 'delete_single') {
                        executeDeleteSingle(confirmAction.payload.id);
                    } else if (confirmAction?.type === 'delete_bulk') {
                        executeDeleteBulk();
                    }
                }}
                title={confirmAction?.type === 'delete_single' ? "Hapus Item Inventaris?" : "Hapus Item Terpilih?"}
                message={
                    confirmAction?.type === 'delete_single' 
                    ? `Apakah Anda yakin ingin menghapus item "${confirmAction?.payload?.name ?? ''}"?`
                    : `Apakah Anda yakin ingin menghapus ${selectedItemIds.size} item inventaris yang dipilih?`
                }
                confirmText="Hapus"
                confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                isConfirming={isProcessingConfirm}
             />
          </div>
        </div>
      )}

    </div>
  );
}

export default InventoryPage; 