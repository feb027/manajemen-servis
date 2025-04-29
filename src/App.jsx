import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InventoryPage from './pages/InventoryPage';
import CustomerPage from './pages/CustomerPage';
import MainLayout from './layouts/MainLayout';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileSettings from './pages/settings/ProfileSettings';
import AppearanceSettings from './pages/settings/AppearanceSettings';
import SystemSettingsTab from './components/SystemSettingsTab';

// Komponen Protected Route - sekarang hanya cek sesi
const RequireAuth = () => {
  const { session } = useAuth(); // Hanya ambil session

  // Langsung cek session. Jika ada, render Outlet. Jika tidak, redirect.
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  const { user } = useAuth(); // Get user from auth context
  const userRole = user?.role; // Safely access the role

  return (
    <Router>
      <Routes>
        {/* Rute Publik (Login) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rute yang Diproteksi (Menggunakan Layout Utama) */}
        {/* 2. Buat route wrapper untuk RequireAuth (sebelumnya ProtectedRoute lokal) */}
        <Route element={<RequireAuth />}>
           {/* 3. Buat route wrapper untuk MainLayout */}
           <Route element={<MainLayout />}>
              {/* Definisikan route anak di sini, relatif terhadap MainLayout */}
              <Route path="/receptionist" element={<ProtectedRoute allowedRoles={['admin', 'receptionist']} element={<ReceptionistDashboard />} />} />
              <Route path="/technician" element={<ProtectedRoute allowedRoles={['admin', 'technician']} element={<TechnicianDashboard />} />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} element={<AdminDashboard />} />} />
              <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'receptionist', 'technician']} element={<InventoryPage />} />} />
              <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin', 'receptionist']} element={<CustomerPage />} />} />
              {/* <Route path="/orders/:orderId" element={<ProtectedRoute allowedRoles={['admin', 'receptionist', 'technician']} element={<OrderDetailPage />} />} /> */}
              
              {/* Settings Route with Nested Routes */}
              <Route 
                  path="/settings" 
                  element={
                      <ProtectedRoute 
                          allowedRoles={['admin', 'receptionist', 'technician']} 
                          element={<SettingsPage />} 
                      />
                  }
              >
                  {/* Nested routes for settings tabs */}
                  <Route index element={<ProfileSettings />} /> {/* Default tab */} 
                  <Route path="profile" element={<ProfileSettings />} />
                  <Route path="appearance" element={<AppearanceSettings />} />
              </Route>
              
              {/* Redirect default jika sudah login tapi path tidak cocok */}
              {/* Navigasi ke dashboard berdasarkan role */}
              <Route path="/" element={<Navigate to={ userRole === 'technician' ? '/technician' : '/receptionist'} replace />} />
              {/* Fallback untuk path kosong jika role tidak jelas (misal, saat loading) */}
              <Route index element={<Navigate to="/receptionist" replace />} />
           </Route>
        </Route>

        {/* Redirect akhir jika tidak cocok sama sekali (termasuk jika tidak login dan akses path aneh) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
