/**
 * Inisialisasi Supabase Client (Anon Key only).
 * Tidak boleh menggunakan service_role key pada frontend!
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseAnonKey.endsWith('...')
);

if (!isConfigured) {
    console.warn('[Supabase] Belum aktif atau belum lengkap pada .env:', {
        url: supabaseUrl || '(kosong)',
        keyPresent: Boolean(supabaseAnonKey && !supabaseAnonKey.endsWith('...'))
    });
} else {
    console.log('[Supabase] Berhasil terhubung ke:', supabaseUrl);
}

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true
          }
      })
    : null;
