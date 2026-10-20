/** Async image loader (mencegah canvas blank) + cache sederhana per-src. */

function loadElement(src, useCrossOrigin) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (useCrossOrigin) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
        img.src = src;
    });
}

async function loadViaBlob(src) {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
        return await loadElement(blobUrl, false);
    } finally {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }
}

async function loadCrossOrigin(src) {
    // Jalur utama: ambil via fetch CORS lalu render dari blob URL same-origin.
    // Ini menjamin canvas tidak pernah ter-taint, termasuk pada Safari/WebKit.
    try {
        return await loadViaBlob(src);
    } catch (blobErr) {
        console.warn(`[ImageLoader] Fetch blob gagal untuk ${src}, mencoba langsung dengan CORS:`, blobErr);
    }
    try {
        return await loadElement(src, true);
    } catch (_) {
        throw new Error(`File tidak ditemukan atau akses CORS ditolak: ${src}`);
    }
}

export function loadImage(src) {
    if (!src) return Promise.reject(new Error('URL gambar tidak valid atau kosong.'));

    if (typeof src === 'string' && src.startsWith('data:')) {
        return loadElement(src, false);
    }

    if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
        return loadCrossOrigin(src);
    }

    return loadElement(src, false);
}

const imageCache = new Map();

export function loadImageCached(src) {
    if (!imageCache.has(src)) {
        imageCache.set(src, loadImage(src));
    }
    return imageCache.get(src);
}
