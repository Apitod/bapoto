/**
 * Inisialisasi Supabase Client (Anon Key only).
 * Tidak boleh menggunakan service_role key pada frontend!
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co'
);

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true
          }
      })
    : null;
