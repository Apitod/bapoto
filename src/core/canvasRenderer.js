/**
 * Primitif rendering Canvas yang dipakai bersama oleh Photo Strip dan GIF.
 * Logika identik dengan index.html lama.
 */
import { loadImageCached } from './imageLoader.js';

/**
 * Gambar foto dengan perilaku "object-fit: cover" (center crop, tanpa distorsi).
 */
export function drawImageCover(ctx, img, x, y, w, h) {
    // 1. Skala agar gambar menutupi seluruh slot
    const scale = Math.max(w / img.width, h / img.height);
    // 2. Ukuran gambar setelah diskala
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    // 3. Posisi agar gambar berada di tengah (Center Crop)
    const dx = x + (w - scaledWidth) / 2;
    const dy = y + (h - scaledHeight) / 2;

    // 4. Masking & render
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, scaledWidth, scaledHeight);
    ctx.restore();
}

/**
 * Konversi slot persentase ke pixel, lalu perluas sebesar `gap` ke segala arah.
 */
export function slotToPixels(slot, canvasW, canvasH, gap = 0) {
    return {
        x: (slot.x / 100) * canvasW - gap,
        y: (slot.y / 100) * canvasH - gap,
        w: (slot.w / 100) * canvasW + gap * 2,
        h: (slot.h / 100) * canvasH + gap * 2
    };
}

/**
 * Gambar satu foto ke dalam slot dengan filter + clipping (rect / ellipse).
 */
export function drawPhotoInSlot(ctx, img, slot, rect, filterCss) {
    const { x, y, w, h } = rect;
    ctx.save();

    if (filterCss && filterCss !== 'none') {
        ctx.filter = filterCss;
    }

    if (slot.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
        ctx.clip();
    } else if (slot.shape === 'rect') {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
    }

    drawImageCover(ctx, img, x, y, w, h);
    ctx.restore(); // reset clipping & filter untuk layer selanjutnya
}

/**
 * Render Photo Strip final ke canvas pada resolusi asli frame.
 * Layer 1: foto pengguna di slot. Layer 2: overlay PNG frame.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} frame         entri dari frameDatabase
 * @param {string[]} photos      data URL hasil jepretan
 * @param {string} filterCss
 */
export async function renderPhotoStrip(canvas, frame, photos, filterCss) {
    const ctx = canvas.getContext('2d');
    canvas.width = frame.aspectRatio.width;
    canvas.height = frame.aspectRatio.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gap = frame.gap || 0;

    // LAYER 1: foto pengguna
    for (let i = 0; i < frame.slots.length; i++) {
        const slot = frame.slots[i];
        const photoSrc = photos[i];
        if (!photoSrc) continue;

        const photoImg = await loadImageCached(photoSrc);
        const rect = slotToPixels(slot, canvas.width, canvas.height, gap);
        drawPhotoInSlot(ctx, photoImg, slot, rect, filterCss);
    }

    // LAYER 2: overlay frame di atas foto
    try {
        const frameOverlayImg = await loadImageCached(frame.previewUrl);
        ctx.drawImage(frameOverlayImg, 0, 0, canvas.width, canvas.height);
    } catch (err) {
        console.error('Gagal menggambar overlay frame:', err);
    }
}
