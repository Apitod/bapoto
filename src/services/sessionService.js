/**
 * Layanan Pengelolaan Sesi & Penyimpanan Foto/GIF di Supabase.
 * Menghandle:
 * - Upload hasil ke storage bucket 'session-results'
 * - Pencatatan metadata ke tabel 'sessions'
 * - Pembuatan token unduh berkriptografi aman
 * - Pembuatan QR Code untuk di-scan oleh customer
 * - Pengambilan data sesi untuk halaman download & admin
 */
import QRCode from 'qrcode';
import { supabase, isConfigured } from './supabase.js';

const STORAGE_BUCKET = 'session-results';
const RETENTION_HOURS = 24;

/**
 * Buat sesi photobooth baru, unggah hasil ke storage, dan buat QR code.
 *
 * @param {object} params
 * @param {Blob} params.blob             File gambar final (PNG atau GIF)
 * @param {string} params.format         'photo' atau 'gif'
 * @param {object} params.frame          Objek frame terpilih
 * @returns {Promise<{
 *   success: boolean,
 *   sessionId: string,
 *   downloadToken: string,
 *   downloadUrl: string,
 *   qrDataUrl: string,
 *   expiresAt: string,
 *   isOfflineFallback?: boolean,
 *   error?: string
 * }>}
 */
export async function createSessionAndUpload({ blob, format, frame }) {
    const downloadToken = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const ext = format === 'gif' ? 'gif' : 'png';
    const filePath = `${sessionId}/${downloadToken}.${ext}`;

    const expiresDate = new Date();
    expiresDate.setHours(expiresDate.getHours() + RETENTION_HOURS);
    const expiresAt = expiresDate.toISOString();

    const downloadUrl = `${window.location.origin}/download.html?token=${downloadToken}`;

    // Buat QR code terlebih dahulu
    const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
        width: 380,
        margin: 2,
        color: {
            dark: '#111111',
            light: '#FFFFFF'
        }
    });

    if (!isConfigured || !supabase) {
        console.warn('Supabase belum dikonfigurasi. Berjalan dalam mode lokal / offline fallback.');
        return {
            success: true,
            sessionId,
            downloadToken,
            downloadUrl,
            qrDataUrl,
            expiresAt,
            isOfflineFallback: true
        };
    }

    try {
        // 1. Upload ke Supabase Storage
        const mimeType = format === 'gif' ? 'image/gif' : 'image/png';
        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, blob, {
                contentType: mimeType,
                upsert: false
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Gagal mengunggah foto ke storage: ${uploadError.message}`);
        }

        // 2. Simpan record metadata ke tabel sessions
        const { error: dbError } = await supabase.from('sessions').insert({
            id: sessionId,
            download_token: downloadToken,
            frame_id: frame?.id || 'unknown',
            frame_name: frame?.name || 'Standard Frame',
            output_type: format,
            result_path: filePath,
            print_status: 'unprinted',
            expires_at: expiresAt
        });

        if (dbError) {
            console.error('Database insert error:', dbError);
            throw new Error(`Gagal menyimpan sesi ke database: ${dbError.message}`);
        }

        return {
            success: true,
            sessionId,
            downloadToken,
            downloadUrl,
            qrDataUrl,
            expiresAt
        };
    } catch (err) {
        console.error('createSessionAndUpload failed:', err);
        return {
            success: false,
            error: err.message
        };
    }
}

/**
 * Ambil data sesi untuk halaman unduh customer berdasarkan download token.
 *
 * @param {string} token
 * @returns {Promise<{
 *   valid: boolean,
 *   session?: object,
 *   fileUrl?: string,
 *   isExpired?: boolean,
 *   error?: string
 * }>}
 */
export async function getSessionByDownloadToken(token) {
    if (!token) {
        return { valid: false, error: 'Token unduh tidak valid atau tidak disertakan.' };
    }

    if (!isConfigured || !supabase) {
        return {
            valid: false,
            error: 'Backend Supabase belum dikonfigurasi. Harap hubungi operator photobooth.'
        };
    }

    try {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('download_token', token)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return { valid: false, error: 'Sesi foto tidak ditemukan atau sudah dihapus.' };
        }

        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        if (now > expiresAt) {
            return { valid: false, isExpired: true, error: 'Masa berlaku unduhan foto telah berakhir (24 jam).' };
        }

        // Buat Signed URL berumur 30 menit (1800 detik)
        const { data: signedData, error: signError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(data.result_path, 1800);

        if (signError || !signedData?.signedUrl) {
            throw new Error('Gagal membuat tautan unduhan aman.');
        }

        return {
            valid: true,
            session: data,
            fileUrl: signedData.signedUrl
        };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

/**
 * Ambil daftar sesi terbaru untuk Dashboard Admin.
 */
export async function getAdminSessions() {
    if (!isConfigured || !supabase) {
        return { data: [], error: 'Supabase belum dikonfigurasi' };
    }

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    return { data, error };
}

/**
 * Dapatkan signed URL gambar untuk preview di Admin Dashboard.
 */
export async function getAdminSignedUrl(resultPath) {
    if (!isConfigured || !supabase) return null;
    const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(resultPath, 3600);
    return data?.signedUrl || null;
}

/**
 * Update status cetak sesi (printed / unprinted).
 */
export async function updatePrintStatus(sessionId, status) {
    if (!isConfigured || !supabase) return { error: 'Not configured' };

    const updatePayload = {
        print_status: status,
        printed_at: status === 'printed' ? new Date().toISOString() : null
    };

    return await supabase
        .from('sessions')
        .update(updatePayload)
        .eq('id', sessionId);
}

/**
 * Hapus sesi manual atau cleanup.
 */
export async function deleteSession(session) {
    if (!isConfigured || !supabase) return { error: 'Not configured' };

    // Hapus file di storage
    if (session.result_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([session.result_path]);
    }

    // Hapus baris database
    return await supabase.from('sessions').delete().eq('id', session.id);
}

/**
 * Jalankan RPC cleanup untuk sesi yang sudah expired.
 */
export async function runExpiredCleanup() {
    if (!isConfigured || !supabase) return { count: 0 };
    try {
        const { data, error } = await supabase.rpc('cleanup_expired_sessions');
        if (error) throw error;
        return { count: data?.[0]?.deleted_sessions || 0 };
    } catch (e) {
        console.error('Cleanup RPC error:', e);
        return { count: 0, error: e.message };
    }
}
