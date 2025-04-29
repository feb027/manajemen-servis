import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { supabase } from '../supabase/supabaseClient'; // Adjust path if needed
import { FiUsers, FiUser, FiPackage, FiCalendar, FiFilter, FiX, FiChevronLeft, FiChevronRight, FiArrowRight, FiTag, FiEdit2, FiPlusCircle, FiTrash2, FiRepeat, FiUserCheck, FiInfo, FiDollarSign } from 'react-icons/fi';
import Pagination from './Pagination'; // Assuming Pagination component exists

const ITEMS_PER_PAGE = 15; // Adjust as needed

// Helper to format dates nicely
const formatLogTimestamp = (timestamp) => {
  if (!timestamp) return '-';
  try {
    return new Date(timestamp).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    });
  } catch {
    return 'Invalid Date';
  }
};

// Helper for date range filtering (similar to AnalyticsTab)
const isDateInRange = (dateString, range) => {
  if (!dateString || range === 'allTime') return true;
  const date = new Date(dateString);
  const now = new Date();
  let startDate;

  switch (range) {
    case 'today':
       startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
       break;
    case 'last7days':
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      break;
    case 'last30days':
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;
    default:
      return true; 
  }
  // Ensure comparison works correctly by comparing timestamps
  return date.getTime() >= startDate.getTime();
};

// Action mapping helper - Made case-insensitive for order actions
const mapActionName = (type, rawAction) => {
    if (!rawAction) return 'Aksi Tidak Dikenal'; // Handle null/undefined rawAction
    
    if (type === 'order') {
        const upperCaseAction = rawAction.toUpperCase(); // Convert to uppercase for comparison
        switch(upperCaseAction) {
            case 'STATUS_UPDATE': 
            case 'STATUS_CHANGED': return 'Update Status';
            case 'TECHNICIAN_ASSIGNED': return 'Tugaskan Teknisi';
            case 'COST_UPDATED': 
            case 'ORDER_COST_UPDATED': return 'Update Biaya'; // Should now match case-insensitively
            case 'ORDER_CREATED': 
            case 'CREATED': return 'Buat Order'; 
            default: return rawAction; // Fallback retains original casing
        }
    } else if (type === 'inventory') {
        // Inventory actions can remain as they are unless similar issues arise
        const upperCaseAction = rawAction.toUpperCase();
        switch(upperCaseAction) {
            case 'STOCK_ADJUSTMENT': 
            case 'ITEM_UPDATED': 
            case 'UPDATE': return 'Update Stok/Item'; 
            case 'ITEM_CREATED': return 'Buat Item';
            case 'ITEM_DELETED': return 'Hapus Item';
            default: return rawAction; 
        }
    }
    return rawAction;
};

function ActivityLogTab({ allUsers = [] }) { // Pass allUsers for filtering
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [selectedRange, setSelectedRange] = useState('today'); // Default range
  const [selectedUser, setSelectedUser] = useState('all'); // 'all' or user.id
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'order', 'inventory'

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Order Logs 
      const { data: orderLogsData, error: orderError } = await supabase
        .from('service_order_logs') 
        .select(`id, created_at, event_type, details, user_id, service_order_id`)
        .order('created_at', { ascending: false });

      if (orderError) throw new Error(`Error fetching order logs: ${orderError.message}`);

      // Fetch Inventory Logs
      const { data: inventoryLogsData, error: inventoryError } = await supabase
        .from('inventory_logs') 
        .select(`id, created_at, action, changes, user_id, item_id`)
        .order('created_at', { ascending: false });

      if (inventoryError) throw new Error(`Error fetching inventory logs: ${inventoryError.message}`);

      // --- Fetch User Names ---
      const allUserIds = [
        ...new Set([
            ...(orderLogsData || []).map(log => log.user_id),
            ...(inventoryLogsData || []).map(log => log.user_id)
        ].filter(id => id))
      ];
      let userMap = {};
      if (allUserIds.length > 0) {
         // ... query public.users ...
         const { data: usersData, error: usersError } = await supabase
             .from('users').select('id, full_name').in('id', allUserIds);
         if (usersError) { console.error("Error fetching user details:", usersError); }
         else { userMap = usersData.reduce((map, user) => { map[user.id] = user.full_name; return map; }, {}); }
      }

      // Map Order Logs - Apply friendly action name
      const formattedOrderLogs = (orderLogsData || []).map(log => ({
        id: `order-${log.id}`,
        timestamp: log.created_at,
        userName: userMap[log.user_id] || (log.user_id ? `User ID: ${log.user_id.substring(0,8)}...` : 'Sistem'),
        userId: log.user_id,
        action: mapActionName('order', log.event_type), // Map the action name
        details: log.details,
        type: 'order',
        related_id: log.service_order_id 
      }));

      // Map Inventory Logs - Apply friendly action name
      const formattedInventoryLogs = (inventoryLogsData || []).map(log => ({
        id: `inventory-${log.id}`,
        timestamp: log.created_at,
        userName: userMap[log.user_id] || (log.user_id ? `User ID: ${log.user_id.substring(0,8)}...` : 'Sistem'), 
        userId: log.user_id,
        action: mapActionName('inventory', log.action), // Map the action name
        details: log.changes, 
        type: 'inventory',
        related_id: log.item_id 
      }));

      // Combine and sort logs
      const combinedLogs = [...formattedOrderLogs, ...formattedInventoryLogs]
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            
      setLogs(combinedLogs);

    } catch (err) {
      console.error("Error fetching activity logs:", err);
      setError(err.message || 'Gagal memuat log aktivitas.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // --- Filtering Logic ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const dateMatch = isDateInRange(log.timestamp, selectedRange);
      // Handle 'null' selectedUser for System/Unknown actions
      const userMatch = selectedUser === 'all' || 
                        (selectedUser === 'null' && log.userId === null) || 
                        log.userId === selectedUser;
      const typeMatch = selectedType === 'all' || log.type === selectedType;
      return dateMatch && userMatch && typeMatch;
    });
  }, [logs, selectedRange, selectedUser, selectedType]);

  // --- Pagination Logic ---
  const totalResults = filteredLogs.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRange, selectedUser, selectedType]);

  // --- Render Log Details (Visual Enhancements) ---
  const renderLogDetails = (log, allUsers) => {
    const { details, action, type, related_id } = log; 

    // Helper for consistent ID styling
    const IdBadge = ({ prefix, id }) => (
      <span className="inline-flex items-center bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-medium mr-1">
        <FiTag className="h-3 w-3 mr-1 text-gray-500"/> {prefix} #{id}
      </span>
    );

    // Helper for name styling
    const NameSpan = ({ name }) => <span className="font-semibold text-gray-800">{name}</span>;

    // Helper for value changes - Modified to not stringify strings
    const ValueChange = ({ oldValue, newValue }) => {
      const renderValue = (value, isNew = false) => {
        const valueToRender = value ?? '-'; // Handle null/undefined
        const className = isNew ? "text-green-700 font-medium" : "text-red-600 line-through";
        
        if (typeof valueToRender === 'string') {
          // If it's already a string (like formatted currency), render directly
          return <span className={className}>{valueToRender}</span>;
        } else {
          // Otherwise, stringify (for objects, etc.)
          return <span className={className}>{JSON.stringify(valueToRender)}</span>;
        }
      };
      
      return (
        <> 
          {renderValue(oldValue, false)}
          <FiArrowRight className="h-3 w-3 text-gray-400 inline mx-1" />
          {renderValue(newValue, true)}
        </>
      );
    };

    let detailElement = <span className="text-gray-500 italic">-</span>; 

    if (!details && !(action === 'Buat Order' || action === 'Buat Item' || action === 'Hapus Item')) {
        return detailElement;
    }
    
    try {
        let parsedDetails = details; // Start with original details
        if (details && typeof details === 'string') {
            try {
                 parsedDetails = JSON.parse(details); 
            } catch (parseError) {
                 // JSON parse failed, keep parsedDetails as the original string
                 console.warn(`[ActivityLogTab] Failed to parse details JSON for action '${action}':`, details, parseError);
                 // We will rely on the fallback mechanism below if specific handling fails
            }
        }

        const getUserName = (userId) => {
             if (!userId) return 'None';
             const user = allUsers.find(u => u.id === userId);
             return <NameSpan name={user?.full_name || `ID: ${userId.substring(0,6)}...`} />;
        };
        if (type === 'order') {
            const orderId = related_id || parsedDetails?.order_id || parsedDetails?.service_order_id || '?';
            if (action === 'Buat Order') { 
                 const customerName = parsedDetails?.customer_name || '?'; 
                 const deviceType = parsedDetails?.device_type || '?';
                detailElement = (
                  <span>
                    <IdBadge prefix="Order" id={orderId} />
                    dibuat u/ <NameSpan name={customerName} /> (Perangkat: <span className='text-gray-600'>{deviceType}</span>).
                  </span>
                );
            } else if (action === 'Update Status') {
                 detailElement = (
                   <span>
                     <IdBadge prefix="Order" id={orderId} /> Status: <ValueChange oldValue={parsedDetails?.old} newValue={parsedDetails?.new} />
                   </span>
                 );
            } else if (action === 'Tugaskan Teknisi') {
                const oldTech = getUserName(parsedDetails?.old_technician_id || parsedDetails?.old_id);
                const newTech = getUserName(parsedDetails?.new_technician_id || parsedDetails?.new_id);
                detailElement = (
                   <span>
                     <IdBadge prefix="Order" id={orderId} /> Teknisi: {oldTech} <FiArrowRight className="h-3 w-3 text-gray-400 inline mx-1" /> {newTech}
                   </span>
                 );
            } else if (action === 'Update Biaya') { 
                 const formatCurrency = (value) => {
                     if (typeof value !== 'number') {
                         return typeof value === 'string' ? value : '-'; 
                     }
                     return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
                               .replace(/\s/g, '');
                 };

                 console.log('[ActivityLogTab] Update Biaya Details Object:', parsedDetails);

                 // Check if parsedDetails is an object with required keys
                 if (parsedDetails && typeof parsedDetails === 'object' && 
                     Object.prototype.hasOwnProperty.call(parsedDetails, 'old') && 
                     Object.prototype.hasOwnProperty.call(parsedDetails, 'new')) {
                     detailElement = (
                         <span>
                             <IdBadge prefix="Order" id={orderId} /> Biaya: <ValueChange oldValue={formatCurrency(parsedDetails.old)} newValue={formatCurrency(parsedDetails.new)} />
                         </span>
                     );
                 } else {
                      // Fallback if structure is wrong OR if JSON parsing failed earlier
                      detailElement = (
                         <span className="text-xs text-orange-600 italic">
                              <IdBadge prefix="Order" id={orderId} /> Gagal format detail biaya: {typeof details === 'string' ? details : JSON.stringify(details)}
                         </span>
                      );
                      console.warn(`[ActivityLogTab] Unexpected detail structure for Update Biaya. Raw details:`, details, `Parsed as:`, parsedDetails);
                 }
            } 
        }
        else if (type === 'inventory') {
             const itemId = related_id || parsedDetails?.item_id || '?';
             const itemName = parsedDetails?.item_name || '?'; 
             if (action === 'Buat Item') {
                 detailElement = <span><IdBadge prefix="Item" id={itemId} /> (<NameSpan name={itemName} />) dibuat.</span>;
             } else if (action === 'Hapus Item') {
                  detailElement = <span><IdBadge prefix="Item" id={itemId} /> (<NameSpan name={itemName} />) dihapus.</span>;
             } else if (action === 'Update Stok/Item') {
                  const changesArray = Array.isArray(parsedDetails) ? parsedDetails : [parsedDetails];
                 let changeElements = [];
                 changesArray.forEach((changeDetail, index) => {
                     if(changeDetail?.field === 'stock' && changeDetail.new_value !== undefined && changeDetail.old_value !== undefined) {
                         const stockChange = changeDetail.new_value - changeDetail.old_value;
                         changeElements.push(
                           <Fragment key={`stock-${index}`}>
                             Stok: <ValueChange oldValue={changeDetail.old_value} newValue={changeDetail.new_value} /> 
                             (<span className={stockChange >= 0 ? 'text-green-700' : 'text-red-600'}>{stockChange >= 0 ? '+' : ''}{stockChange}</span>)
                           </Fragment>
                         );
                     } 
                     else if (changeDetail?.field) {
                          changeElements.push(
                            <Fragment key={`${changeDetail.field}-${index}`}>
                              {changeDetail.field}: <ValueChange oldValue={changeDetail.old_value} newValue={changeDetail.new_value} />
                            </Fragment>
                          );
                     }
                 });
                 if (changeElements.length > 0) {
                     detailElement = (
                       <span className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                          <IdBadge prefix="Item" id={itemId} />
                          {changeElements.map((el, i) => <span key={i}>{el}</span>)} 
                       </span>
                     );
                 } else {
                     detailElement = <span><IdBadge prefix="Item" id={itemId} /> Update terdeteksi (detail tidak terbaca).</span>;
                 }
             } 
        }
        // General fallback if no specific format matched *and* detailElement is still the default
        if (detailElement.type === 'span' && detailElement.props.children === '-') { 
            if (parsedDetails && typeof parsedDetails === 'object' && !Array.isArray(parsedDetails)) {
                 const entries = Object.entries(parsedDetails)
                                 .map(([key, value]) => <span key={key} className="mr-2"><span className="text-gray-500">{key}:</span> {JSON.stringify(value)}</span>);
                 detailElement = <span className="text-xs text-gray-600">{entries}</span>; 
            } else if (typeof parsedDetails === 'string' && parsedDetails.length > 0) {
                // If parsedDetails is a non-empty string (e.g., failed JSON parse)
                detailElement = <span className="text-xs text-gray-500 italic">[Detail: {parsedDetails}]</span>;
            } else {
                 detailElement = <span className="text-xs text-gray-500 italic">[Detail Aksi Tidak Diketahui]</span>; 
            }
        }

    } catch (err) {
        // This outer catch is unlikely to be hit now with the inner try/catch for JSON.parse
        detailElement = <span className="text-xs text-red-600 italic">[Error Render Detail]</span>; 
        console.error("[ActivityLogTab] Error rendering log details:", log, err); 
    }
    return detailElement;
  };

  // Helper to get action icon
  const getActionIcon = (action) => {
    switch(action) {
        case 'Buat Order':
        case 'Buat Item':
            return <FiPlusCircle className="h-4 w-4 text-green-500 mr-1.5" />;
        case 'Update Status':
            return <FiRepeat className="h-4 w-4 text-blue-500 mr-1.5" />;
        case 'Update Stok/Item':
            return <FiEdit2 className="h-4 w-4 text-yellow-600 mr-1.5" />;
        case 'Tugaskan Teknisi':
            return <FiUserCheck className="h-4 w-4 text-indigo-500 mr-1.5" />;
        case 'Update Biaya':
             return <FiDollarSign className="h-4 w-4 text-emerald-500 mr-1.5" />;
        case 'Hapus Item':
             return <FiTrash2 className="h-4 w-4 text-red-500 mr-1.5" />;
        default:
            return <FiInfo className="h-4 w-4 text-gray-400 mr-1.5" />; // Generic info icon
    }
  };

  // Filter button style helper
  const getRangeButtonStyle = (range) => {
     // (Same as in AnalyticsTab - reuse or move to utils)
    return `px-3 py-1 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-400 transition-colors ${
      selectedRange === range
        ? 'bg-sky-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;
  };

  const handleClearFilters = () => {
      setSelectedRange('today');
      setSelectedUser('all');
      setSelectedType('all');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Log Aktivitas Sistem</h2>

      {/* Filters Section */}
      <div className="p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-start flex-wrap">
        {/* Date Range */}
        <div className='flex-shrink-0'>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rentang Waktu</label>
          <div className="flex space-x-1 flex-wrap gap-1">
              <button onClick={() => setSelectedRange('today')} className={getRangeButtonStyle('today')}>Hari Ini</button>
              <button onClick={() => setSelectedRange('last7days')} className={getRangeButtonStyle('last7days')}>7 Hari</button>
              <button onClick={() => setSelectedRange('last30days')} className={getRangeButtonStyle('last30days')}>30 Hari</button>
              <button onClick={() => setSelectedRange('allTime')} className={getRangeButtonStyle('allTime')}>Semua</button>
          </div>
        </div>
        
        {/* User Filter */}
        <div className="flex-grow min-w-[150px]">
           <label htmlFor="userFilter" className="block text-xs font-medium text-gray-600 mb-1">Pengguna</label>
           <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-400"> <FiUsers className='h-3.5 w-3.5'/> </div>
               <select
                   id="userFilter"
                   value={selectedUser}
                   onChange={(e) => setSelectedUser(e.target.value)}
                   className="block w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
               >
                   <option value="all">Semua Pengguna</option>
                   {/* Sort users alphabetically */}
                   {allUsers.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')).map(user => (
                       <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                   ))}
                   <option value="null">Sistem / Tidak Diketahui</option> 
               </select>
           </div>
        </div>

        {/* Type Filter */}
        <div className="flex-grow min-w-[150px]">
           <label htmlFor="typeFilter" className="block text-xs font-medium text-gray-600 mb-1">Tipe Log</label>
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-400"> <FiPackage className='h-3.5 w-3.5'/> </div>
               <select
                   id="typeFilter"
                   value={selectedType}
                   onChange={(e) => setSelectedType(e.target.value)}
                   className="block w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
               >
                   <option value="all">Semua Tipe</option>
                   <option value="order">Order Servis</option>
                   <option value="inventory">Inventaris</option>
                   {/* Add other types if you log more things */}
               </select>
            </div>
        </div>
        
        {/* Clear Button */}
         <div className="self-end md:ml-auto">
             <button
                 onClick={handleClearFilters}
                 className="mt-4 md:mt-0 inline-flex items-center px-2 py-1.5 border border-gray-300 rounded-md text-xs font-medium bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition"
                 title="Reset semua filter"
             >
                 <FiX className="-ml-0.5 mr-1 h-3 w-3" /> Clear
             </button> 
         </div>
      </div>

      {/* Log Table - Enhanced Styling */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {loading && <p className="text-center p-6 text-gray-500">Memuat log...</p>}
          {error && <p className="text-center p-6 text-red-600 bg-red-50 border border-red-200 rounded">Error: {error}</p>}
          {!loading && !error && (
             <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 border-b border-gray-300">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/6">Waktu</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/6">Pengguna</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/6">Aksi</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-3/6">Detail</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedLogs.length > 0 ? (
                            paginatedLogs.map(log => (
                                <tr key={log.id} className="hover:bg-sky-50 transition-colors duration-150">
                                    {/* Timestamp Cell */}
                                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">{formatLogTimestamp(log.timestamp)}</td>
                                     {/* User Cell */}
                                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-800 flex items-center">
                                       <FiUser className="h-3.5 w-3.5 mr-1.5 text-gray-400"/>
                                       {log.userName}
                                    </td>
                                     {/* Action Cell - With Icon */}
                                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center">
                                            {getActionIcon(log.action)} 
                                            <span className={`px-1.5 py-0.5 inline-flex text-[11px] leading-4 font-medium rounded-md ${log.type === 'order' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                {log.type === 'order' ? 'Order' : 'Inv'}
                                            </span>
                                            <span className="ml-1.5">{log.action}</span>
                                        </div>
                                    </td>
                                    {/* Detail Cell - Uses JSX */}
                                    <td className="px-4 py-2.5 text-xs text-gray-600">
                                        {renderLogDetails(log, allUsers)} 
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center py-10 text-gray-500">Tidak ada log aktivitas yang cocok dengan filter.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          )}
            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalCount={totalResults}
                        pageSize={ITEMS_PER_PAGE}
                    />
                </div>
            )}
      </div>
    </div>
  );
}

export default ActivityLogTab; 