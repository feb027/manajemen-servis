import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import { supabase } from '../supabase/supabaseClient';

/**
 * TimeEstimationStats Component
 * Widget untuk menampilkan statistik estimasi waktu di dashboard
 */
function TimeEstimationStats() {
  const [stats, setStats] = useState({
    totalWithEstimation: 0,
    ongoingOrders: 0,
    completedOnTime: 0,
    completedLate: 0,
    averageAccuracy: 0,
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Ambil semua order yang memiliki estimasi
      const { data: ordersWithEstimation, error } = await supabase
        .from('service_orders')
        .select('*')
        .not('estimated_duration_hours', 'is', null);

      if (error) throw error;

      // Hitung statistik
      const total = ordersWithEstimation?.length || 0;
      
      // Order yang sedang dikerjakan (ada start time, belum ada completion time)
      const ongoing = ordersWithEstimation?.filter(
        o => o.actual_start_time && !o.actual_completion_time
      ).length || 0;

      // Order yang sudah selesai
      const completed = ordersWithEstimation?.filter(
        o => o.actual_completion_time && o.estimated_duration_hours && o.actual_duration_hours
      ) || [];

      // Hitung yang tepat waktu dan terlambat
      let onTime = 0;
      let late = 0;
      let totalAccuracy = 0;

      completed.forEach(order => {
        const diff = order.actual_duration_hours - order.estimated_duration_hours;
        const percentDiff = (diff / order.estimated_duration_hours) * 100;
        
        // Toleransi 10%
        if (Math.abs(percentDiff) <= 10) {
          onTime++;
        } else if (percentDiff > 10) {
          late++;
        } else {
          onTime++; // Lebih cepat dari estimasi juga dianggap on time
        }

        // Hitung akurasi (100% - abs(percentage difference))
        totalAccuracy += Math.max(0, 100 - Math.abs(percentDiff));
      });

      const avgAccuracy = completed.length > 0 
        ? (totalAccuracy / completed.length).toFixed(1) 
        : 0;

      setStats({
        totalWithEstimation: total,
        ongoingOrders: ongoing,
        completedOnTime: onTime,
        completedLate: late,
        averageAccuracy: avgAccuracy,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching time estimation stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center mb-3">
          <FiClock className="h-5 w-5 text-[#0ea5e9] mr-2" />
          <h3 className="text-sm font-semibold text-gray-700">Statistik Estimasi Waktu</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const onTimeRate = stats.completedOnTime + stats.completedLate > 0
    ? ((stats.completedOnTime / (stats.completedOnTime + stats.completedLate)) * 100).toFixed(0)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FiClock className="h-5 w-5 text-[#0ea5e9] mr-2" />
          <h3 className="text-sm font-semibold text-gray-700">Statistik Estimasi Waktu</h3>
        </div>
        <button 
          onClick={fetchStats}
          className="text-xs text-[#0ea5e9] hover:text-[#0c8acb] focus:outline-none"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {/* Total dengan Estimasi */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <FiClock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Order dengan Estimasi</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalWithEstimation}</p>
            </div>
          </div>
        </div>

        {/* Sedang Dikerjakan */}
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <FiTrendingUp className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Sedang Dikerjakan</p>
              <p className="text-2xl font-bold text-gray-800">{stats.ongoingOrders}</p>
            </div>
          </div>
        </div>

        {/* Ketepatan Waktu */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-md">
            <div className="flex items-center mb-1">
              <FiCheckCircle className="h-4 w-4 text-green-600 mr-1" />
              <p className="text-xs text-gray-600">Tepat Waktu</p>
            </div>
            <p className="text-xl font-bold text-green-700">{stats.completedOnTime}</p>
          </div>
          
          <div className="p-3 bg-red-50 rounded-md">
            <div className="flex items-center mb-1">
              <FiAlertTriangle className="h-4 w-4 text-red-600 mr-1" />
              <p className="text-xs text-gray-600">Terlambat</p>
            </div>
            <p className="text-xl font-bold text-red-700">{stats.completedLate}</p>
          </div>
        </div>

        {/* Akurasi Rata-rata */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">Akurasi Estimasi</p>
              <p className="text-3xl font-bold text-[#0ea5e9]">{stats.averageAccuracy}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-1">Tingkat Ketepatan</p>
              <p className="text-2xl font-bold text-gray-700">{onTimeRate}%</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#0ea5e9] h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.averageAccuracy}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Info Tambahan */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Total Selesai: {stats.completedOnTime + stats.completedLate} order
          </p>
        </div>
      </div>
    </div>
  );
}

export default TimeEstimationStats;
