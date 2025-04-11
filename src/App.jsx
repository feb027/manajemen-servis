import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InventoryPage from './pages/InventoryPage';

// Komponen Placeholder untuk Protected Route
// TODO: Implementasikan logika otentikasi yang sebenarnya di sini
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = true; // Placeholder: anggap pengguna sudah login
  // Nanti, cek status login dari context atau state management lainnya
  // const { currentUser } = useAuth(); // Contoh jika menggunakan AuthContext

  if (!isAuthenticated) {
    // Jika tidak login, redirect ke halaman login
    return <Navigate to="/login" replace />;
  }

  // Jika sudah login, render children (komponen yang diproteksi)
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rute yang Diproteksi */}
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician"
          element={
            <ProtectedRoute>
              <TechnicianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
         <Route
          path="/inventory"
          element={
            <ProtectedRoute> {/* Sesuaikan proteksi jika perlu */}
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect ke login jika path tidak cocok atau akses root */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
