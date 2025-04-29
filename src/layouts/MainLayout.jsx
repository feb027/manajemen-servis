import React, { useState } from 'react';
import { Outlet } from 'react-router-dom'; // Untuk merender route anak
import Sidebar from '../components/layout/Sidebar'; // Komponen sidebar (akan dibuat)
import Header from '../components/layout/Header'; // Komponen header (akan dibuat)

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Konten Utama */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Area Konten Halaman (dengan scroll jika perlu) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 md:p-8">
          {/* Outlet akan merender komponen halaman sesuai route */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout; 