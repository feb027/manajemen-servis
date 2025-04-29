import React, { useEffect } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';

function Toast({ message, type = 'success', duration = 3000, onClose }) {
  // Call useEffect unconditionally first
  useEffect(() => {
    // Timeout logic only runs if there is a message and duration
    if (duration && message) { 
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  // Now, check if there's a message. If not, render nothing.
  if (!message) {
    return null;
  }

  // If there IS a message, proceed with rendering the toast
  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-500'; // Add more types if needed
  const iconColor = 'text-white'; // Icon color consistent for now

  return (
    <div 
      className={`fixed bottom-5 right-5 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} transition-all duration-300 ease-in-out z-50`}
      role="alert"
    >
      {isSuccess ? (
        <FiCheckCircle className={`w-6 h-6 mr-3 ${iconColor}`} />
      ) : (
        // Placeholder for error icon if needed later
        <FiCheckCircle className={`w-6 h-6 mr-3 ${iconColor}`} /> 
      )}
      <span className="flex-1 mr-4">{message}</span>
      <button 
        onClick={onClose} 
        className={`ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-full inline-flex ${isSuccess ? 'hover:bg-green-600' : 'hover:bg-red-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'focus:ring-offset-green-500 focus:ring-white' : 'focus:ring-offset-red-500 focus:ring-white'}`}
        aria-label="Close"
      >
        <FiX className={`h-5 w-5 ${iconColor}`} />
      </button>
    </div>
  );
}

export default Toast;
