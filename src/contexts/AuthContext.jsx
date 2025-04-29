import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Menyimpan data user dari tabel 'users'
  const [session, setSession] = useState(null); // Menyimpan sesi Supabase Auth
  const [loadingInitial, setLoadingInitial] = useState(true); // Renamed: Only for initial session check
  const [loadingUser, setLoadingUser] = useState(false); // Separate loading for user fetch
  const currentUserIdRef = useRef(null); // Track current user ID to prevent redundant fetches

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("[getSession] Initial session check result:", session);
      setSession(session);
      const initialUserId = session?.user?.id || null;
      currentUserIdRef.current = initialUserId;
      if (initialUserId) {
        console.log("[getSession] User session found, fetching user data...");
        await fetchUserData(session.user, true); // Fetch user on initial load
      }
      setLoadingInitial(false); // Initial check finished
    }).catch(err => {
      console.error("[getSession] Error getting initial session:", err);
      setLoadingInitial(false);
    });

    // 2. Listen for Auth State Changes (Simplified)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`[onAuthStateChange] Event: ${_event}`, session);
        const newAuthUserId = session?.user?.id || null;
        currentUserIdRef.current = newAuthUserId; // Keep ref updated

        setSession(session); // Always update session state

        // ONLY handle explicit SIGNED_OUT here.
        // User data fetching for SIGNED_IN is handled by getSession above.
        if (_event === 'SIGNED_OUT') {
          console.log("[onAuthStateChange] User signed out, clearing user data.");
          setUser(null);
        } else {
          // For SIGNED_IN, TOKEN_REFRESHED, etc., just log.
          // We rely on the initial fetchUserData from getSession.
          console.log(`[onAuthStateChange] Event ${_event} occurred. Listener is NOT fetching user data.`);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // fetchUserData now manages its own loading state
  const fetchUserData = async (authUser, isInitialLoad = false) => {
    if (!authUser?.id) {
        setUser(null);
        return;
    }
    console.log(`[fetchUserData] Called for user: ${authUser.id}, isInitialLoad: ${isInitialLoad}`);
    if (!isInitialLoad) setLoadingUser(true); // Set loading only for non-initial fetches
    try {
      console.log(`[fetchUserData] Attempting to fetch from 'users' table for ID: ${authUser.id}`); // Log before await
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      console.log(`[fetchUserData] Supabase fetch completed for ID: ${authUser.id}. Error: ${error}, Data: ${data ? 'exists' : 'null'}`); // Log after await

      if (error && error.code !== 'PGRST116') { 
        throw error;
      }
      setUser(data); 
      console.log("[fetchUserData] User state updated:", data);
    } catch (error) {
      console.error('[fetchUserData] Error fetching user data:', error); // Log in catch
      setUser(null); 
    } finally {
      console.log(`[fetchUserData] Finally block reached for ID: ${authUser.id}. Setting loadingUser to false.`); // Log in finally
      if (!isInitialLoad) setLoadingUser(false); // Turn off loading only for non-initial fetches
    }
  };


  // Fungsi login (contoh: email/password)
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Fetch user data akan otomatis terpanggil oleh onAuthStateChange
  };

  // Fungsi logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null); // Langsung set null di state
    setSession(null);
  };

  // Fungsi signup (contoh dasar)
  const signup = async (email, password, fullName, role = 'receptionist') => {
    // Step 1: Sign up user di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Signup successful but no user data returned.");

    // Step 2: Insert data user ke tabel 'users' kita
    // PENTING: Pastikan RLS di tabel 'users' mengizinkan operasi ini,
    // atau lakukan ini dari backend/trigger jika RLS sangat ketat.
    // Untuk contoh ini, kita asumsikan user yg baru signup bisa insert data diri sendiri.
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id, // Gunakan ID dari auth.user
        email: email,
        full_name: fullName,
        role: role,
      });

    if (insertError) {
        // Jika insert gagal, mungkin perlu menghapus user auth yg sudah terbuat
        // atau beri pesan error yg jelas
        console.error("Error inserting user data after signup:", insertError);
        // Coba hapus user auth yg baru dibuat (opsional, butuh akses admin/service_role)
        // await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Signup auth success, but failed to save user profile: ${insertError.message}`);
    }

    // Set user state secara manual setelah signup & insert berhasil
    // karena onAuthStateChange mungkin tidak langsung dapat data dari tabel 'users'
    await fetchUserData(authData.user);

    return authData;
  };


  // Nilai yang disediakan oleh context
  const value = {
    session,
    user, // Data user dari tabel 'users'
    login,
    logout,
    signup, // Tambahkan signup
    loading: loadingInitial || loadingUser, // Combine loading states for consumers if needed
    loadingInitial, // Expose initial loading state separately
    loadingUser, // Expose user fetch loading state separately
  };

  // Jangan render children sampai loading awal selesai
  // return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
  // Render children langsung, komponen yg butuh user/session bisa cek loading/user/session sendiri
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook untuk menggunakan AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 