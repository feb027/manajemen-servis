import React from 'react';

// Simple Skeleton Row Component
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-5/6"></div></td>
    <td className="px-4 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
    <td className="px-4 py-4 whitespace-nowrap text-center"><div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div></td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex space-x-2">
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
);

// Main Skeleton Loader Component
function TableSkeletonLoader({ rows = 5 }) {
  // Basic column headers matching CustomerTable roughly
  const headers = [
    'Nama Lengkap',
    'Nomor Telepon',
    'Email',
    'Alamat',
    'Jml Servis',
    'Aksi',
  ];

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th 
                key={index} 
                scope="col" 
                className={`px-${index === 3 || index === 4 ? '4' : '6'} py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${index === 4 ? 'text-center' : ''}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(rows)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableSkeletonLoader; 