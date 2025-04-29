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
    const orderIdShort = String(log.service_order_id).substring(0, 8);

    switch (log.event_type) {
      case 'CREATED': message = `Order #${orderIdShort} dibuat`; Icon = FiPlusCircle; break;
      case 'STATUS_CHANGED': message = `Status Order #${orderIdShort} diubah ke "${log.details?.new || 'N/A'}"`; Icon = FiCheckSquare; break;
      case 'TECHNICIAN_ASSIGNED':
            {
              const newTechId = log.details?.new_id;
              // Use the passed technicians list for lookup
              const assignedTechnician = technicians.find(t => t.id === newTechId); 
              const newTechName = assignedTechnician ? assignedTechnician.full_name : (newTechId ? `ID (${newTechId.substring(0,6)}...)` : 'Tidak Ada');
              message = `Teknisi ${newTechName} ditugaskan ke Order #${orderIdShort}`; Icon = FiUserCheck;
            }
            break;
      case 'COST_UPDATED': message = `Biaya Order #${orderIdShort} diupdate menjadi ${formatCurrency(log.details?.new)}`; Icon = FiDollarSign; break;
      case 'NOTES_UPDATED': message = `Catatan Order #${orderIdShort} diperbarui`; Icon = FiMessageSquare; break;
      case 'PARTS_UPDATED': message = `Sparepart Order #${orderIdShort} diperbarui`; Icon = FiTool; break;
      case 'DETAILS_EDITED': message = `Detail Order #${orderIdShort} diedit`; Icon = FiEdit3; break;
      default: message = `Event: ${log.event_type} pada Order #${orderIdShort}`; break;
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
        // 1. Fetch recent logs
        const { data: logData, error: logError } = await supabase
          .from('service_order_logs')
          .select('*, service_order:service_orders(customer_name)') // Join order details if needed
          .order('created_at', { ascending: false })
          .limit(limit);

        if (logError) throw logError;
        setLogs(logData || []);

        // 2. Get unique user IDs from the logs
        const userIds = [...new Set(logData.map(log => log.user_id).filter(id => id))];

        // 3. Fetch user data for those IDs (only if there are IDs to fetch)
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