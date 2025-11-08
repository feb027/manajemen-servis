// src/utils/statusHelpers.js
// Utility functions for handling service order statuses

/**
 * Get Tailwind CSS classes for status badge based on color
 * @param {string} color - Color value from database (blue, yellow, orange, green, red, etc)
 * @returns {object} Object with bgClass and textClass
 */
export const getStatusBadgeClasses = (color) => {
  const colorMap = {
    blue: { bgClass: 'bg-blue-200', textClass: 'text-blue-800' },
    yellow: { bgClass: 'bg-yellow-200', textClass: 'text-yellow-800' },
    orange: { bgClass: 'bg-orange-200', textClass: 'text-orange-800' },
    green: { bgClass: 'bg-green-200', textClass: 'text-green-800' },
    red: { bgClass: 'bg-red-200', textClass: 'text-red-800' },
    purple: { bgClass: 'bg-purple-200', textClass: 'text-purple-800' },
    pink: { bgClass: 'bg-pink-200', textClass: 'text-pink-800' },
    indigo: { bgClass: 'bg-indigo-200', textClass: 'text-indigo-800' },
    teal: { bgClass: 'bg-teal-200', textClass: 'text-teal-800' },
    gray: { bgClass: 'bg-gray-200', textClass: 'text-gray-800' },
  };

  return colorMap[color] || colorMap.gray; // Default to gray if color not found
};

/**
 * Get status color from status name (fallback for backward compatibility)
 * @param {string} statusName - Name of the status
 * @returns {string} Color value
 */
export const getStatusColorFromName = (statusName) => {
  const nameToColor = {
    'Baru': 'blue',
    'Diproses': 'yellow',
    'Menunggu Spare Part': 'orange',
    'Selesai': 'green',
    'Dibatalkan': 'red',
  };

  return nameToColor[statusName] || 'gray';
};

/**
 * Cache for status colors fetched from database
 * This prevents unnecessary database calls
 */
let statusColorCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch status colors from database with caching
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<object>} Map of status name to color
 */
export const fetchStatusColors = async (supabase) => {
  // Check if cache is valid
  const now = Date.now();
  if (statusColorCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return statusColorCache;
  }

  try {
    const { data, error } = await supabase
      .from('service_statuses')
      .select('name, color')
      .eq('is_active', true);

    if (error) throw error;

    // Create map of status name to color
    const colorMap = {};
    if (data) {
      data.forEach(status => {
        colorMap[status.name] = status.color;
      });
    }

    // Update cache
    statusColorCache = colorMap;
    cacheTimestamp = now;

    return colorMap;
  } catch (error) {
    console.error('Error fetching status colors:', error);
    // Return fallback map on error
    return {
      'Baru': 'blue',
      'Diproses': 'yellow',
      'Menunggu Spare Part': 'orange',
      'Selesai': 'green',
      'Dibatalkan': 'red',
    };
  }
};

/**
 * Clear the status color cache (useful when statuses are updated)
 */
export const clearStatusColorCache = () => {
  statusColorCache = null;
  cacheTimestamp = null;
};

/**
 * Get status badge component props
 * @param {string} statusName - Name of the status
 * @param {string} statusColor - Color from database (optional, will fetch if not provided)
 * @returns {object} Props for status badge
 */
export const getStatusBadgeProps = (statusName, statusColor = null) => {
  const color = statusColor || getStatusColorFromName(statusName);
  const classes = getStatusBadgeClasses(color);
  
  return {
    className: `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${classes.bgClass} ${classes.textClass}`,
    children: statusName,
  };
};
