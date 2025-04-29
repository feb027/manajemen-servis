import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
// Contoh impor ikon dari react-icons (install jika belum: npm install react-icons)
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi'; // Ikon email, kunci, login, mata, mata tertutup

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, session, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false); // 1. State untuk visibility password

  if (!authLoading && session) {
    return <Navigate to="/receptionist" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error("Login failed:", err);
      let errorMessage = 'Gagal login.';
      if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Email atau password salah.';
      } else if (err.message.includes('Email not confirmed')) {
          errorMessage = 'Email belum dikonfirmasi. Silakan cek inbox Anda.';
      } else {
          errorMessage = 'Terjadi kesalahan. Silakan coba lagi.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
             {/* Gunakan nilai hex untuk warna teks */}
             <svg className="animate-spin h-8 w-8 text-[#0ea5e9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
        </div>
    );
  }

  // Tambahkan kelas helper untuk styling input error
  const inputErrorClass = "border-red-500 focus:ring-red-500 focus:border-red-500";
  // Tambahkan transisi pada base class input
  const inputBaseClass = "appearance-none relative block w-full pl-10 pr-4 py-3 border border-gray-300 placeholder-gray-400/80 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] focus:z-10 sm:text-sm transition-all duration-150 ease-in-out shadow-sm hover:shadow-md focus:shadow-lg disabled:bg-gray-100";

  return (
    // Background lebih halus, font-sans global
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-blue-100/30 py-12 px-4 sm:px-6 lg:px-8 font-sans"> {/* Tambahkan font-sans */}
      {/* Card Login dengan hover effect */}
      <div className={`max-w-md w-full space-y-6 p-8 md:p-10 bg-white rounded-xl shadow-2xl border border-gray-200/50 transition-all duration-300 hover:shadow-blue-100/50 hover:shadow-lg ${loading ? 'opacity-75 pointer-events-none' : 'opacity-100'}`}> {/* Redupkan & disable interaksi saat loading */}
        <div className="text-center">
           {/* Gunakan nilai hex untuk warna bg dan text */}
           <div className="flex justify-center items-center mx-auto h-16 w-16 bg-[#0ea5e9]/10 rounded-full mb-4 border border-[#0ea5e9]/20">
             {/* <img className="mx-auto h-12 w-auto mb-4" src="/logo.svg" alt="Logo" /> */}
             <FiLock className="h-8 w-8 text-[#0ea5e9]" />
           </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">
            Selamat Datang Kembali
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Silakan login untuk mengakses sistem
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {/* Pesan Error */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-md text-sm" role="alert" aria-live="polite">
              <p className="font-semibold">Gagal Login</p>
              <p>{error}</p>
            </div>
          )}
          <input type="hidden" name="remember" defaultValue="true" />
          {/* Container Input */}
          <div className="space-y-5 rounded-md">
            {/* Email Input dengan Ikon */}
            <div className="relative group"> {/* Tambahkan group untuk state ikon */}
              <label htmlFor="email-address" className="sr-only"> {/* Buat sr-only lagi jika ikon sudah cukup jelas */}
                Alamat Email
              </label>
              {/* Ikon Email */}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                {/* Warna ikon mengikuti state border */}
                <FiMail className={`h-5 w-5 transition-colors duration-150 ${error.toLowerCase().includes('email') ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#0ea5e9]'}`} aria-hidden="true" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={error.toLowerCase().includes('email') ? 'true' : 'false'} // 3. Aria-invalid
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                // Tambahkan kelas error jika ada, sesuaikan padding kiri untuk ikon
                className={`${inputBaseClass} ${error.toLowerCase().includes('email') ? inputErrorClass : ''} pl-10`}
                placeholder="contoh@email.com"
              />
            </div>
            {/* Password Input dengan Ikon */}
            <div className="relative group"> {/* Tambahkan group untuk state ikon */}
               <label htmlFor="password" className="sr-only">
                Password
              </label>
               {/* Ikon Password */}
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                {/* Warna ikon mengikuti state border */}
                <FiLock className={`h-5 w-5 transition-colors duration-150 ${error.toLowerCase().includes('password') ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#0ea5e9]'}`} aria-hidden="true" />
              </div>
              <input
                id="password"
                name="password"
                // 2. Ubah type berdasarkan state showPassword
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-invalid={error.toLowerCase().includes('password') ? 'true' : 'false'} // 3. Aria-invalid
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                // Tambahkan pr-10 untuk ruang ikon mata
                className={`${inputBaseClass} ${error.toLowerCase().includes('password') ? inputErrorClass : ''} pl-10 pr-10`}
                placeholder="Password"
              />
              {/* 4. Tombol Toggle Password Visibility */}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-20">
                 <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9] rounded-md p-1"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    disabled={loading}
                 >
                    {showPassword ? (
                        <FiEyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                        <FiEye className="h-5 w-5" aria-hidden="true" />
                    )}
                 </button>
              </div>
            </div>
          </div>

          {/* Lupa Password Link */}
          <div className="flex items-center justify-end pt-2"> {/* Tambah padding top */}
            <div className="text-sm">
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Fitur belum tersedia!'); }} className="font-medium text-[#0ea5e9] hover:text-[#0284c7] transition duration-150 ease-in-out hover:underline">
                Lupa password?
              </a>
            </div>
          </div>

          {/* Tombol Login dengan Ikon */}
          <div className="pt-2"> {/* Tambah padding top */}
            <button
              type="submit"
              disabled={loading}
              // Tambahkan efek aktif (saat ditekan) dan fokus yg terlihat jelas
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-[#0ea5e9] hover:bg-[#0284c7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284c7] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 ease-in-out shadow-md hover:shadow-lg active:shadow-sm active:scale-[0.98]" // Efek tekan
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                 <>
                   <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <FiLogIn className="h-5 w-5 text-[#38bdf8] group-hover:text-[#0ea5e9] transition ease-in-out duration-150" aria-hidden="true" />
                    </span>
                    Login
                 </>
              )}
            </button>
          </div>

        </form>
         {/* Footer Card (opsional, misal untuk link lupa password/daftar) */}
         {/* <div className="text-sm text-center mt-6">
            <a href="#" className="font-medium text-[#0ea5e9] hover:text-[#0284c7]">
              Lupa password Anda?
            </a>
          </div> */}
      </div>
    </div>
  );
}

export default LoginPage; 