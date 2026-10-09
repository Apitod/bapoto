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
export async function createSessionAndUpload({ blob, format, frame, singleBlobs = [] }) {
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
        const offlineSingles = singleBlobs.map((b, idx) => ({
            index: idx + 1,
            url: URL.createObjectURL(b),
            path: `offline/single_${idx + 1}.jpg`
        }));
        const offlineSession = {
            id: sessionId,
            download_token: downloadToken,
            frame_id: frame?.id || 'unknown',
            frame_name: frame?.name || 'Standard Frame',
            output_type: format,
            result_blob_url: URL.createObjectURL(blob),
            single_photos: offlineSingles,
            expires_at: expiresAt
        };
        window[`_bapoto_offline_${downloadToken}`] = offlineSession;
        try {
            sessionStorage.setItem(`bapoto_offline_${downloadToken}`, JSON.stringify({
                ...offlineSession,
                result_blob_url: undefined
            }));
        } catch (_) {}

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
        // 1. Upload file hasil utama (Photo Strip atau GIF)
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

        // 2. Upload file foto satuan (single photos tanpa frame) bila ada
        const singlePhotoPaths = [];
        const tokenPrefix = downloadToken.slice(0, 8);
        for (let i = 0; i < singleBlobs.length; i++) {
            const singleBlob = singleBlobs[i];
            const singlePath = `${sessionId}/single_${i + 1}_${tokenPrefix}.jpg`;
            try {
                const { error: sErr } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(singlePath, singleBlob, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });
                if (!sErr) {
                    singlePhotoPaths.push(singlePath);
                } else {
                    console.warn(`Gagal upload foto satuan #${i + 1}:`, sErr.message);
                }
            } catch (singleUploadErr) {
                console.warn(`Exception upload foto satuan #${i + 1}:`, singleUploadErr);
            }
        }

        // 3. Simpan record metadata ke tabel sessions
        const sessionRecord = {
            id: sessionId,
            download_token: downloadToken,
            frame_id: frame?.id || 'unknown',
            frame_name: frame?.name || 'Standard Frame',
            output_type: format,
            result_path: filePath,
            single_photos: singlePhotoPaths,
            print_status: 'unprinted',
            expires_at: expiresAt
        };

        let { error: dbError } = await supabase.from('sessions').insert(sessionRecord);

        // Fallback bila kolom single_photos belum dibuat di database user
        if (dbError && dbError.message && dbError.message.toLowerCase().includes('single_photos')) {
            console.warn('Kolom single_photos belum tersedia di database, menyimpan sesi tanpa kolom single_photos...');
            delete sessionRecord.single_photos;
            const retry = await supabase.from('sessions').insert(sessionRecord);
            dbError = retry.error;
        }

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
            expiresAt,
            singlePhotoPaths
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
 *   singlePhotos?: Array<{ index: number, url: string, path: string }>,
 *   isExpired?: boolean,
 *   error?: string
 * }>}
 */
export async function getSessionByDownloadToken(token) {
    if (!token) {
        return { valid: false, error: 'Token unduh tidak valid atau tidak disertakan.' };
    }

    if (!isConfigured || !supabase) {
        if (window[`_bapoto_offline_${token}`]) {
            const cached = window[`_bapoto_offline_${token}`];
            return {
                valid: true,
                session: cached,
                fileUrl: cached.result_blob_url,
                singlePhotos: cached.single_photos || []
            };
        }
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

        // 1. Buat Signed URL berumur 30 menit (1800 detik) untuk foto utama
        const { data: signedData, error: signError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(data.result_path, 1800);

        if (signError || !signedData?.signedUrl) {
            throw new Error('Gagal membuat tautan unduhan aman untuk foto utama.');
        }

        // 2. Buat Signed URLs untuk foto satuan tanpa frame bila ada
        const singlePhotos = [];
        let rawPaths = Array.isArray(data.single_photos) ? data.single_photos : [];

        // FALLBACK: Bila kolom single_photos di DB belum tersimpan, cari file langsung di storage bucket sesi (${data.id})
        if (rawPaths.length === 0 && data.id) {
            try {
                const { data: storageList, error: listError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .list(data.id);

                if (!listError && Array.isArray(storageList)) {
                    const foundSingles = storageList
                        .filter(f => f.name && f.name.startsWith('single_'))
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

                    rawPaths = foundSingles.map(f => `${data.id}/${f.name}`);
                }
            } catch (listErr) {
                console.warn('Storage list fallback error for single photos:', listErr);
            }
        }

        if (rawPaths.length > 0) {
            try {
                const { data: batchSigned, error: batchError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .createSignedUrls(rawPaths, 1800);

                if (!batchError && Array.isArray(batchSigned)) {
                    batchSigned.forEach((item, index) => {
                        if (item && item.signedUrl) {
                            singlePhotos.push({
                                index: index + 1,
                                path: item.path,
                                url: item.signedUrl
                            });
                        }
                    });
                }
            } catch (singleErr) {
                console.warn('Gagal membuat signed URL untuk foto satuan:', singleErr);
            }
        }

        return {
            valid: true,
            session: data,
            fileUrl: signedData.signedUrl,
            singlePhotos
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
