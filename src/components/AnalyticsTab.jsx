import React, { useMemo, useState, Fragment, useEffect } from 'react';
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
import { supabase } from '../supabase/supabaseClient';

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

// Define colors for charts - color mapping from database
const COLOR_MAP = {
  blue: '#3B82F6',
  yellow: '#FACC15',
  orange: '#F97316',
  green: '#22C55E',
  red: '#EF4444',
  purple: '#A855F7',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  gray: '#6B7280',
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
  const [statusColors, setStatusColors] = useState({});

  // Fetch status colors from database
  useEffect(() => {
    const fetchStatusColors = async () => {
      try {
        const { data, error } = await supabase
          .from('service_statuses')
          .select('name, color')
          .eq('is_active', true);

        if (error) throw error;

        // Build color mapping from database
        const colors = {};
        data.forEach(status => {
          colors[status.name] = COLOR_MAP[status.color] || COLOR_MAP.gray;
        });
        
        setStatusColors(colors);
      } catch (error) {
        console.error('Error fetching status colors:', error);
        // Fallback to default colors
        setStatusColors({
          'Baru': COLOR_MAP.blue,
          'Diproses': COLOR_MAP.yellow,
          'Menunggu Spare Part': COLOR_MAP.orange,
          'Selesai': COLOR_MAP.green,
          'Dibatalkan': COLOR_MAP.red,
        });
      }
    };

    fetchStatusColors();
  }, []);

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
  // Depend on filteredOrders, users, and selectedRange for chart calculations
  }, [filteredOrders, users, selectedRange]); 

  // --- Helper Function to Prepare Data for Export --- 
  const prepareDataForExport = () => {
      return filteredOrders.map(order => ({
          'ID Order': order.id,
          'Tanggal Masuk': order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : '',
          'Nama Pelanggan': order.customer_name || '-',
          'Kontak Pelanggan': order.customer_contact || '-',
          'Tipe Perangkat': order.device_type || '-',
          'Nomor Seri': order.serial_number || '-',
          'Deskripsi Masalah': order.customer_complaint || '-',
          'Teknisi Ditugaskan': users.find(u => u.id === order.assigned_technician_id)?.full_name || 'Belum Ditugaskan',
          'Status': order.status || '-',
          'Estimasi Selesai': order.estimated_completion_time ? new Date(order.estimated_completion_time).toLocaleDateString('id-ID') : '-',
          'Catatan Teknisi': order.notes || '-'
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

  const handleExportPDF = async () => {
    if (filteredOrders.length === 0) return alert("Tidak ada data untuk diekspor.");
    
    // Fetch company profile
    const { data: companyData, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .single();
    
    if (companyError) {
      console.error('Error fetching company profile:', companyError);
    }
    
    // Instance created AFTER plugin is applied
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 20;
    
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace) => {
      if (currentY + requiredSpace > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };
    
    // Helper to add footer
    const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Halaman ${currentPage} dari ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      if (companyData?.company_name) {
        doc.text(companyData.company_name, margin, pageHeight - 10);
      }
    };
    
    // Company Header Section
    if (companyData) {
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(companyData.company_name || 'Perusahaan Servis', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      
      const details = [];
      if (companyData.address) details.push(companyData.address);
      if (companyData.phone_number) details.push(`Tel: ${companyData.phone_number}`);
      if (companyData.email) details.push(`Email: ${companyData.email}`);
      if (companyData.website) details.push(`Web: ${companyData.website}`);
      
      details.forEach(detail => {
        doc.text(detail, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4;
      });
      
      currentY += 3;
    }
    
    // Separator Line
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    
    // Report Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);
    const rangeLabel = {
      'last7days': '7 Hari Terakhir',
      'last30days': '30 Hari Terakhir',
      'thisMonth': 'Bulan Ini',
      'allTime': 'Semua Waktu'
    }[selectedRange];
    doc.text(`Laporan Servis - ${rangeLabel}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    
    // Report Date
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(107, 114, 128);
    const reportDate = new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Tanggal Laporan: ${reportDate}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    
    // Summary Stats
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`Total Order: ${filteredOrders.length}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Loop through each order and create a card
    filteredOrders.forEach((order, index) => {
      const cardHeight = 55; // Approximate height for each card
      checkPageBreak(cardHeight);
      
      const cardY = currentY;
      
      // Card background with border
      doc.setFillColor(248, 250, 252); // Light gray background
      doc.setDrawColor(209, 213, 219); // Gray border
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, cardY, contentWidth, cardHeight, 2, 2, 'FD');
      
      let innerY = cardY + 6;
      
      // Order Number Header
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 58, 138); // Blue
      doc.text(`Order #${index + 1}`, margin + 4, innerY);
      
      // Status Badge (right side)
      const status = order.status || '-';
      const statusWidth = doc.getTextWidth(status) + 8;
      const statusX = pageWidth - margin - statusWidth - 4;
      
      // Status background color based on status
      const statusColors = {
        'Baru': [59, 130, 246],
        'Diproses': [250, 204, 21],
        'Menunggu Spare Part': [249, 115, 22],
        'Selesai': [34, 197, 94],
        'Dibatalkan': [239, 68, 68]
      };
      const bgColor = statusColors[status] || [107, 114, 128];
      
      doc.setFillColor(...bgColor);
      doc.roundedRect(statusX, innerY - 4, statusWidth, 6, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(status, statusX + 4, innerY);
      
      innerY += 6;
      
      // Separator line
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.1);
      doc.line(margin + 4, innerY, pageWidth - margin - 4, innerY);
      innerY += 5;
      
      // Order details in two columns
      const col1X = margin + 4;
      const col2X = pageWidth / 2 + 2;
      const lineHeight = 4.5;
      
      doc.setFontSize(9);
      
      // Column 1
      // Tanggal Masuk
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Tanggal:', col1X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      const tanggal = order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : '-';
      doc.text(tanggal, col1X + 20, innerY);
      
      // Pelanggan
      innerY += lineHeight;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Pelanggan:', col1X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      const customerName = order.customer_name || '-';
      const maxWidth = (contentWidth / 2) - 24;
      const splitName = doc.splitTextToSize(customerName, maxWidth);
      doc.text(splitName, col1X + 20, innerY);
      
      // Kontak
      innerY += lineHeight * Math.max(1, splitName.length);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Kontak:', col1X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(order.customer_contact || '-', col1X + 20, innerY);
      
      // Perangkat
      innerY += lineHeight;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Perangkat:', col1X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(order.device_type || '-', col1X + 20, innerY);
      
      // Reset innerY for column 2
      innerY = cardY + 17;
      
      // Column 2
      // Teknisi
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Teknisi:', col2X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      const techName = users.find(u => u.id === order.assigned_technician_id)?.full_name || 'Belum Ditugaskan';
      doc.text(techName, col2X + 20, innerY);
      
      // Estimasi
      innerY += lineHeight;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Estimasi:', col2X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      const estimasi = order.estimated_completion_time 
        ? new Date(order.estimated_completion_time).toLocaleDateString('id-ID') 
        : '-';
      doc.text(estimasi, col2X + 20, innerY);
      
      // Keluhan (full width at bottom)
      innerY = cardY + 35;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Keluhan:', col1X, innerY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      const complaint = order.customer_complaint || '-';
      const splitComplaint = doc.splitTextToSize(complaint, contentWidth - 28);
      doc.text(splitComplaint, col1X + 16, innerY);
      
      currentY += cardHeight + 4; // Add spacing between cards
    });
    
    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
    }

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
                     <Cell key={`cell-${index}`} fill={statusColors[entry.name] || COLOR_MAP.gray} />
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