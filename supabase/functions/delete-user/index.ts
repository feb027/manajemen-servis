import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DeleteRequestBody {
  userIdToDelete: string; // Expect the ID of the user to delete
}

serve(async (req) => {
  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Create Supabase client to check invoking user's role
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 3. Check if the invoking user is an admin
    const { data: { user }, error: invokingUserError } = await userSupabaseClient.auth.getUser();
    if (invokingUserError || !user) {
      throw new Error("Authentication failed for invoking user.");
    }
    const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
    if (userRole !== 'admin') {
       throw new Error("Permission denied. Admin role required.");
    }

    // 4. Parse Request Body to get the userIdToDelete
    let requestBody: DeleteRequestBody;
    try {
      requestBody = await req.json();
      if (!requestBody.userIdToDelete) {
          throw new Error("Missing userIdToDelete in request body.");
      }
    } catch (jsonError) {
      throw new Error("Invalid request body.");
    }
    const { userIdToDelete } = requestBody;

    // 5. Create Supabase Admin Client
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- IMPORTANT: Check if admin is trying to delete themselves ---
    if (user.id === userIdToDelete) {
        throw new Error("Admin cannot delete their own account.");
    }

    // 6. Delete the Authentication User using Admin API
    console.log(`Admin ${user.id} attempting to delete user ${userIdToDelete}`);
    const { error: deleteError } = await adminSupabaseClient.auth.admin.deleteUser(
      userIdToDelete
    );

    if (deleteError) {
      console.error(`Error deleting user ${userIdToDelete}:`, deleteError);
      // Provide specific error message if user not found
      if (deleteError.message.toLowerCase().includes('not found')) {
         throw new Error(`User with ID ${userIdToDelete} not found.`);
      }
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log(`User ${userIdToDelete} deleted successfully by admin ${user.id}.`);

    // Note: Supabase typically handles deleting the public.users row via trigger
    // based on auth.users deletion. If not, you might need to delete it manually here *after* auth deletion.

    // 7. Return Success Response
    return new Response(JSON.stringify({ message: 'User deleted successfully!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Delete User Function Error:', error);
    // Determine appropriate status code based on error type
    let status = 500;
    if (error.message.includes("Permission denied") || error.message.includes("Authentication failed")) {
        status = 403; // Forbidden or Unauthorized
    } else if (error.message.includes("Invalid request") || error.message.includes("Missing userIdToDelete")) {
        status = 400; // Bad Request
    } else if (error.message.includes("not found")) {
        status = 404; // Not Found
    } else if (error.message.includes("cannot delete their own account")) {
        status = 400; // Bad Request (or 403 Forbidden)
    }

    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})