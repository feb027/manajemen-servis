import React, { useMemo, useRef, useEffect } from 'react';
import { FiArrowUp, FiArrowDown, FiEye, FiUserPlus, FiRefreshCw, FiEdit2, FiDollarSign, FiTrash2 } from 'react-icons/fi';
import { LuChevronsUpDown } from "react-icons/lu";

function ServiceOrderTable({ orders, technicians = [], onRowClick, sortConfig, requestSort, onAssignClick, onStatusUpdateClick, onEditClick, onDeleteClick, selectedOrderIds, onSelectRow, onSelectAll }) {

  const headerCheckboxRef = useRef(null);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      const numSelected = selectedOrderIds.size;
      const numVisible = orders.length;
      headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numVisible;
      headerCheckboxRef.current.checked = numSelected > 0 && numSelected === numVisible;
    }
  }, [selectedOrderIds, orders]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { // Use Indonesian locale
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Return original string on error
    }
  };

  // Helper function for status badges (could be moved to a shared util)
  const getStatusBadge = (status) => {
    const currentStatus = status || 'Baru'; // Default to 'Baru' if null/undefined
    let colorClass = 'bg-gray-100';
    let textClass = 'text-gray-800';

    switch (currentStatus.toLowerCase()) {
      case 'baru':
        colorClass = 'bg-blue-100'; textClass = 'text-blue-800'; break;
      // Change 'dikerjakan' to 'diproses'
      case 'diproses':
        colorClass = 'bg-yellow-100'; textClass = 'text-yellow-800'; break;
      // Add 'menunggu spare part'
      case 'menunggu spare part':
        colorClass = 'bg-orange-100'; textClass = 'text-orange-800'; break;
      case 'selesai':
        colorClass = 'bg-green-100'; textClass = 'text-green-800'; break;
      case 'dibatalkan':
        colorClass = 'bg-red-100'; textClass = 'text-red-800'; break;
    }
    return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${colorClass} ${textClass}`}>{currentStatus}</span>;
  };

  // Updated sort icon logic
  const getSortIcon = (columnKey) => {
    if (!sortConfig) return null; // Should not happen if used correctly
    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === 'ascending') {
         return <FiArrowUp className="inline-block w-4 h-4 ml-1 text-gray-700" />;
      }
      return <FiArrowDown className="inline-block w-4 h-4 ml-1 text-gray-700" />;
    } 
    // Use LuChevronsUpDown for inactive columns
    return <LuChevronsUpDown className="inline-block w-4 h-4 ml-1 text-gray-400 group-hover:text-gray-500 transition-colors" />;
  };

  // Memoize technician lookup for performance
  const technicianMap = useMemo(() => {
    if (!technicians || technicians.length === 0) return {};
    return technicians.reduce((acc, tech) => {
      acc[tech.id] = tech.full_name;
      return acc;
    }, {});
  }, [technicians]);

  if (!orders || orders.length === 0) {
    return <p className="text-center text-gray-500 mt-4 py-4">Belum ada order servis yang cocok.</p>;
  }

  // Updated helper for more accessible sort buttons
  const sortableHeaderProps = (key, label) => ({
    onClick: () => requestSort(key),
    // Added group class for hover effect on icon
    className: "group inline-flex items-center font-semibold text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] focus:ring-offset-1 rounded px-1 py-0.5", 
    title: `Sort by ${label || key}`,
    'aria-label': `Sort by ${label || key}`,
  });

  const getTechnicianName = (techId) => {
    if (!technicianMap || !techId) return '-';
    return technicianMap[techId] || '-';
  };

  const handleRowCheckboxChange = (e, orderId) => {
    onSelectRow(orderId, e.target.checked);
  };

  const handleSelectAllChange = (e) => {
    onSelectAll(e.target.checked);
  };

  const renderSortIndicator = (key) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    if (sortConfig.direction === 'ascending') {
      return <FiArrowUp className="inline-block w-4 h-4 ml-1 text-gray-700" />;
    }
    return <FiArrowDown className="inline-block w-4 h-4 ml-1 text-gray-700" />;
  };

  // Helper to format currency (copied from detail modal)
  const formatCurrency = (value) => {
    if (value == null) return '-'; // Return dash for null/undefined
    const numberFormatted = Number(value).toLocaleString('id-ID');
    return `Rp${numberFormatted}`; // Prepend Rp without space
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md mt-4">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
          <tr>
            <th scope="col" className="px-3 py-3 text-left">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                className="form-checkbox h-4 w-4 text-[#0ea5e9] border-gray-300 rounded focus:ring-[#0ea5e9] cursor-pointer"
                onChange={handleSelectAllChange}
                aria-label="Select all orders on this page"
              />
            </th>
            <th scope="col" className="py-3 px-4 w-24">
              <button {...sortableHeaderProps('id', 'ID Order')}>
                ID Order {renderSortIndicator('id')}
              </button>
            </th>
            <th scope="col" className="py-3 px-4">
              <button {...sortableHeaderProps('customer_name', 'Nama Pelanggan')}>
                Pelanggan {getSortIcon('customer_name')}
              </button>
            </th>
            <th scope="col" className="py-3 px-4">
              <button {...sortableHeaderProps('device_type', 'Perangkat')}>
                Perangkat {getSortIcon('device_type')}
              </button>
            </th>
            <th scope="col" className="py-3 px-4">
               Teknisi
            </th>
            <th scope="col" className="py-3 px-4 text-center">
              <button {...sortableHeaderProps('status', 'Status')}>
                Status {getSortIcon('status')}
              </button>
            </th>
            <th scope="col" className="py-3 px-4 text-right">
               <button {...sortableHeaderProps('cost', 'Biaya')}>
                    Biaya {getSortIcon('cost')}
                </button>
            </th>
            <th scope="col" className="py-3 px-4 text-right">
              <button {...sortableHeaderProps('created_at', 'Tanggal Masuk')}>
                Tanggal Masuk {getSortIcon('created_at')}
              </button>
            </th>
            <th scope="col" className="py-3 px-4 text-center w-40">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const technicianName = getTechnicianName(order.assigned_technician_id);
            
            return (
              <tr 
                key={order.id} 
                className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-sky-100 transition-colors duration-150 cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-sky-100' : ''}`} 
                onClick={() => onRowClick && onRowClick(order)}
              >
                <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-[#0ea5e9] border-gray-300 rounded focus:ring-[#0ea5e9] cursor-pointer"
                    checked={selectedOrderIds.has(order.id)}
                    onChange={(e) => handleRowCheckboxChange(e, order.id)}
                    aria-labelledby={`order-${order.id}-details`}
                  />
                </td>
                <td className="py-3 px-4 font-mono text-xs text-gray-700">
                  {String(order.id)?.substring(0, 8)}
                </td>
                <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                  {order.customer_name}
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-gray-700">{order.device_type || '-'}</span>
                  <br/>
                  <span className="text-xs text-gray-500">{order.brand_model || '-'}</span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600">
                  {technicianName}
                </td>
                <td className="py-3 px-4 text-center">
                  {getStatusBadge(order.status)}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-gray-700">
                    {formatCurrency(order.cost)}
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-right">
                  {formatDate(order.created_at)}
                </td>
                <td className="py-2 px-4 text-center space-x-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {/* Show Assign button always if handler exists */}
                  {onAssignClick && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAssignClick(order); }}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 transition-colors duration-150" 
                      title={order.assigned_technician_id ? "Ganti Teknisi" : "Tugaskan Teknisi"}
                      aria-label={order.assigned_technician_id ? "Ganti Teknisi" : "Tugaskan Teknisi"}
                    >
                      <FiUserPlus className="h-4 w-4 pointer-events-none" />
                    </button>
                  )}
                  {/* Show Update Status button always if handler exists */}
                  {onStatusUpdateClick && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onStatusUpdateClick(order); }}
                      className="p-2 text-gray-500 hover:text-green-600 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400 transition-colors duration-150" 
                      title="Update Status"
                      aria-label="Update Status"
                    >
                      <FiRefreshCw className="h-4 w-4 pointer-events-none" />
                    </button>
                  )}
                  {onEditClick && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditClick(order); }}
                      className="p-2 text-gray-500 hover:text-yellow-600 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-400 transition-colors duration-150" 
                      title="Edit Order"
                      aria-label="Edit Order"
                    >
                      <FiEdit2 className="h-4 w-4 pointer-events-none" />
                    </button>
                  )}
                  {onDeleteClick && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteClick(order); }}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 transition-colors duration-150" 
                      title="Hapus Order"
                      aria-label="Hapus Order"
                    >
                      <FiTrash2 className="h-4 w-4 pointer-events-none" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ServiceOrderTable;
