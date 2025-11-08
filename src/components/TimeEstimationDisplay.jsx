import React, { useState, useEffect } from 'react';
import { FiClock, FiCalendar, FiPlay, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * TimeEstimationDisplay Component
 * Menampilkan informasi estimasi waktu dan tracking waktu aktual
 */
function TimeEstimationDisplay({ order, onUpdate }) {
  const { user } = useAuth(); // Get current user for role checking
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');
  
  // Only technicians and admins can start/complete work
  const canControlWork = user?.role === 'technician' || user?.role === 'admin';

  // Format date/time helper
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Belum diset';
    try {
      return new Date(dateString).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateString;
    }
  };

  // Calculate elapsed time
  useEffect(() => {
    if (!order?.actual_start_time) {
      setElapsedTime('');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(order.actual_start_time);
      const end = order.actual_completion_time ? new Date(order.actual_completion_time) : new Date();
      const diffMs = end - start;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setElapsedTime(`${diffHours} jam ${diffMinutes} menit`);
    };

    updateElapsed();
    
    // Update every minute if not completed
    if (!order.actual_completion_time) {
      const interval = setInterval(updateElapsed, 60000);
      return () => clearInterval(interval);
    }
  }, [order?.actual_start_time, order?.actual_completion_time]);

  // Calculate estimated vs actual difference
  const calculateDifference = () => {
    if (!order?.estimated_duration_hours || !order?.actual_duration_hours) return null;
    
    const diff = order.actual_duration_hours - order.estimated_duration_hours;
    const percentage = ((diff / order.estimated_duration_hours) * 100).toFixed(1);
    
    return { diff: diff.toFixed(1), percentage };
  };

  const handleStartWork = async () => {
    setIsStarting(true);
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ 
          actual_start_time: new Date().toISOString(),
          status: 'Diproses'
        })
        .eq('id', order.id);

      if (error) throw error;
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error starting work:', error);
      alert('Gagal memulai pengerjaan: ' + error.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCompleteWork = async () => {
    setIsCompleting(true);
    try {
      const startTime = new Date(order.actual_start_time);
      const endTime = new Date();
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('service_orders')
        .update({ 
          actual_completion_time: endTime.toISOString(),
          actual_duration_hours: durationHours,
          status: 'Selesai'
        })
        .eq('id', order.id);

      if (error) throw error;
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error completing work:', error);
      alert('Gagal menyelesaikan pengerjaan: ' + error.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const difference = calculateDifference();
  const isOverdue = order?.estimated_completion_time && 
                     new Date() > new Date(order.estimated_completion_time) &&
                     !order?.actual_completion_time;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <FiClock className="h-4 w-4 mr-2 text-[#0ea5e9]" />
        Estimasi & Tracking Waktu
      </h3>

      <div className="space-y-3">
        {/* Estimasi */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-md border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Estimasi Durasi</p>
            <p className="text-base font-semibold text-gray-800">
              {order?.estimated_duration_hours 
                ? `${order.estimated_duration_hours} jam` 
                : <span className="text-gray-400 text-sm">Tidak diset</span>}
            </p>
          </div>
          
          <div className="bg-white p-3 rounded-md border border-gray-200">
            <p className="text-xs text-gray-500 mb-1 flex items-center">
              <FiCalendar className="h-3 w-3 mr-1" />
              Estimasi Selesai
            </p>
            <p className="text-xs font-medium text-gray-800">
              {formatDateTime(order?.estimated_completion_time)}
            </p>
            {isOverdue && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <FiAlertCircle className="h-3 w-3 mr-1" />
                Terlambat!
              </p>
            )}
          </div>
        </div>

        {/* Waktu Aktual */}
        <div className="bg-white p-3 rounded-md border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Waktu Aktual</p>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Mulai:</span>
              <span className="font-medium">{formatDateTime(order?.actual_start_time)}</span>
            </div>
            
            {order?.actual_start_time && (
              <div className="flex justify-between">
                <span className="text-gray-600">Waktu Berjalan:</span>
                <span className="font-medium text-[#0ea5e9]">{elapsedTime}</span>
              </div>
            )}
            
            {order?.actual_completion_time && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selesai:</span>
                  <span className="font-medium">{formatDateTime(order.actual_completion_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Durasi:</span>
                  <span className="font-semibold">{order.actual_duration_hours?.toFixed(1)} jam</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Perbandingan */}
        {difference && (
          <div className={`p-3 rounded-md border ${
            difference.diff > 0 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <p className="text-xs font-medium mb-1">
              {difference.diff > 0 ? 'Melebihi Estimasi' : 'Sesuai/Lebih Cepat'}
            </p>
            <p className="text-sm">
              <span className={`font-semibold ${difference.diff > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                {difference.diff > 0 ? '+' : ''}{difference.diff} jam
              </span>
              <span className="text-gray-600 ml-1">
                ({difference.diff > 0 ? '+' : ''}{difference.percentage}%)
              </span>
            </p>
          </div>
        )}

        {/* Action Buttons - Only for technicians and admins */}
        {canControlWork && (
          <div className="flex gap-2 pt-2">
            {!order?.actual_start_time && order?.status !== 'Selesai' && (
              <button
                onClick={handleStartWork}
                disabled={isStarting}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-[#0ea5e9] text-white text-sm font-medium rounded-md hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9] disabled:opacity-50"
              >
                <FiPlay className="h-4 w-4 mr-1" />
                {isStarting ? 'Memulai...' : 'Mulai Pengerjaan'}
              </button>
            )}
            
            {order?.actual_start_time && !order?.actual_completion_time && (
              <button
                onClick={handleCompleteWork}
                disabled={isCompleting}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-50"
              >
                <FiCheckCircle className="h-4 w-4 mr-1" />
                {isCompleting ? 'Menyelesaikan...' : 'Selesaikan Pengerjaan'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeEstimationDisplay;
