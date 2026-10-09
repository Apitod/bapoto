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

export function createResultController({ onSessionReady, onSessionReset }) {
    const el = {
        canvas: document.getElementById('final-canvas'),
        gifImage: document.getElementById('final-gif'),
        loader: document.getElementById('rendering-loader'),
        photoButton: document.getElementById('btn-save-photo'),
        gifButton: document.getElementById('btn-save-gif'),
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
            el.canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Gagal menghasilkan file gambar canvas.'));
            }, 'image/png');
        });
    }

    function downloadPhoto() {
        const dataUrl = el.canvas.toDataURL('image/png');
        triggerDownload(dataUrl, resultFilename('png'));
        alertToast('Foto berhasil disimpan! 📸✨');
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

    function stopAutoResetTimer() {
        if (autoResetInterval) {
            clearInterval(autoResetInterval);
            autoResetInterval = null;
        }
    }

    function startAutoResetTimer(durationSeconds = 60) {
        stopAutoResetTimer();
        let remaining = durationSeconds;
        if (el.autoResetTimer) el.autoResetTimer.innerText = remaining;

        autoResetInterval = setInterval(() => {
            remaining--;
            if (el.autoResetTimer) el.autoResetTimer.innerText = remaining;

            if (remaining <= 0) {
                stopAutoResetTimer();
                if (onSessionReset) onSessionReset();
            }
        }, 1000);
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
            const res = await createSessionAndUpload({
                blob,
                format: state.selectedFormat,
                frame: state.selectedFrame
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

            startAutoResetTimer(60);
            if (onSessionReady) onSessionReady();

        } catch (err) {
            console.error('handleCreateQr error:', err);
            alertToast(`Gagal: ${err.message}`);
        } finally {
            el.qrButton.disabled = false;
            el.qrButton.innerHTML = originalText;
        }
    }

    return {
        renderResult,
        downloadPhoto,
        downloadGif,
        downloadCurrentResult,
        handleCreateQr,
        stopAutoResetTimer
    };
}
