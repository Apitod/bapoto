/** Async image loader (mencegah canvas blank) + cache sederhana per-src. */

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error('URL gambar tidak valid atau kosong.'));
            return;
        }

        // Jika data URL, muat langsung tanpa crossOrigin
        if (typeof src === 'string' && src.startsWith('data:')) {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Gagal memuat gambar data URL.`));
            img.src = src;
            return;
        }

        const img = new Image();
        // Selalu set crossOrigin anonymous agar canvas tidak menjadi tainted
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);
        img.onerror = async () => {
            // Fallback khusus bila Safari mengalami cache issue pada URL cross-origin:
            // Fetch langsung dengan mode CORS, ubah ke Object URL same-origin
            if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
                try {
                    const res = await fetch(src, { mode: 'cors' });
                    if (res.ok) {
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const retryImg = new Image();
                        retryImg.onload = () => {
                            resolve(retryImg);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                        };
                        retryImg.onerror = () => reject(new Error(`Gagal memuat file gambar: ${src}`));
                        retryImg.src = blobUrl;
                        return;
                    }
                } catch (fetchErr) {
                    console.warn(`[ImageLoader] Fallback fetch gagal untuk ${src}:`, fetchErr);
                }
            }
            reject(new Error(`File tidak ditemukan atau akses CORS ditolak: ${src}`));
        };

        img.src = src;
    });
}

const imageCache = new Map();

export function loadImageCached(src) {
    if (!imageCache.has(src)) {
        imageCache.set(src, loadImage(src));
    }
    return imageCache.get(src);
}

