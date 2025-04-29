import React from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

// Helper function for role badges
const getRoleBadge = (role) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    let text = role || 'N/A';

    switch (role?.toLowerCase()) {
        case 'admin':
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; text = 'Admin'; break;
        case 'receptionist':
            bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; text = 'Resepsionis'; break;
        case 'technician':
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; text = 'Teknisi'; break;
    }
    return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${bgColor} ${textColor}`}>{text}</span>;
};

// Added sortConfig and requestSort props
function UserTable({ users, onEdit, onDelete, sortConfig, requestSort }) {

    // Helper to get sort icon
    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <FaSort className="inline ml-1 h-3 w-3 text-gray-400" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <FaSortUp className="inline ml-1 h-3 w-3 text-sky-600" />;
        }
        return <FaSortDown className="inline ml-1 h-3 w-3 text-sky-600" />;
    };

    if (!users || users.length === 0) {
        // Add icon to empty state later in AdminDashboard if needed
        return <p className="text-center text-gray-500 mt-4 py-6">Belum ada data pengguna.</p>;
    }

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button onClick={() => requestSort('full_name')} className={`flex items-center focus:outline-none ${sortConfig?.key === 'full_name' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> 
                                Nama Lengkap {getSortIcon('full_name')}
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button onClick={() => requestSort('email')} className={`flex items-center focus:outline-none ${sortConfig?.key === 'email' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> 
                                Email {getSortIcon('email')}
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                             <button onClick={() => requestSort('role')} className={`flex items-center focus:outline-none ${sortConfig?.key === 'role' ? 'text-gray-800 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}> 
                                Role {getSortIcon('role')}
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user, index) => (
                        <tr 
                            key={user.id} 
                            className={`transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-sky-50`} // Zebra striping
                        >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{user.full_name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{user.email || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getRoleBadge(user.role)} {/* Use role badge */} 
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                                    className="p-1.5 text-yellow-600 hover:text-yellow-800 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-yellow-400 transition-colors duration-150"
                                    title="Edit Pengguna"
                                >
                                    <FiEdit className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(user.id); }}
                                    className="p-1.5 text-red-600 hover:text-red-800 rounded-md hover:bg-red-100 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-400 transition-colors duration-150"
                                    title="Hapus Pengguna"
                                >
                                    <FiTrash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default UserTable; 