import React from 'react';

function RightColumnCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow animate-pulse">
      {/* Header Skeleton */}
      <div className="h-12 border-b border-gray-200 px-5 py-3">
         <div className="h-5 bg-gray-200 rounded w-1/2"></div>
      </div>
      {/* Content Skeleton */}
      <div className="p-5">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export default RightColumnCardSkeleton; 