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

/**
 * Adapter storage untuk Supabase Auth.
 * localStorage bisa melempar SecurityError ("The operation is insecure.") bila cookie/storage
 * diblokir (mode privat, WebView in-app, iframe sandbox). Tanpa fallback, login mustahil.
 * ponytail: fallback hanya memori — sesi hilang saat reload. Ganti ke cookie ber-HttpOnly bila
 * server-side auth ditambahkan.
 */
function createAuthStorage() {
    try {
        const probe = '__bapoto_storage_probe__';
        window.localStorage.setItem(probe, '1');
        window.localStorage.removeItem(probe);
        return window.localStorage;
    } catch (err) {
        console.warn('[Supabase] localStorage diblokir, sesi login disimpan di memori:', err.message);
        const mem = new Map();
        return {
            getItem: key => (mem.has(key) ? mem.get(key) : null),
            setItem: (key, value) => { mem.set(key, String(value)); },
            removeItem: key => { mem.delete(key); }
        };
    }
}

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              storage: createAuthStorage()
          }
      })
    : null;
