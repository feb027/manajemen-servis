// src/pages/settings/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiUser, FiLock, FiSave, FiLoader, FiEye, FiEyeOff, FiX, FiPhone } from 'react-icons/fi';

// Helper function for password strength (adjusted colors and added text color)
const calculatePasswordStrength = (password) => {
  let score = 0;
  if (!password || password.length < 6) return { score: 0, text: 'Sangat Lemah', color: 'bg-red-500', textColor: 'text-red-600', width: 'w-[20%]' };

  // Criteria
  if (password.length >= 8) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++; // Uppercase
  if (/[a-z]/.test(password)) score++; // Lowercase
  if (/[0-9]/.test(password)) score++; // Numbers
  if (/[^A-Za-z0-9]/.test(password)) score++; // Symbols

  score = Math.min(score, 5); // Cap score at 5

  switch (score) {
    case 0:
    case 1:
      return { score, text: 'Sangat Lemah', color: 'bg-red-500', textColor: 'text-red-600', width: 'w-[20%]' };
    case 2:
      return { score, text: 'Lemah', color: 'bg-orange-500', textColor: 'text-orange-600', width: 'w-[40%]' };
    case 3:
      // Use Amber instead of Yellow for potentially better contrast
      return { score, text: 'Sedang', color: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-[60%]' };
    case 4:
      return { score, text: 'Kuat', color: 'bg-lime-500', textColor: 'text-lime-600', width: 'w-[80%]' };
    case 5:
      return { score, text: 'Sangat Kuat', color: 'bg-green-500', textColor: 'text-green-600', width: 'w-[100%]' };
    default:
      return { score: 0, text: '', color: 'bg-transparent', textColor: 'text-transparent', width: 'w-0' };
  }
};

function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editedPhoneNumber, setEditedPhoneNumber] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(calculatePasswordStrength('')); // Initial strength state

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      const currentDisplayName = user.user_metadata?.full_name || '';
      const currentPhoneNumber = user.user_metadata?.phone_number || '';
      setDisplayName(currentDisplayName);
      setEditedDisplayName(currentDisplayName);
      setPhoneNumber(currentPhoneNumber);
      setEditedPhoneNumber(currentPhoneNumber);
    }
  }, [user]);

  // Reset edited name/phone if original changes
  useEffect(() => {
      setEditedDisplayName(displayName);
      setEditedPhoneNumber(phoneNumber);
  }, [displayName, phoneNumber]);

  const handleProfileUpdate = async (e) => {
      e.preventDefault();
      const trimmedName = editedDisplayName.trim();
      const trimmedPhone = editedPhoneNumber.trim();

      if (trimmedName === displayName && trimmedPhone === phoneNumber) {
          toast.info("Tidak ada perubahan pada info profil.");
          return;
      }
      if (!trimmedName) {
          toast.error("Nama tampilan tidak boleh kosong.");
          return;
      }

      setIsSavingProfile(true);
      toast.loading('Menyimpan info profil...');

      // Prepare data to update
      const updateData = {};
      if (trimmedName !== displayName) {
          updateData.full_name = trimmedName;
      }
      if (trimmedPhone !== phoneNumber) {
          // Add basic phone validation if needed here
          updateData.phone_number = trimmedPhone || null; // Save null if empty
      }

      try {
          const { error } = await supabase.auth.updateUser({
              data: updateData // Update metadata with potentially multiple fields
          });

          toast.dismiss();

          if (error) throw error;

          // Update local state only for fields that were changed
          if ('full_name' in updateData) setDisplayName(trimmedName);
          if ('phone_number' in updateData) setPhoneNumber(trimmedPhone || '');

          toast.success("Informasi profil berhasil diperbarui.");
          refreshUser();

      } catch (error) {
          console.error("Error updating profile:", error);
          toast.dismiss();
          toast.error(`Gagal memperbarui profil: ${error.message}`);
      } finally {
          setIsSavingProfile(false);
      }
  };

  const handleCancelProfileEdit = () => {
      setEditedDisplayName(displayName);
      setEditedPhoneNumber(phoneNumber);
  };

  const handleNewPasswordChange = (e) => {
      const newPass = e.target.value;
      setNewPassword(newPass);
      setPasswordStrength(calculatePasswordStrength(newPass));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
        toast.error('Silakan masukkan kata sandi Anda saat ini.');
        return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Kata sandi baru tidak cocok atau kosong.');
      return;
    }
    if (newPassword.length < 6) {
        toast.error('Kata sandi baru minimal 6 karakter.');
        return;
    }
     if (newPassword === currentPassword) {
        toast.error('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.');
        return;
    }

    setIsSavingPassword(true);
    toast.loading('Memperbarui kata sandi...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      toast.dismiss();

      if (error) {
        if (error.message.includes("requires recent login")) {
             toast.error('Gagal: Anda perlu login kembali untuk mengubah kata sandi.', { duration: 5000 });
        } else {
            throw error;
        }
      } else {
        toast.success('Kata sandi Anda telah berhasil diperbarui.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStrength(calculatePasswordStrength('')); // Reset strength
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.dismiss();
      toast.error(`Gagal memperbarui kata sandi: ${error.message}`);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const inputBaseClass = "block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out";
  const editableInputHoverClass = "hover:bg-gray-50/50";
  const primaryButtonClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition";
  const cancelButtonClasses = "inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition";
  const passwordVisibilityToggleClass = "flex items-center text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none flex-shrink-0 ml-2 p-1 rounded-full hover:bg-gray-100";

  // Check if name OR phone has changed
  const hasProfileChanged = (
      (editedDisplayName.trim() !== displayName && editedDisplayName.trim().length > 0) ||
      (editedPhoneNumber.trim() !== phoneNumber)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Section: Informasi Akun (Column 1) */}
      <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
        <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
          <FiUser className="mr-2 text-gray-500" />
          Informasi Akun
        </h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4 flex-grow flex flex-col">
          <div className="flex-grow space-y-4">
            {/* Display Name field */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">Nama Tampilan</label>
              <input
                type="text"
                id="displayName"
                value={editedDisplayName}
                onChange={(e) => setEditedDisplayName(e.target.value)}
                className={`${inputBaseClass} ${editableInputHoverClass}`}
                disabled={isSavingProfile}
                required
              />
               <p className="mt-1 text-xs text-gray-600">Nama ini akan ditampilkan di aplikasi.</p>
            </div>
            {/* Email field (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
               <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    className={`${inputBaseClass} bg-gray-100 cursor-not-allowed flex-grow`}
                    disabled
                    readOnly
                  />
               </div>
            </div>
            {/* Phone Number field */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon <span className="text-xs text-gray-400">(Opsional)</span></label>
              <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <FiPhone className="text-gray-400 h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={editedPhoneNumber}
                    onChange={(e) => setEditedPhoneNumber(e.target.value)}
                    className={`${inputBaseClass} pl-10 ${editableInputHoverClass}`}
                    disabled={isSavingProfile}
                    placeholder='Contoh: 08123456789'
                  />
              </div>
            </div>
          </div>
          {/* Action Buttons for Profile (pushed to bottom) */}
           <div className="pt-4 mt-auto flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelProfileEdit}
                className={cancelButtonClasses}
                disabled={!hasProfileChanged || isSavingProfile}
              >
                 <FiX className="-ml-1 mr-1.5 h-4 w-4" /> Batal
              </button>
              <button
                type="submit"
                className={primaryButtonClasses}
                disabled={!hasProfileChanged || isSavingProfile}
              >
                {isSavingProfile ? (
                  <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                ) : (
                  <FiSave className="-ml-1 mr-2 h-4 w-4" />
                )}
                {isSavingProfile ? 'Menyimpan...' : 'Simpan Info'}
              </button>
           </div>
        </form>
      </div>

      {/* Section: Ganti Kata Sandi (Column 2) */}
      <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
        <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
          <FiLock className="mr-2 text-gray-500" />
          Ganti Kata Sandi
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 flex-grow flex flex-col">
          <div className="flex-grow space-y-4">
            <div>
              <label htmlFor="currentPassword"  className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Saat Ini</label>
              <div className="flex items-center">
                  <input
                       type={showCurrentPassword ? "text" : "password"}
                       id="currentPassword"
                       value={currentPassword}
                       onChange={(e) => setCurrentPassword(e.target.value)}
                       className={`${inputBaseClass} flex-grow ${editableInputHoverClass}`}
                       required
                       disabled={isSavingPassword}
                   />
                   <button
                       type="button"
                       onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                       className={passwordVisibilityToggleClass}
                       aria-label={showCurrentPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                       title={showCurrentPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                   >
                       {showCurrentPassword ? <FiEyeOff size={18}/> : <FiEye size={18}/>}
                   </button>
              </div>
            </div>
            <div>
              <label htmlFor="newPassword"  className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
              <div className="flex items-center">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  className={`${inputBaseClass} flex-grow ${editableInputHoverClass}`}
                  required
                  minLength="6"
                  disabled={isSavingPassword}
                />
                <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={passwordVisibilityToggleClass}
                    aria-label={showNewPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    title={showNewPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                    {showNewPassword ? <FiEyeOff size={18}/> : <FiEye size={18}/>}
                </button>
              </div>
              {/* Password Strength Indicator */}
              <div className="mt-2">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${newPassword.length > 0 ? passwordStrength.color : 'bg-transparent'} ${newPassword.length > 0 ? passwordStrength.width : 'w-0'} transition-all duration-300 ease-in-out`}></div>
                </div>
                {newPassword.length > 0 && (
                  <p className={`text-xs mt-1 text-right font-medium ${passwordStrength.textColor}`}>
                    {passwordStrength.text}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
              <div className="flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputBaseClass} flex-grow ${editableInputHoverClass} ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-red-500 focus:ring-red-400 focus:border-red-500' : ''}`}
                  required
                  disabled={isSavingPassword}
                />
                 <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={passwordVisibilityToggleClass}
                    aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    title={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                    {showConfirmPassword ? <FiEyeOff size={18}/> : <FiEye size={18}/>}
                </button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Kata sandi tidak cocok.</p>
              )}
            </div>
          </div>
          {/* Action Buttons for Password (pushed to bottom) */}
          <div className="pt-4 mt-auto flex justify-end">
            <button
              type="submit"
              className={primaryButtonClasses}
              disabled={isSavingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || passwordStrength.score < 2}
            >
              {isSavingPassword ? (
                <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
              ) : (
                <FiSave className="-ml-1 mr-2 h-4 w-4" />
              )}
              {isSavingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileSettings;