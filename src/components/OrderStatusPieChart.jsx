import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title // Import Title
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// Define colors for statuses (adjust as needed)
const statusColors = {
  Baru: '#3b82f6', // Blue
  Diproses: '#facc15', // Yellow
  'Menunggu Spare Part': '#f97316', // Orange
  Selesai: '#22c55e', // Green
  Dibatalkan: '#ef4444', // Red
  // Add fallback color if needed
};

function OrderStatusPieChart({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow h-64 flex items-center justify-center">
        <p className="text-gray-500">Memuat chart...</p>
        {/* Add a simple loading skeleton later if desired */}
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: Object.keys(stats).filter(key => [
        'Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'
      ].includes(key) && stats[key] > 0), 
    datasets: [
      {
        label: 'Jumlah Order',
        data: Object.keys(stats)
            .filter(key => [
                'Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'
            ].includes(key) && stats[key] > 0)
            .map(key => stats[key]),
        backgroundColor: Object.keys(stats)
            .filter(key => [
                'Baru', 'Diproses', 'Menunggu Spare Part', 'Selesai', 'Dibatalkan'
            ].includes(key) && stats[key] > 0)
            .map(key => statusColors[key] || '#cccccc'), 
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