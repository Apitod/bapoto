/**
 * Logic Controller untuk Halaman Download Pelanggan (download.html).
 * Mengambil parameter ?token=..., memvalidasi sesi via Supabase,
 * dan menyediakan tombol unduh aman & tombol bagikan (Web Share API).
 */
import './styles/main.css';
import { getSessionByDownloadToken } from './services/sessionService.js';
import { alertToast } from './ui/toast.js';

const el = {
    loading: document.getElementById('loading-state'),
    error: document.getElementById('error-state'),
    errorMsg: document.getElementById('error-message'),
    success: document.getElementById('success-state'),
    preview: document.getElementById('result-preview'),
    format: document.getElementById('session-format'),
    frame: document.getElementById('session-frame'),
    btnDownload: document.getElementById('btn-download'),
    btnShare: document.getElementById('btn-share')
};

async function initDownloadPage() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        showError('Tautan unduh tidak valid. Parameter token tidak ditemukan.');
        return;
    }

    try {
        const res = await getSessionByDownloadToken(token);

        if (!res.valid) {
            showError(res.error || 'Sesi foto tidak ditemukan atau sudah kedaluwarsa.');
            return;
        }

        const session = res.session;
        const fileUrl = res.fileUrl;
        const isGif = session.output_type === 'gif';
        const filename = `bapotojo_${session.output_type}_${session.id.slice(0, 8)}.${isGif ? 'gif' : 'png'}`;

        // Set Data
        el.format.innerText = isGif ? 'ANIMATED GIF' : 'PHOTO STRIP';
        el.frame.innerText = session.frame_name || session.frame_id || 'STANDAR';
        el.preview.src = fileUrl;

        // Download link
        el.btnDownload.href = fileUrl;
        el.btnDownload.download = filename;

        // Custom download handler untuk mobile agar langsung simpan file
        el.btnDownload.addEventListener('click', async (e) => {
            try {
                e.preventDefault();
                alertToast('Memulai pengunduhan foto... ⏳');
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const tempLink = document.createElement('a');
                tempLink.href = blobUrl;
                tempLink.download = filename;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                alertToast('Foto berhasil diunduh! 📸✨');
            } catch (err) {
                // Fallback jika fetch blob terhambat CORS
                window.location.href = fileUrl;
            }
        });

        // Web Share API jika didukung perangkat HP
        if (navigator.share) {
            el.btnShare.classList.remove('hidden');
            el.btnShare.addEventListener('click', async () => {
                try {
                    await navigator.share({
                        title: 'Foto BAPOTO.JO Saya',
                        text: 'Cek hasil photobooth BAPOTO.JO saya! 📸✨',
                        url: window.location.href
                    });
                } catch (e) {
                    console.log('Share canceled or not supported');
                }
            });
        }

        showSuccess();
    } catch (err) {
        console.error('Download init error:', err);
        showError(err.message || 'Terjadi kesalahan saat memuat foto.');
    }
}

function showError(msg) {
    el.loading.classList.add('hidden');
    el.success.classList.add('hidden');
    el.error.classList.remove('hidden');
    if (el.errorMsg) el.errorMsg.innerText = msg;
}

function showSuccess() {
    el.loading.classList.add('hidden');
    el.error.classList.add('hidden');
    el.success.classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', initDownloadPage);
