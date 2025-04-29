import { createClient } from '@supabase/supabase-js'

// TODO: Ganti dengan URL dan Kunci Anon proyek Supabase Anda
const supabaseUrl = 'https://jiwlommombvevsbbbtqa.supabase.co'; // Ambil dari Supabase Project Settings > API
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppd2xvbW1vbWJ2ZXZzYmJidHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTA4NzcsImV4cCI6MjA1OTkyNjg3N30.-oc7XiQDD33btdbH2bN-7QKDESlzwWQohe36LVyPP6I'; // Ambil dari Supabase Project Settings > API

// Buat dan ekspor client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Anda bisa mengekspor komponen lain dari Supabase jika perlu,
// misalnya untuk Auth:
// export const auth = supabase.auth; 