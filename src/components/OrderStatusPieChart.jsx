import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title // Import Title
} from 'chart.js';
import { supabase } from '../supabase/supabaseClient';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// Color mapping from database colors to hex codes
const colorMap = {
  blue: '#3b82f6',
  yellow: '#facc15',
  orange: '#f97316',
  green: '#22c55e',
  red: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  gray: '#6b7280',
};

function OrderStatusPieChart({ stats, isLoading }) {
  const [statusColors, setStatusColors] = useState({});
  const [loadingColors, setLoadingColors] = useState(true);

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
          colors[status.name] = colorMap[status.color] || colorMap.gray;
        });
        
        setStatusColors(colors);
      } catch (error) {
        console.error('Error fetching status colors:', error);
        // Fallback to default colors
        setStatusColors({
          'Baru': colorMap.blue,
          'Diproses': colorMap.yellow,
          'Menunggu Spare Part': colorMap.orange,
          'Selesai': colorMap.green,
          'Dibatalkan': colorMap.red,
        });
      } finally {
        setLoadingColors(false);
      }
    };

    fetchStatusColors();
  }, []);

  if (isLoading || loadingColors) {
    return (
      <div className="bg-white p-4 rounded-lg shadow h-64 flex items-center justify-center">
        <p className="text-gray-500">Memuat chart...</p>
        {/* Add a simple loading skeleton later if desired */}
      </div>
    );
  }

  // Filter out non-status keys (total, totalRevenue, ordersCompletedToday)
  const excludeKeys = ['total', 'totalRevenue', 'ordersCompletedToday'];
  const statusKeys = Object.keys(stats).filter(key => 
    !excludeKeys.includes(key) && stats[key] > 0
  );

  // Prepare chart data - use all statuses from stats that have values
  const chartData = {
    labels: statusKeys, 
    datasets: [
      {
        label: 'Jumlah Order',
        data: statusKeys.map(key => stats[key]),
        backgroundColor: statusKeys.map(key => statusColors[key] || colorMap.gray), 
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Prepare chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: {
        position: 'bottom', // Position legend at the bottom
        labels: {
            padding: 15 // Add padding to legend items
        }
      },
      title: {
        display: true,
        text: 'Order Berdasarkan Status',
        padding: {
            top: 10,
            bottom: 15
        },
        font: {
            size: 14,
            weight: 'bold'
        },
        color: '#374151' // Gray-700
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed;
            }
            return label;
          }
        }
      }
    },
  };

  const hasData = chartData.labels.length > 0;

  return (
    <div className="bg-white p-4 rounded-lg shadow h-80"> {/* Increased height */}
      {hasData ? (
          <Pie data={chartData} options={chartOptions} />
      ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
             <p className="text-lg font-semibold text-gray-700 mb-2">Order Berdasarkan Status</p>
             <p className="text-gray-500">Belum ada data order untuk ditampilkan.</p>
           </div>
      )}
    </div>
  );
}

export default OrderStatusPieChart; 