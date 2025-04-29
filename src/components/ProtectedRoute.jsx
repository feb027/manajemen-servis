// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Pastikan path ini benar

const ProtectedRoute = ({ allowedRoles, element }) => {
  const { user, session } = useAuth();

  // 1. Cek jika user login (ada session)
  if (!session) {
    // Jika tidak login, redirect ke halaman login
    return <Navigate to="/login" replace />;
  }

  // 2. Cek jika role user diizinkan
  const userRole = user?.role;
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Jika login tapi role tidak diizinkan, redirect ke halaman default sesuai role
    // Atau bisa juga ke halaman "Unauthorized" jika ada
    const defaultPath = userRole === 'technician' ? '/technician' : userRole === 'admin' ? '/admin' : '/receptionist';
    console.warn(`User role '${userRole}' is not allowed for this route. Redirecting to ${defaultPath}.`);
    return <Navigate to={defaultPath} replace />;
    // Alternatif: return <Navigate to="/unauthorized" replace />;
  }

  // 3. Jika login dan role diizinkan (atau jika allowedRoles tidak diset), render elemen yang diminta
  // Jika 'element' prop diberikan, render itu. Jika tidak, render <Outlet /> (untuk nested routes).
  return element ? element : <Outlet />;
};

export default ProtectedRoute;