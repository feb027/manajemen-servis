import { createClient } from '@supabase/supabase-js'

// TODO: Ganti dengan URL dan Kunci Anon proyek Supabase Anda
const supabaseUrl = ''; // Ambil dari Supabase Project Settings > API
const supabaseAnonKey = ''; // Ambil dari Supabase Project Settings > API

// Buat dan ekspor client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Anda bisa mengekspor komponen lain dari Supabase jika perlu,
// misalnya untuk Auth:
// export const auth = supabase.auth; 
