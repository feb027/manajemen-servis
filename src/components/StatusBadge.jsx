// src/components/StatusBadge.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { getStatusBadgeClasses, getStatusColorFromName } from '../utils/statusHelpers';

/**
 * Reusable Status Badge Component
 * Displays a colored badge for service order status
 * Automatically fetches color from database or uses fallback
 */
function StatusBadge({ status, className = '' }) {
  const [statusColor, setStatusColor] = useState(null);

  useEffect(() => {
    // Try to get color from cache or database
    const getColor = async () => {
      try {
        const { data } = await supabase
          .from('service_statuses')
          .select('color')
          .eq('name', status)
          .eq('is_active', true)
          .maybeSingle();

        if (data?.color) {
          setStatusColor(data.color);
        } else {
          // Fallback to name-based color
          setStatusColor(getStatusColorFromName(status));
        }
      } catch (error) {
        console.error('Error fetching status color:', error);
        // Fallback to name-based color
        setStatusColor(getStatusColorFromName(status));
      }
    };

    if (status) {
      getColor();
    }
  }, [status]);

  if (!status) return null;

  // Use fallback color while loading
  const color = statusColor || getStatusColorFromName(status);
  const classes = getStatusBadgeClasses(color);

  return (
    <span 
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes.bgClass} ${classes.textClass} ${className}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
