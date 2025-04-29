import React, { useMemo, useState, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { FiClipboard, FiUsers, FiTool, FiUserCheck, FiDownload, FiChevronDown } from 'react-icons/fi';
import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip, 
    Legend, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid,
    LineChart,
    Line
} from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Explicitly apply the autotable plugin to jsPDF
applyPlugin(jsPDF);

// Helper function to check if a date is in the current month
const isDateInCurrentMonth = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

// Helper function to check if a date is within a range
const isDateInRange = (dateString, range) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  let startDate;

  switch (range) {
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last7days':
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      break;
    case 'last30days':
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;
    case 'allTime':
    default:
      return true; // No start date filter for all time
  }
  return date >= startDate;
};

// Define colors for charts
const STATUS_COLORS = {
    'Baru': '#3B82F6', // Blue
    'Diproses': '#F59E0B', // Amber
    'Menunggu Spare Part': '#F97316', // Orange
    'Selesai': '#10B981', // Emerald
    'Dibatalkan': '#EF4444', // Red
    'Default': '#6B7280' // Gray for others
};

const TECHNICIAN_BAR_COLOR = '#8884d8'; // Example color for technician bars
const LINE_CHART_COLOR = "#22c55e"; // Green for order trend

// Helper to format date for XAxis based on range
const formatDateLabel = (dateStr, range) => {
    const date = new Date(dateStr);
    if (range === 'allTime') {
        // Format as 'MMM YYYY' (e.g., Jan 2023) for monthly aggregation
        return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }); 
    } else {
        // Format as 'DD MMM' (e.g., 15 Jan) for daily aggregation
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }
};

function AnalyticsTab({ orders = [], users = [] }) {
  const [selectedRange, setSelectedRange] = useState('allTime'); // Default to 'allTime'

  // Get filtered orders based on range (used for charts and export)
  const filteredOrders = useMemo(() => 
      orders.filter(order => isDateInRange(order.created_at, selectedRange)),
      [orders, selectedRange]
  );

  const chartData = useMemo(() => {
    // Now use pre-filteredOrders
    // const filteredOrders = orders.filter(order => isDateInRange(order.created_at, selectedRange)); // No longer needed here

    // --- Calculate Stats using filteredOrders --- 
    const totalOrders = filteredOrders.length;
    const ordersThisMonth = filteredOrders.filter(order => isDateInCurrentMonth(order.created_at)).length;
    const techniciansList = users.filter(user => user.role?.toLowerCase() === 'technician');
    const staff = users.filter(user => 
        user.role?.toLowerCase() === 'admin' || 
        user.role?.toLowerCase() === 'receptionist'
    ).length;

    // --- Status Breakdown using filteredOrders --- 
    const statusCounts = filteredOrders.reduce((acc, order) => {
      const status = order.status || 'Baru'; 
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // --- Technician Performance using filteredOrders --- 
    const completedOrdersByTechnician = filteredOrders.reduce((acc, order) => {
      if (order.status === 'Selesai' && order.assigned_technician_id) {
        acc[order.assigned_technician_id] = (acc[order.assigned_technician_id] || 0) + 1;
      }
      return acc;
    }, {});
    const technicianPerformanceData = techniciansList.map(tech => ({
        name: tech.full_name || `ID: ${tech.id.substring(0, 6)}`,
        completed: completedOrdersByTechnician[tech.id] || 0
    })).sort((a, b) => b.completed - a.completed);

    // --- Order Trend Line Data using filteredOrders --- 
    let orderTrendData = [];
    if (filteredOrders.length > 0) {
        const trendCounts = filteredOrders.reduce((acc, order) => {
            const dateObj = new Date(order.created_at);
            let key;
            if (selectedRange === 'allTime') {
                 key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; 
            } else {
                 key = dateObj.toISOString().split('T')[0]; 
            }
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        orderTrendData = Object.entries(trendCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date)); 
    }

    return {
      totalOrders,
      ordersThisMonth,
      techniciansCount: techniciansList.length,
      staff,
      statusPieData,
      technicianPerformanceData,
      orderTrendData 
    };
  // Depend only on filteredOrders and users for chart calculations
  }, [filteredOrders, users]); 

  // --- Helper Function to Prepare Data for Export --- 
  const prepareDataForExport = () => {
      return filteredOrders.map(order => ({
          'ID Order': order.id,
          'Tanggal Masuk': order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : '',
          'Nama Pelanggan': order.customers?.name || '-',
          'Kontak Pelanggan': order.customers?.phone || '-',
          'Tipe Perangkat': order.device_type || '-',
          'Nomor Seri': order.serial_number || '-',
          'Deskripsi Masalah': order.problem_description || '-',
          'Teknisi Ditugaskan': users.find(u => u.id === order.assigned_technician_id)?.full_name || 'Belum Ditugaskan',
          'Status': order.status || '-',
          'Estimasi Selesai': order.estimated_completion_date ? new Date(order.estimated_completion_date).toLocaleDateString('id-ID') : '',
          'Catatan Teknisi': order.technician_notes || ''
      }));
  };

  // --- Export Functions --- 
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return alert("Tidak ada data untuk diekspor.");
    const dataToExport = prepareDataForExport();
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8 compatibility
    triggerDownload(blob, 'csv');
  };

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) return alert("Tidak ada data untuk diekspor.");
    const dataToExport = prepareDataForExport();
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Servis");
    // Trigger download directly using XLSX.writeFile
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `laporan_servis_${selectedRange}_${timestamp}.xlsx`);
  };

  const handleExportPDF = () => {
    if (filteredOrders.length === 0) return alert("Tidak ada data untuk diekspor.");
    const dataToExport = prepareDataForExport();
    
    // Instance created AFTER plugin is applied
    const doc = new jsPDF();

    const tableColumn = Object.keys(dataToExport[0]);
    const tableRows = dataToExport.map(item => Object.values(item));

    // This should now work
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20, 
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] }, 
        margin: { top: 15 }
    });

    doc.text(`Laporan Servis (${selectedRange})`, 14, 15);
    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`laporan_servis_${selectedRange}_${timestamp}.pdf`);
  };

  // --- Helper to Trigger Download (for CSV Blob) --- 
  const triggerDownload = (blob, extension) => {
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `laporan_servis_${selectedRange}_${timestamp}.${extension}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); 
    } else {
        alert("Browser Anda tidak mendukung fitur download ini.");
    }
  };

  const StatCard = ({ title, value, icon }) => (
    // Force light background and text colors
    <div className="bg-white p-5 rounded-lg shadow flex items-center space-x-4">
      {/* Keep icon background distinct */}
      <div className="p-3 rounded-full bg-sky-100 text-sky-600">
        {icon}
      </div>
      <div>
        {/* Force light text colors */}
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );

  // Button style helper
  const getRangeButtonStyle = (range) => {
    return `px-3 py-1 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-400 transition-colors ${
      selectedRange === range
        ? 'bg-sky-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;
  };

  return (
    <div className="space-y-6">
      {/* Title, Date Range Filters, and Export Dropdown */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Laporan & Analitik</h2>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          {/* Date Range Filter Buttons */}
          <div className="flex space-x-2">
            <button onClick={() => setSelectedRange('last7days')} className={getRangeButtonStyle('last7days')}>7 Hari</button>
            <button onClick={() => setSelectedRange('last30days')} className={getRangeButtonStyle('last30days')}>30 Hari</button>
            <button onClick={() => setSelectedRange('thisMonth')} className={getRangeButtonStyle('thisMonth')}>Bulan Ini</button>
            <button onClick={() => setSelectedRange('allTime')} className={getRangeButtonStyle('allTime')}>Semua</button>
          </div>
           {/* Export Dropdown */}
           <Menu as="div" className="relative inline-block text-left">
               <div>
                   <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500">
                       Export Data
                       <FiChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
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
                   <Menu.Items className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                       <div className="py-1">
                           <Menu.Item>
                               {({ active }) => (
                                   <button
                                       onClick={handleExportCSV}
                                       className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex rounded-md items-center w-full px-3 py-2 text-sm`}
                                   >
                                      <FiDownload className="mr-2 h-4 w-4" aria-hidden="true" />
                                       CSV
                                   </button>
                               )}
                           </Menu.Item>
                           <Menu.Item>
                               {({ active }) => (
                                   <button
                                       onClick={handleExportExcel}
                                       className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex rounded-md items-center w-full px-3 py-2 text-sm`}
                                   >
                                       <FiDownload className="mr-2 h-4 w-4" aria-hidden="true" />
                                       Excel (.xlsx)
                                   </button>
                               )}
                           </Menu.Item>
                           <Menu.Item>
                               {({ active }) => (
                                   <button
                                       onClick={handleExportPDF}
                                       className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex rounded-md items-center w-full px-3 py-2 text-sm`}
                                   >
                                       <FiDownload className="mr-2 h-4 w-4" aria-hidden="true" />
                                       PDF
                                   </button>
                               )}
                           </Menu.Item>
                       </div>
                   </Menu.Items>
               </Transition>
           </Menu>
        </div>
      </div>

      {/* Stats Cards - Title might need adjustment based on range */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Title adjusted slightly */}
        <StatCard title={`Total Order (${selectedRange === 'allTime' ? 'Semua' : selectedRange === 'thisMonth' ? 'Bulan Ini' : selectedRange.replace('last','')})`} value={chartData.totalOrders} icon={<FiClipboard size={24} />} />
        {/* Maybe hide/repurpose 'Order Bulan Ini' card if range is not 'thisMonth'? For now, keeping it. */}
        <StatCard title="Order Bulan Ini" value={chartData.ordersThisMonth} icon={<FiClipboard size={24} />} /> 
        <StatCard title="Jumlah Teknisi" value={chartData.techniciansCount} icon={<FiTool size={24} />} /> 
        <StatCard title="Jumlah Staf Admin/Resepsionis" value={chartData.staff} icon={<FiUserCheck size={24} />} />
      </div>

      {/* Charts section (already uses chartData which is now filtered) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Order Status Breakdown Pie Chart */}
         <div className="lg:col-span-1 bg-white p-5 rounded-lg shadow min-h-[350px]">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Breakdown Status Order</h3>
           {chartData.statusPieData.length > 0 ? (
             <ResponsiveContainer width="100%" height={300}>
               <PieChart>
                 <Pie
                   data={chartData.statusPieData}
                   cx="50%"
                   cy="50%"
                   labelLine={false}
                   outerRadius={100}
                   fill="#8884d8"
                   dataKey="value"
                   label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                 >
                   {chartData.statusPieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || STATUS_COLORS.Default} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend />
               </PieChart>
             </ResponsiveContainer>
           ) : (
             <p className="text-sm text-gray-500 flex items-center justify-center h-full">Tidak ada data order dalam rentang waktu ini.</p>
           )}
         </div>

         {/* Technician Performance Bar Chart */}
         <div className="lg:col-span-1 bg-white p-5 rounded-lg shadow min-h-[350px]">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Selesai per Teknisi</h3>
            {chartData.technicianPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                 <BarChart
                     data={chartData.technicianPerformanceData}
                     margin={{ top: 5, right: 30, left: 0, bottom: 5 }} // Adjusted margins
                 >
                     <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                     <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} /> 
                     <YAxis allowDecimals={false} />
                     <Tooltip />
                     {/* <Legend /> */}
                     <Bar dataKey="completed" fill={TECHNICIAN_BAR_COLOR} name="Order Selesai" />
                 </BarChart>
             </ResponsiveContainer>
           ) : (
              <p className="text-sm text-gray-500 flex items-center justify-center h-full">Tidak ada data performa teknisi dalam rentang waktu ini.</p>
           )}
         </div>
       </div>

       {/* Order Trend Line Chart (Below the first row of charts) */}
       <div className="bg-white p-5 rounded-lg shadow min-h-[350px]">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Tren Order Baru</h3>
           {chartData.orderTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart 
                        data={chartData.orderTrendData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(tick) => formatDateLabel(tick, selectedRange)}
                            tick={{ fontSize: 12 }} 
                            // interval={'preserveStartEnd'} // Might help with label overlap on dense data
                        />
                        <YAxis allowDecimals={false} width={30}/>
                        <Tooltip 
                            labelFormatter={(label) => formatDateLabel(label, selectedRange)}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke={LINE_CHART_COLOR} strokeWidth={2} name="Order Baru" dot={false}/>
                    </LineChart>
                </ResponsiveContainer>
           ) : (
                <p className="text-sm text-gray-500 flex items-center justify-center h-full">Tidak ada data tren order dalam rentang waktu ini.</p>
           )}
       </div>

    </div>
  );
}

export default AnalyticsTab; 