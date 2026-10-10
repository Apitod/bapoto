/**
 * Step 5: render hasil (Photo Strip / GIF), download lokal,
 * dan Step 6: upload sesi ke Supabase & tampilan QR Code unduh.
 */
import { state } from './state.js';
import { getFilterCss } from '../config/filters.js';
import { renderPhotoStrip } from '../core/canvasRenderer.js';
import { composeGif, RenderCancelled } from '../core/gifRenderer.js';
import { alertToast } from '../ui/toast.js';
import { triggerDownload, resultFilename } from '../utils/download.js';
import { createSessionAndUpload } from '../services/sessionService.js';
import { printPhoto } from '../utils/print.js';

export function createResultController({ onSessionReady, onSessionReset }) {
    const el = {
        canvas: document.getElementById('final-canvas'),
        gifImage: document.getElementById('final-gif'),
        loader: document.getElementById('rendering-loader'),
        photoButton: document.getElementById('btn-save-photo'),
        gifButton: document.getElementById('btn-save-gif'),
        printButton: document.getElementById('btn-print-photo'),
        qrPrintButton: document.getElementById('btn-qr-print'),
        qrButton: document.getElementById('btn-create-qr'),
        qrCodeImg: document.getElementById('qr-code-img'),
        qrDownloadLink: document.getElementById('qr-download-link'),
        autoResetTimer: document.getElementById('auto-reset-timer')
    };

    let autoResetInterval = null;

    async function renderPhoto() {
        const token = state.renderToken;
        el.loader.classList.remove('hidden');
        el.canvas.style.opacity = '0';

        try {
            await renderPhotoStrip(
                el.canvas,
                state.selectedFrame,
                state.capturedPhotos,
                getFilterCss(state.selectedFilter)
            );
            el.loader.classList.add('hidden');
            el.canvas.style.opacity = '1';
        } catch (err) {
            console.error('Rendering error', err);
            if (token === state.renderToken) alertToast('Gagal memproses gambar final.');
            el.loader.classList.add('hidden');
        }
    }

    async function renderGif() {
        const token = ++state.renderToken;
        el.loader.classList.remove('hidden');
        el.gifImage.style.opacity = '0';
        state.gifUrl = null;

        try {
            const gifUrl = await composeGif(
                state.selectedFrame,
                state.gifFrames,
                getFilterCss(state.selectedFilter),
                () => token !== state.renderToken
            );
            state.gifUrl = gifUrl;
            el.gifImage.src = gifUrl;
            el.gifImage.style.opacity = '1';
            el.loader.classList.add('hidden');
        } catch (error) {
            if (error instanceof RenderCancelled) return; // render baru sudah berjalan
            console.error('GIF error:', error);
            el.loader.classList.add('hidden');
            alertToast(`Gagal membuat GIF: ${error.message}`);
        }
    }

    function renderResult() {
        const isGif = state.selectedFormat === 'gif';

        el.canvas.classList.toggle('hidden', isGif);
        el.gifImage.classList.toggle('hidden', !isGif);
        el.photoButton.classList.toggle('hidden', isGif);
        el.gifButton.classList.toggle('hidden', !isGif);
        if (el.printButton) el.printButton.classList.toggle('hidden', isGif);
        if (el.qrPrintButton) el.qrPrintButton.classList.toggle('hidden', isGif);

        clearTimeout(state.renderTimer);

        if (isGif) {
            // Debounce 300ms agar ganti filter cepat tidak membebani memori CPU
            state.renderTimer = setTimeout(renderGif, 300);
            return;
        }

        state.renderToken++;
        renderPhoto();
    }

    async function getFinalResultBlob() {
        const isGif = state.selectedFormat === 'gif';
        if (isGif) {
            if (!state.gifUrl) throw new Error('Hasil GIF belum siap.');
            const res = await fetch(state.gifUrl);
            return await res.blob();
        }

        return await new Promise((resolve, reject) => {
            try {
                el.canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Gagal menghasilkan file gambar canvas.'));
                }, 'image/png');
            } catch (err) {
                if (err.name === 'SecurityError' || err.message?.toLowerCase().includes('insecure')) {
                    reject(new Error('Canvas dibatasi oleh kebijakan keamanan browser (The operation is insecure). Harap refresh atau gunakan frame lokal.'));
                } else {
                    reject(err);
                }
            }
        });
    }

    async function downloadPhoto() {
        let dataUrl;
        try {
            dataUrl = el.canvas.toDataURL('image/png');
        } catch (err) {
            console.error('downloadPhoto canvas error:', err);
            alertToast('Gagal mengekspor foto: Pembatasan keamanan browser.');
            return;
        }

        triggerDownload(dataUrl, resultFilename('png'));
        alertToast('Foto strip frame disimpan! 📸✨');

        // Bila ada foto pose satuan, unduh juga foto satuan tanpa frame
        if (state.capturedPhotos && state.capturedPhotos.length > 0) {
            try {
                const filterCss = getFilterCss(state.selectedFilter);
                const singleBlobs = await createSinglePhotoBlobs(state.capturedPhotos, filterCss);
                for (let i = 0; i < singleBlobs.length; i++) {
                    await new Promise(r => setTimeout(r, 300));
                    const sUrl = URL.createObjectURL(singleBlobs[i]);
                    triggerDownload(sUrl, `bapotojo_pose_${i + 1}_${Date.now()}.jpg`);
                    setTimeout(() => URL.revokeObjectURL(sUrl), 2000);
                }
                alertToast(`Total ${singleBlobs.length + 1} foto (1 frame + ${singleBlobs.length} satuan) berhasil disimpan! 🎉`);
            } catch (err) {
                console.warn('Gagal mengunduh sebagian foto satuan lokal:', err);
            }
        }
    }

    async function downloadGif() {
        if (!state.gifUrl) { alertToast('GIF belum siap.'); return; }
        try {
            const blob = await (await fetch(state.gifUrl)).blob();
            const url = URL.createObjectURL(blob);
            triggerDownload(url, resultFilename('gif'));
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            alertToast('GIF berhasil disimpan! 🎞️✨');
        } catch (e) {
            alertToast('Gagal mengunduh GIF.');
        }
    }

    function downloadCurrentResult() {
        if (state.selectedFormat === 'gif') {
            downloadGif();
        } else {
            downloadPhoto();
        }
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function stopAutoResetTimer() {
        if (autoResetInterval) {
            clearInterval(autoResetInterval);
            autoResetInterval = null;
        }
    }

    function startAutoResetTimer(durationSeconds = 300) {
        stopAutoResetTimer();
        let remaining = durationSeconds;
        if (el.autoResetTimer) el.autoResetTimer.innerText = formatTime(remaining);

        autoResetInterval = setInterval(() => {
            remaining--;
            if (el.autoResetTimer) el.autoResetTimer.innerText = formatTime(remaining);

            if (remaining <= 0) {
                stopAutoResetTimer();
                if (onSessionReset) onSessionReset();
            }
        }, 1000);
    }

/**
 * Mengubah data URL foto jepretan mentah menjadi Blob JPEG dengan filter aktif yang dipilih.
 */
async function createSinglePhotoBlobs(photos, filterCss) {
    if (!photos || photos.length === 0) return [];
    const blobs = [];
    for (let i = 0; i < photos.length; i++) {
        try {
            const img = new Image();
            if (photos[i] && !photos[i].startsWith('data:')) {
                img.crossOrigin = 'anonymous';
            }
            img.src = photos[i];
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');

            if (filterCss && filterCss !== 'none') {
                ctx.filter = filterCss;
            }
            ctx.drawImage(img, 0, 0);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
            if (blob) blobs.push(blob);
        } catch (err) {
            console.error(`Gagal memproses single photo pose #${i + 1}:`, err);
        }
    }
    return blobs;
}

    async function handleCreateQr() {
        if (el.qrButton.disabled) return;

        const originalText = el.qrButton.innerHTML;
        el.qrButton.disabled = true;
        el.qrButton.innerHTML = `
            <svg class="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>Menyimpan Sesi...</span>
        `;

        try {
            const blob = await getFinalResultBlob();

            // Siapkan foto-foto satuan tanpa frame bila format photo strip
            let singleBlobs = [];
            if (state.selectedFormat === 'photo' && state.capturedPhotos.length > 0) {
                singleBlobs = await createSinglePhotoBlobs(
                    state.capturedPhotos,
                    getFilterCss(state.selectedFilter)
                );
            }

            const res = await createSessionAndUpload({
                blob,
                format: state.selectedFormat,
                frame: state.selectedFrame,
                singleBlobs
            });

            if (!res.success) {
                throw new Error(res.error || 'Gagal mengunggah sesi foto.');
            }

            // Tampilkan QR Code & URL di Step 6
            if (el.qrCodeImg) el.qrCodeImg.src = res.qrDataUrl;
            if (el.qrDownloadLink) {
                el.qrDownloadLink.href = res.downloadUrl;
                el.qrDownloadLink.innerText = res.downloadUrl;
            }

            if (res.isOfflineFallback) {
                alertToast('Mode lokal: QR dibuat dengan URL unduh lokal.');
            } else {
                alertToast('Sesi foto berhasil disimpan ke cloud! ☁️✨');
            }

            startAutoResetTimer(300);
            if (onSessionReady) onSessionReady();

        } catch (err) {
            console.error('handleCreateQr error:', err);
            alertToast(`Gagal: ${err.message}`);
        } finally {
            el.qrButton.disabled = false;
            el.qrButton.innerHTML = originalText;
        }
    }

    async function printCurrentResult() {
        if (state.selectedFormat === 'gif') {
            alertToast('Format GIF animasi tidak dapat dicetak ke printer fisik.');
            return;
        }

        try {
            const dataUrl = el.canvas.toDataURL('image/png');
            if (!dataUrl) {
                alertToast('Hasil foto belum siap dicetak.');
                return;
            }
            alertToast('Menyiapkan gambar untuk dicetak ke printer... 🖨️');
            await printPhoto(dataUrl, {
                title: `BAPOTO.JO — ${state.selectedFrame?.name || 'Photo Strip'}`
            });
        } catch (err) {
            console.error('Print current result error:', err);
            alertToast(`Gagal mencetak: ${err.message}`);
        }
    }

    return {
        renderResult,
        downloadPhoto,
        downloadGif,
        downloadCurrentResult,
        printCurrentResult,
        handleCreateQr,
        stopAutoResetTimer
    };
}
