import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FiX, FiClock, FiUser, FiTool, FiList, FiArrowRight } from 'react-icons/fi';
import { Popover, Transition } from '@headlessui/react';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Status Badge Helper (similar to TechnicianDashboard)
const getStatusBadge = (status) => {
  let baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
  switch (status) {
    case 'Baru':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'Diproses':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'Selesai':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'Dibatalkan':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'Menunggu Spare Part':
      return `${baseClasses} bg-purple-100 text-purple-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

function CustomerServiceHistoryModal({ isOpen, onClose, customer }) {
  const [fetchedOrders, setFetchedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });

  const fetchServiceHistory = useCallback(async () => {
    if (!customer?.id) return;

    setLoading(true);
    setError(null);
    setFetchedOrders([]);

    try {
      // Fetch service orders for the specific customer ID
      // Join with users table to get technician name
      const { data, error: fetchError } = await supabase
        .from('service_orders')
        .select(`
          id,
          created_at,
          device_type,
          brand_model,
          status,
          notes,
          assigned_technician_id,
          users!assigned_technician_id ( full_name ) 
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const processedData = data.map(order => ({
        ...order,
        technician_name: order.users?.full_name || (order.assigned_technician_id ? 'Teknisi Tidak Ditemukan' : 'N/A')
      }));

      setFetchedOrders(processedData || []);

    } catch (err) {
      console.error("Error fetching customer service history:", err);
      setError(`Gagal memuat riwayat servis: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    if (isOpen && customer?.id) {
      fetchServiceHistory();
      setSortConfig({ key: 'created_at', direction: 'descending' });
    }
  }, [isOpen, customer?.id, fetchServiceHistory]);

  const sortedOrders = useMemo(() => {
    let sortableItems = [...fetchedOrders];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'created_at') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
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
    return sortableItems;
  }, [fetchedOrders, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    } else if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
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

  return (
    // Parent component provides backdrop/animation
    <div
      className={`bg-white rounded-lg shadow-xl w-full sm:max-w-3xl lg:max-w-4xl flex flex-col overflow-hidden`}
      style={{ maxHeight: '90vh' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0 bg-gray-50">
        <h2 id="history-modal-title" className="text-lg font-semibold text-gray-800 flex items-center">
          <FiList className="h-5 w-5 mr-2 text-blue-600"/>
          Riwayat Servis Pelanggan: <span className="ml-1 font-bold text-blue-700 truncate max-w-xs" title={customer?.full_name}>{customer?.full_name}</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
          aria-label="Tutup"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body - Service Order List/Table */}
      <div className="p-5 flex-1 overflow-y-auto">
        {loading && (
          <div className="text-center py-10 text-gray-500">Memuat riwayat servis...</div>
        )}
        {error && (
          <div className="text-center py-10 text-red-500 bg-red-50 p-3 rounded border border-red-200">Error: {error}</div>
        )}
        {!loading && !error && sortedOrders.length === 0 && (
          <div className="text-center py-10 text-gray-500 italic">Pelanggan ini belum memiliki riwayat servis.</div>
        )}
        {!loading && !error && sortedOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">
                    <button onClick={() => requestSort('created_at')} className={`flex items-center focus:outline-none ${sortConfig.key === 'created_at' ? 'text-gray-700 font-semibold' : 'text-gray-600 hover:text-gray-800'}`}>
                      Tanggal Masuk {getSortIcon('created_at')}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Perangkat</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Teknisi</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Catatan Teknisi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                      {format(new Date(order.created_at), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-800 font-medium">
                      {order.device_type} - {order.brand_model}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600 flex items-center">
                      <FiUser className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0"/>
                      {order.technician_name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                       <span className={getStatusBadge(order.status)}>
                           {order.status}
                       </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-sm">
                      {order.notes ? (
                        <Popover className="relative">
                          {({ open }) => (
                            <>
                              <Popover.Button className="text-left focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 rounded px-0.5 py-0.5 -ml-0.5 -my-0.5">
                                <span className="block max-w-sm truncate cursor-pointer hover:text-gray-900">
                                  {order.notes}
                                </span>
                              </Popover.Button>
                              <Transition
                                show={open}
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="opacity-0 translate-y-1"
                                enterTo="opacity-100 translate-y-0"
                                leave="transition ease-in duration-75"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 translate-y-1"
                              >
                                <Popover.Panel static className="absolute z-20 w-72 max-w-md px-3 py-2 mt-1 text-xs text-white bg-gray-800 rounded-md shadow-lg transform -translate-x-1/2 left-1/2 sm:left-auto sm:translate-x-0">
                                  {order.notes}
                                </Popover.Panel>
                              </Transition>
                            </>
                          )}
                        </Popover>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-lg flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

export default CustomerServiceHistoryModal; 