import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FiX, FiClock, FiUser, FiList, FiArrowRight } from 'react-icons/fi';
import { format } from 'date-fns'; // For formatting timestamps
import { id } from 'date-fns/locale'; // Indonesian locale

// Helper to render changes JSONB nicely
const renderChanges = (changes) => {
  if (!changes || changes.length === 0) {
    return <span className="text-gray-500 italic">N/A</span>;
  }
  // If changes is not an array (e.g., directly the object from older trigger versions), wrap it
  const changesArray = Array.isArray(changes) ? changes : [changes];

  return (
    <ul className="space-y-1 text-xs">
      {changesArray.map((change, index) => (
        <li key={index} className="flex items-start space-x-1.5">
          <span className="font-semibold text-gray-700 capitalize">{change.field}:</span>
          <span className="text-red-600 line-through">{JSON.stringify(change.old_value ?? 'null')}</span>
          <FiArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="text-green-700">{JSON.stringify(change.new_value ?? 'null')}</span>
        </li>
      ))}
    </ul>
  );
};


function InventoryHistoryModal({ isOpen, onClose, itemId, itemName }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);
    setLogs([]); // Clear previous logs

    try {
      // Fetch logs and join with users table to get full_name
      const { data, error: fetchError } = await supabase
        .from('inventory_logs')
        .select('created_at, action, changes, user_id') // Select user_id, not the nested user
        .eq('item_id', itemId)
        .order('created_at', { ascending: false }); // Show newest first

      if (fetchError) throw fetchError;
      if (!data) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs from logs
      const userIds = [...new Set(data.map(log => log.user_id).filter(id => id))];

      let userMap = {};
      // If there are user IDs, fetch user details from public.users
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users') // Query public.users table
          .select('id, full_name')
          .in('id', userIds);

        if (usersError) {
            // Log the error but don't block the display of logs
            console.error("Error fetching user details for logs:", usersError);
        } else {
            // Create a map for easy lookup
            userMap = usersData.reduce((map, user) => {
                map[user.id] = user.full_name;
                return map;
            }, {});
        }
      }

      // Process data to handle potential null user (though unlikely with SET NULL)
      const processedData = data.map(log => ({
          ...log,
          user_name: userMap[log.user_id] || (log.user_id ? `User ID: ${log.user_id.substring(0, 8)}...` : 'Sistem/Tidak Diketahui')
      }));

      setLogs(processedData || []);

    } catch (err) {
      console.error("Error fetching inventory logs:", err);
      setError(`Gagal memuat riwayat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  return (
    // The parent component should provide the backdrop and animation container
    <div
      className={`bg-white rounded-lg shadow-xl w-full sm:max-w-2xl lg:max-w-3xl flex flex-col overflow-hidden`} // Wider modal
      style={{ maxHeight: '90vh' }} // Prevent excessive height
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0 bg-gray-50">
        <h2 id="history-modal-title" className="text-lg font-semibold text-gray-800 flex items-center">
          <FiClock className="h-5 w-5 mr-2 text-blue-600"/>
          Riwayat Perubahan Item: <span className="ml-1 font-bold text-blue-700 truncate max-w-xs" title={itemName}>{itemName}</span> (ID: {itemId})
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

      {/* Body - Log List/Table */}
      <div className="p-5 flex-1 overflow-y-auto">
        {loading && (
          <div className="text-center py-10 text-gray-500">Memuat riwayat...</div>
        )}
        {error && (
          <div className="text-center py-10 text-red-500 bg-red-50 p-3 rounded border border-red-200">Error: {error}</div>
        )}
        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-10 text-gray-500 italic">Belum ada riwayat perubahan untuk item ini.</div>
        )}
        {!loading && !error && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Waktu</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Pengguna</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Aksi</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600 uppercase tracking-wider">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500" title={new Date(log.created_at).toISOString()}>
                      {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: id })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700 flex items-center">
                       <FiUser className="h-3.5 w-3.5 mr-1.5 text-gray-400"/> {log.user_name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                           log.action === 'CREATE' ? 'bg-green-100 text-green-800' : 
                           log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' : 
                           log.action === 'DELETE' ? 'bg-red-100 text-red-800' : 
                           'bg-gray-100 text-gray-800' // Fallback
                       }`}>
                           {log.action}
                       </span>
                    </td>
                    <td className="px-4 py-2">
                      {log.action === 'UPDATE' ? renderChanges(log.changes) : <span className="text-gray-500 italic">N/A</span>}
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

export default InventoryHistoryModal; 