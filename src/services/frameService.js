/**
 * Layanan Pengelolaan Frame Dinamis (Supabase + Fallback Lokal).
 * 
 * Memungkinkan:
 * - Pengambilan frame aktif dari Supabase Database (tabel 'frames')
 * - Fallback mulus ke 8 frame lokal (src/config/frames.js) jika offline/belum dikonfigurasi
 * - Upload frame baru ke storage bucket 'frames' oleh Admin
 * - Edit, toggle aktif/nonaktif, dan hapus frame dari dashboard admin
 */
import { supabase, isConfigured } from './supabase.js';
import { frameDatabase as localFrames } from '../config/frames.js';

const FRAMES_BUCKET = 'frames';

/**
 * Ambil daftar frame aktif untuk Photobooth Kiosk.
 * Selalu mengembalikan array frame yang valid (dari cloud atau fallback lokal).
 */
export async function getActiveFrames() {
    if (!isConfigured || !supabase) {
        return localFrames;
    }

    try {
        const { data, error } = await supabase
            .from('frames')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) {
            console.warn('Gagal memuat frame dari database, menggunakan frame lokal:', error);
            return localFrames;
        }

        // Map field database snake_case ke camelCase yang diharapkan canvas renderer
        return data.map(normalizeFrame);
    } catch (err) {
        console.error('getActiveFrames error, fallback to local:', err);
        return localFrames;
    }
}

/**
 * Ambil semua frame (aktif & non-aktif) untuk Dashboard Admin.
 */
export async function getAllFramesForAdmin() {
    if (!isConfigured || !supabase) {
        return { data: localFrames, isLocal: true };
    }

    try {
        const { data, error } = await supabase
            .from('frames')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
            return { data: localFrames, isLocal: true };
        }

        return { data: data.map(normalizeFrame), isLocal: false };
    } catch (err) {
        console.error('getAllFramesForAdmin error:', err);
        return { data: localFrames, isLocal: true, error: err.message };
    }
}

/**
 * Upload dan tambahkan frame baru ke Supabase oleh Admin.
 */
export async function createNewFrame({
    id,
    name,
    imageFile,
    aspectRatio,
    poseCount,
    gap = 0,
    slots,
    isActive = true
}) {
    if (!isConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi.');
    }

    const frameId = id || `frame-${Date.now()}`;
    const fileExt = imageFile.name.split('.').pop() || 'png';
    const storagePath = `${frameId}.${fileExt}`;

    // 1. Upload gambar overlay ke storage bucket 'frames'
    const { error: uploadError } = await supabase.storage
        .from(FRAMES_BUCKET)
        .upload(storagePath, imageFile, {
            contentType: imageFile.type || 'image/png',
            upsert: true
        });

    if (uploadError) {
        throw new Error(`Gagal mengunggah gambar frame: ${uploadError.message}`);
    }

    // 2. Dapatkan public URL gambar frame
    const { data: { publicUrl } } = supabase.storage
        .from(FRAMES_BUCKET)
        .getPublicUrl(storagePath);

    // 3. Simpan metadata ke tabel frames
    const newRecord = {
        id: frameId,
        name,
        preview_url: publicUrl,
        aspect_ratio: aspectRatio,
        pose_count: Number(poseCount),
        gap: Number(gap),
        slots: slots,
        is_active: isActive
    };

    const { error: dbError } = await supabase.from('frames').insert(newRecord);
    if (dbError) {
        throw new Error(`Gagal menyimpan data frame ke database: ${dbError.message}`);
    }

    return normalizeFrame(newRecord);
}

/**
 * Toggle status aktif/non-aktif frame.
 */
export async function toggleFrameActive(frameId, currentStatus) {
    if (!isConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi.');
    }

    const nextStatus = !currentStatus;
    const { error } = await supabase
        .from('frames')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', frameId);

    if (error) throw error;
    return nextStatus;
}

/**
 * Hapus frame dari database dan storage.
 */
export async function deleteFrameById(frameId) {
    if (!isConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi.');
    }

    // Hapus dari storage (coba png dan jpeg)
    await supabase.storage.from(FRAMES_BUCKET).remove([`${frameId}.png`, `${frameId}.jpeg`, `${frameId}.jpg`]);

    // Hapus dari database
    const { error } = await supabase
        .from('frames')
        .delete()
        .eq('id', frameId);

    if (error) throw error;
    return true;
}

/**
 * Helper: normalisasi field database snake_case ke format objek runtime
 */
function normalizeFrame(item) {
    return {
        id: item.id,
        name: item.name,
        previewUrl: item.preview_url || item.previewUrl,
        aspectRatio: item.aspect_ratio || item.aspectRatio || { width: 1204, height: 1795 },
        poseCount: item.pose_count ?? item.poseCount ?? 4,
        gap: item.gap ?? 0,
        slots: item.slots || [],
        isActive: item.is_active ?? item.isActive ?? true
    };
}
