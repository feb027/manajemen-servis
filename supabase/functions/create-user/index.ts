import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Import SupabaseClient type
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req)=>{
  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Define admin client outside try block for potential cleanup
  let adminSupabaseClient: SupabaseClient | null = null;
  let newUserId: string | null = null; // Track new user ID for potential cleanup

  try {
    // 2. Create Supabase client for invoking user
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 3. Check invoking user's role
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Authentication failed.");
    }
    const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
    if (userRole !== 'admin') {
      throw new Error("Permission denied. Admin role required.");
    }

    // 4. Parse Request Body
    let userData;
    try {
      userData = await req.json();
    } catch (jsonError) {
      throw new Error("Invalid request body.");
    }

    // 5. Validate Input Data
    if (!userData.email || !userData.password || userData.password.length < 6 || !userData.full_name || !userData.role) {
      throw new Error("Missing required fields or password too short.");
    }
    if (!['admin', 'receptionist', 'technician'].includes(userData.role)) {
       throw new Error("Invalid role specified.");
    }

    // 6. Create Supabase Admin Client
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) { throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY."); }
    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

    // 7. Create the Authentication User - SET email_confirm: TRUE
    console.log(`Admin ${user.id} creating user: ${userData.email}`);
    const { data: authData, error: authError } = await adminSupabaseClient.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    });

    if (authError) {
      // Handle specific auth errors... (logic unchanged)
      console.error('Supabase Auth Admin Error:', authError);
      let errorMessage = authError.message;
       if (authError.message.includes('unique constraint') && authError.message.includes('users_email_key')) {
        errorMessage = 'Email already exists.';
      } else if (authError.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Password is too short (minimum 6 characters required by Auth).';
      }
      // Return 400 for specific auth errors
      return new Response(JSON.stringify({ error: `Failed to create Auth user: ${errorMessage}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newUserId = authData.user?.id;
    if (!newUserId) { throw new Error("Auth user created but ID not found."); }
    console.log(`Auth user created successfully: ${newUserId}`);

    // --- TETAP LAKUKAN KONFIRMASI MANUAL PROGRAMATIS ---
    console.log(`Attempting to programmatically confirm email for user ${newUserId}`);
    const { error: confirmError } = await adminSupabaseClient.auth.admin.updateUserById(
        newUserId,
        { email_confirmed_at: new Date().toISOString() }
    );

    if (confirmError) {
        // Critical failure if programmatic confirmation fails
        console.error(`CRITICAL: Gagal mengkonfirmasi email programatis untuk user ${newUserId}:`, confirmError);
        // Cleanup attempt...
        if (newUserId && adminSupabaseClient) {
            await adminSupabaseClient.auth.admin.deleteUser(newUserId);
            console.warn(`Attempted cleanup: Deleted Auth user ${newUserId} due to confirmation failure.`);
        }
        throw new Error(`User created, but failed to confirm email programmatically: ${confirmError.message}`);
    } else {
        console.log(`Email for user ${newUserId} programmatically confirmed successfully.`);
    }
    // --- AKHIR KONFIRMASI MANUAL ---

    // 8. Create the User Profile in public 'users' table
    const { error: profileError } = await adminSupabaseClient.from('users')
      .insert({
        id: newUserId, // Use newUserId which is guaranteed to be string here
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role
      });

    if (profileError) {
      console.error(`Auth user ${newUserId} created and confirmed, but failed to create profile:`, profileError);
      // Coba hapus auth user jika profil gagal dibuat
      if (newUserId && adminSupabaseClient) {
          await adminSupabaseClient.auth.admin.deleteUser(newUserId);
          console.warn(`Attempted to delete orphaned Auth user ${newUserId} due to profile creation failure.`);
      }
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }
    console.log(`User profile created successfully for: ${newUserId}`);

    // 9. Return Success Response
    return new Response(JSON.stringify({
        message: 'User created and confirmed successfully!',
        userId: newUserId
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Function Error:', error);
     // Basic cleanup attempt if auth user was created before error occurred
     if (newUserId && adminSupabaseClient && !error.message.includes("Failed to create user profile") && !error.message.includes("failed to confirm email")) {
         try {
             console.warn(`Attempting cleanup: Deleting potentially orphaned auth user ${newUserId} due to error: ${error.message}`);
             await adminSupabaseClient.auth.admin.deleteUser(newUserId);
         } catch (cleanupError) {
             console.error(`Cleanup failed for user ${newUserId}:`, cleanupError);
         }
     }
    // Determine status code... (logic unchanged)
    let status = 500;
    if (error.message.includes("Permission denied") || error.message.includes("Authentication failed")) {
        status = 403;
    } else if (error.message.includes("Invalid request") || error.message.includes("Missing required")) {
        status = 400;
    }
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});