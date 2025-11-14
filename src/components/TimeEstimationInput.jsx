import React from 'react';
import { FiClock, FiCalendar } from 'react-icons/fi';

/**
 * TimeEstimationInput Component
 * Input untuk estimasi durasi (jam) dan tanggal estimasi selesai
 */
function TimeEstimationInput({ 
  estimatedDurationHours, 
  estimatedCompletionTime,
  onDurationChange,
  onCompletionTimeChange,
  disabled = false 
}) {
  
  // Auto-calculate completion time based on duration
  const handleDurationChange = (e) => {
    const hours = e.target.value;
    onDurationChange(hours);
    
    // Auto-calculate completion time if duration is set
    if (hours && !estimatedCompletionTime) {
      const now = new Date();
      const completion = new Date(now.getTime() + (hours * 60 * 60 * 1000));
      onCompletionTimeChange(completion.toISOString().slice(0, 16));
    }
  };

  return (
    <fieldset className="mb-4 border border-gray-200 rounded-md p-4 pt-2">
      <legend className="text-sm font-medium text-gray-600 px-1">Estimasi Waktu</legend>
      <div className="space-y-3 mt-2">
        <div>
          <label htmlFor="estimatedDurationHours" className="block text-sm font-medium text-gray-700 mb-1">
            Estimasi Durasi Pengerjaan (Jam)
            <span className="text-xs text-gray-500 ml-1">(Opsional - dapat menggunakan desimal)</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiClock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              id="estimatedDurationHours"
              name="estimatedDurationHours"
              value={estimatedDurationHours}
              onChange={handleDurationChange}
              min="0"
              step="0.5"
              disabled={disabled}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Contoh: 2, 4.5, 24"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Perkiraan waktu yang dibutuhkan (mendukung desimal, contoh: 2.5 jam = 2 jam 30 menit)
          </p>
        </div>

        <div>
          <label htmlFor="estimatedCompletionTime" className="block text-sm font-medium text-gray-700 mb-1">
            Estimasi Selesai
            <span className="text-xs text-gray-500 ml-1">(Opsional)</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="datetime-local"
              id="estimatedCompletionTime"
              name="estimatedCompletionTime"
              value={estimatedCompletionTime}
              onChange={(e) => onCompletionTimeChange(e.target.value)}
              disabled={disabled}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Tanggal dan waktu diperkirakan selesai
          </p>
        </div>
      </div>
    </fieldset>
  );
}

export default TimeEstimationInput;
