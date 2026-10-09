/**
 * Komposisi Animated GIF: setiap frame rekaman digambar ke semua slot
 * (dengan offset waktu per slot), lalu overlay frame, lalu di-encode gifshot.
 * Logika identik dengan createPhotoboothGIF di index.html lama.
 */
import gifshot from 'gifshot';
import { loadImageCached } from './imageLoader.js';
import { slotToPixels, drawPhotoInSlot } from './canvasRenderer.js';
import { GIF_OUTPUT_W } from '../config/capture.js';

/** Error khusus untuk render yang dibatalkan (token sudah usang). */
export class RenderCancelled extends Error {
    constructor() {
        super('Render dibatalkan');
        this.name = 'RenderCancelled';
    }
}

function imageFromCanvas(canvas) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Gagal memuat frame hasil GIF'));
        image.src = canvas.toDataURL('image/jpeg', 0.75);
    });
}

/**
 * @param {object} frame          entri frameDatabase
 * @param {string[]} rawFrames    data URL frame rekaman kamera
 * @param {string} filterCss
 * @param {() => boolean} isStale fungsi yang mengembalikan true bila render ini sudah usang
 * @returns {Promise<string>}     data URL GIF (image/gif;base64)
 */
export async function composeGif(frame, rawFrames, filterCss, isStale = () => false) {
    if (!gifshot || typeof gifshot.createGIF !== 'function') {
        throw new Error('Library gifshot belum termuat');
    }
    if (!rawFrames || rawFrames.length < 2) {
        throw new Error('Frame GIF tidak cukup');
    }

    const W = GIF_OUTPUT_W;
    const H = Math.round(W * frame.aspectRatio.height / frame.aspectRatio.width);
    const scale = W / frame.aspectRatio.width;
    const gap = (frame.gap || 0) * scale;

    // Muat overlay frame dan frame rekaman lebih dahulu.
    const loaded = await Promise.all([
        loadImageCached(frame.previewUrl),
        ...rawFrames.map(loadImageCached)
    ]);
    if (isStale()) throw new RenderCancelled();

    const overlay = loaded[0];
    const photos = loaded.slice(1);
    const totalFrames = photos.length;
    const offset = Math.max(1, Math.floor(totalFrames / frame.slots.length));

    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const ctx = off.getContext('2d');

    // gifshot lebih stabil menerima HTMLImageElement yang sudah dimuat.
    const gifImages = [];

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        frame.slots.forEach((slot, slotIndex) => {
            const source = photos[(frameIndex + slotIndex * offset) % totalFrames];
            const rect = slotToPixels(slot, W, H, gap);
            drawPhotoInSlot(ctx, source, slot, rect, filterCss);
        });

        // Frame PNG selalu berada di lapisan paling atas.
        ctx.drawImage(overlay, 0, 0, W, H);

        gifImages.push(await imageFromCanvas(off));

        // Menjaga UI tetap responsif saat menyusun banyak frame.
        if (frameIndex % 2 === 1) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (isStale()) throw new RenderCancelled();
    }

    const gifUrl = await new Promise((resolve, reject) => {
        gifshot.createGIF({
            images: gifImages,
            gifWidth: W,
            gifHeight: H,
            frameDuration: 5,
            numWorkers: 2,
            sampleInterval: 20
        }, result => {
            if (result.error) {
                reject(new Error(result.errorMsg || 'gifshot gagal membuat GIF'));
                return;
            }
            resolve(result.image);
        });
    });

    if (isStale()) throw new RenderCancelled();
    return gifUrl;
}
