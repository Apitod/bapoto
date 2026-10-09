/** Async image loader (mencegah canvas blank) + cache sederhana per-src. */

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`File tidak ditemukan: ${src}`));
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
