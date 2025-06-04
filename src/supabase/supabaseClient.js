import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key must be provided in .env file");
  // Mungkin tambahkan cara penanganan error yang lebih baik di sini
}

// Buat dan ekspor client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Anda bisa mengekspor komponen lain dari Supabase jika perlu,
// misalnya untuk Auth:
// export const auth = supabase.auth; 