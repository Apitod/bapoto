/**
 * Step 5: render hasil (Photo Strip / GIF) dan download.
 * Perilaku identik dengan renderResult / downloadPhoto / downloadGif lama.
 */
import { state } from './state.js';
import { getFilterCss } from '../config/filters.js';
import { renderPhotoStrip } from '../core/canvasRenderer.js';
import { composeGif, RenderCancelled } from '../core/gifRenderer.js';
import { alertToast } from '../ui/toast.js';
import { triggerDownload, resultFilename } from '../utils/download.js';

export function createResultController() {
    const el = {
        canvas: document.getElementById('final-canvas'),
        gifImage: document.getElementById('final-gif'),
        loader: document.getElementById('rendering-loader'),
        photoButton: document.getElementById('btn-save-photo'),
        gifButton: document.getElementById('btn-save-gif')
    };

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
            // Debounce agar ganti filter cepat tidak memicu banyak encode GIF
            state.renderTimer = setTimeout(renderGif, 150);
            return;
        }

        state.renderToken++;
        renderPhoto();
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

    return { renderResult, downloadPhoto, downloadGif };
}
