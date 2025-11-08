import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FiClock, FiLoader, FiUser, FiActivity, FiCheckSquare, FiPlusCircle, FiUserCheck, FiMessageSquare, FiPaperclip, FiTool, FiDollarSign, FiEdit3 } from 'react-icons/fi'; // Import necessary icons

// Helper to format date/time (reuse or move to utils)
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
};

// Helper to format currency (reuse or move to utils)
const formatCurrency = (value) => {
  if (value == null) return 'N/A';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
};

// Map event types to icons and descriptive messages
// Pass technicians list specifically for technician assignment lookup
const getActivityDetails = (log, users = [], technicians = []) => { 
    const user = users.find(u => u.id === log.user_id);
    const userName = user ? user.full_name : (log.user_id ? `User (${log.user_id.substring(0, 6)}...)` : 'Sistem');
    let message = 'Aksi tidak diketahui';
    let Icon = FiActivity;
    
    // For service order events
    if (log.service_order_id) {
      const customerName = log.customer_name || 'Customer';
      switch (log.event_type) {
        case 'CREATED': message = `Order untuk ${customerName} dibuat`; Icon = FiPlusCircle; break;
        case 'STATUS_CHANGED': message = `Order ${customerName} - Status diubah ke "${log.details?.new || 'N/A'}"`; Icon = FiCheckSquare; break;
        case 'TECHNICIAN_ASSIGNED':
              {
                const newTechId = log.details?.new_id;
                const assignedTechnician = technicians.find(t => t.id === newTechId); 
                const newTechName = assignedTechnician ? assignedTechnician.full_name : (newTechId ? `ID (${newTechId.substring(0,6)}...)` : 'Tidak Ada');
                message = `Teknisi ${newTechName} ditugaskan ke order ${customerName}`; Icon = FiUserCheck;
              }
              break;
        case 'COST_UPDATED': message = `Biaya order ${customerName} diupdate menjadi ${formatCurrency(log.details?.new)}`; Icon = FiDollarSign; break;
        case 'NOTES_UPDATED': message = `Catatan order ${customerName} diperbarui`; Icon = FiMessageSquare; break;
        case 'PARTS_UPDATED': message = `Sparepart order ${customerName} diperbarui`; Icon = FiTool; break;
        case 'DETAILS_EDITED': message = `Detail order ${customerName} diedit`; Icon = FiEdit3; break;
        default: message = `Event: ${log.event_type} pada order ${customerName}`; break;
      }
    } 
    // For inventory events (uses 'action' column, not 'event_type')
    else if (log.item_id) {
      const itemName = log.item_name || 'Item';
      const action = log.action; // inventory_logs uses 'action' column
      
      switch (action) {
        case 'ITEM_CREATED': 
        case 'CREATE_ITEM':
          message = `Item '${itemName}' ditambahkan ke inventory`; 
          Icon = FiPlusCircle; 
          break;
        case 'ITEM_UPDATED': 
        case 'UPDATE_ITEM':
          message = `Item '${itemName}' diupdate`; 
          Icon = FiEdit3; 
          break;
        case 'STOCK_ADJUSTMENT': 
          {
            // Parse changes from JSONB column
            let changes = log.changes;
            if (typeof changes === 'string') {
              try { changes = JSON.parse(changes); } catch { changes = null; }
            }
            
            // Handle both object and array format
            const changeData = Array.isArray(changes) ? changes[0] : changes;
            const oldStock = changeData?.old_value || 0;
            const newStock = changeData?.new_value || 0;
            const diff = newStock - oldStock;
            
            message = `Stok '${itemName}' ${diff > 0 ? 'ditambah' : 'dikurangi'} ${Math.abs(diff)} (${oldStock} → ${newStock})`;
            Icon = FiActivity;
          }
          break;
        case 'ITEM_DELETED': 
        case 'DELETE_ITEM':
          message = `Item '${itemName}' dihapus dari inventory`; 
          Icon = FiActivity; 
          break;
        default: 
          message = `${action || 'Event'} pada item '${itemName}'`; 
          break;
      }
    }

    return { message: `${message} oleh ${userName}`, Icon };
};


function RecentActivityFeed({ limit = 7, technicians = [] }) { // Accept technicians prop
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]); // Store fetched user data

  useEffect(() => {
    const fetchRecentLogsAndUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch recent service order logs
        const { data: orderLogData, error: orderLogError } = await supabase
          .from('service_order_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit * 2); // Fetch more to account for inventory logs

        if (orderLogError) throw orderLogError;

        // 2. Fetch recent inventory logs
        const { data: inventoryLogData, error: inventoryLogError } = await supabase
          .from('inventory_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit * 2);

        if (inventoryLogError) throw inventoryLogError;

        // 3. Fetch service orders for customer names
        const orderIds = [...new Set((orderLogData || []).map(log => log.service_order_id).filter(id => id))];
        let orderMap = {};
        if (orderIds.length > 0) {
          const { data: ordersData, error: ordersError } = await supabase
            .from('service_orders')
            .select('id, customer_name')
            .in('id', orderIds);
          if (ordersError) {
            console.error("Error fetching service orders:", ordersError);
          } else {
            orderMap = (ordersData || []).reduce((map, order) => {
              map[order.id] = order.customer_name;
              return map;
            }, {});
          }
        }

        // 4. Fetch inventory items for item names
        const itemIds = [...new Set((inventoryLogData || []).map(log => log.item_id).filter(id => id))];
        let itemMap = {};
        if (itemIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('inventory_items')
            .select('id, name')
            .in('id', itemIds);
          if (itemsError) {
            console.error("Error fetching inventory items:", itemsError);
          } else {
            itemMap = (itemsData || []).reduce((map, item) => {
              map[item.id] = item.name;
              return map;
            }, {});
          }
        }

        // 5. Enrich and combine logs
        const enrichedOrderLogs = (orderLogData || []).map(log => ({
          ...log,
          customer_name: orderMap[log.service_order_id] || null,
          log_type: 'service_order'
        }));

        const enrichedInventoryLogs = (inventoryLogData || []).map(log => ({
          ...log,
          item_name: itemMap[log.item_id] || null,
          log_type: 'inventory'
        }));

        // Combine and sort by created_at
        const combinedLogs = [...enrichedOrderLogs, ...enrichedInventoryLogs]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, limit); // Take only the requested limit

        setLogs(combinedLogs);

        // 6. Get unique user IDs from all logs
        const userIds = [...new Set(combinedLogs.map(log => log.user_id).filter(id => id))];

        // 7. Fetch user data for those IDs
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (userError) throw userError;
          setUsers(userData || []);
        } else {
            setUsers([]); // No users to fetch
        }

      } catch (err) {
        console.error("Error fetching recent activity:", err);
        setError(`Gagal memuat aktivitas: ${err.message}`);
        setLogs([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLogsAndUsers();

    // Optional: Set up realtime subscription for new logs if desired
    // const channel = supabase.channel('service-order-logs-feed')
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_order_logs' }, (payload) => {
    //     // Fetch user data for the new log's user_id if not already present
    //     // Prepend the new log to the list (and trim if > limit)
    //     console.log("New log received:", payload);
    //     fetchRecentLogsAndUsers(); // Simplest update: refetch the list
    //   })
    //   .subscribe();
    // return () => supabase.removeChannel(channel);

  }, [limit]);

  return (
    <div className="bg-white p-4 rounded-lg shadow h-80 flex flex-col"> {/* Match height */}
      <h3 className="text-sm font-semibold text-[#0ea5e9] border-b pb-2 mb-3 flex items-center">
        <FiClock className="h-4 w-4 mr-2" /> Aktivitas Terbaru
      </h3>
      <div className="flex-1 overflow-y-auto pr-2"> {/* Add padding-right for scrollbar */}
        {loading && (
          <div className="flex items-center justify-center text-gray-500 py-4 h-full">
            <FiLoader className="animate-spin h-5 w-5 mr-2" /> Memuat...
          </div>
        )}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">Error: {error}</p>
        )}
        {!loading && !error && logs.length === 0 && (
          <p className="text-sm text-gray-500 italic text-center mt-4">Belum ada aktivitas.</p>
        )}
        {!loading && !error && logs.length > 0 && (
           <ul className="space-y-3">
             {logs.map((log) => {
                // Pass technicians to getActivityDetails
                const { message, Icon } = getActivityDetails(log, users, technicians); 
                return (
                    <li key={log.id} className="flex items-start text-xs">
                      <Icon className="w-3.5 h-3.5 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                      <div className="flex-1">
                          <p className="text-gray-700 leading-snug">{message}</p>
                          <time className="block text-gray-400 text-[11px] mt-0.5">{formatDateTime(log.created_at)}</time>
                      </div>
                    </li>
                );
             })}
           </ul>
        )}
      </div>
    </div>
  );
}

export default RecentActivityFeed; 