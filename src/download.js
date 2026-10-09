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
    btnDownloadAll: document.getElementById('btn-download-all'),
    btnDownloadAllLabel: document.getElementById('btn-download-all-label'),
    btnShare: document.getElementById('btn-share'),
    singlePhotosSection: document.getElementById('single-photos-section'),
    singlePhotosCount: document.getElementById('single-photos-count'),
    singlePhotosGrid: document.getElementById('single-photos-grid')
};

async function downloadFileFromUrl(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return true;
    } catch (err) {
        console.warn('Fallback link navigation for download:', err);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return false;
    }
}

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
        const mainFileUrl = res.fileUrl;
        const singlePhotos = res.singlePhotos || [];
        const isGif = session.output_type === 'gif';
        const mainFilename = `bapotojo_${session.output_type}_${session.id.slice(0, 8)}.${isGif ? 'gif' : 'png'}`;

        // Set Data Utama
        el.format.innerText = isGif ? 'ANIMATED GIF' : 'PHOTO STRIP';
        el.frame.innerText = session.frame_name || session.frame_id || 'STANDAR';
        el.preview.src = mainFileUrl;

        // Download tombol foto utama (dengan frame)
        el.btnDownload.addEventListener('click', async (e) => {
            e.preventDefault();
            alertToast('Memulai unduh foto utama... ⏳');
            await downloadFileFromUrl(mainFileUrl, mainFilename);
            alertToast('Foto utama berhasil diunduh! 📸✨');
        });

        // Tangani Foto Satuan Tanpa Frame
        if (singlePhotos.length > 0) {
            const totalFiles = singlePhotos.length + 1; // 1 frame + N single
            el.btnDownloadAll.classList.remove('hidden');
            el.btnDownloadAllLabel.innerText = `⚡ UNDUH SEMUA (${totalFiles} FOTO)`;

            el.singlePhotosSection.classList.remove('hidden');
            el.singlePhotosCount.innerText = `${singlePhotos.length} FOTO SATUAN`;
            el.singlePhotosGrid.innerHTML = '';

            singlePhotos.forEach(item => {
                const card = document.createElement('div');
                card.className = 'border-2 border-brutal bg-white p-2.5 flex flex-col justify-between shadow-neo-hover';
                const singleFilename = `bapotojo_pose_${item.index}_${session.id.slice(0, 8)}.jpg`;

                card.innerHTML = `
                    <div>
                        <div class="aspect-[4/3] bg-gray-100 border border-brutal overflow-hidden mb-2 relative">
                            <img src="${item.url}" alt="Pose #${item.index}" class="w-full h-full object-cover">
                            <span class="absolute top-1 left-1 bg-brutalDark text-white px-1.5 py-0.5 text-[10px] font-black">
                                POSE #${item.index}
                            </span>
                        </div>
                    </div>
                    <button type="button" class="btn-single-download btn-brutal bg-white hover:bg-brutalYellow py-2 px-1 text-xs font-black w-full flex items-center justify-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span>UNDUH</span>
                    </button>
                `;

                const btn = card.querySelector('.btn-single-download');
                btn.addEventListener('click', async () => {
                    alertToast(`Mengunduh Foto Pose #${item.index}... ⏳`);
                    await downloadFileFromUrl(item.url, singleFilename);
                    alertToast(`Pose #${item.index} berhasil disimpan! 📸✨`);
                });

                el.singlePhotosGrid.appendChild(card);
            });

            // Action "Unduh Semua Sekaligus" (1 Frame + N Satuan)
            el.btnDownloadAll.addEventListener('click', async () => {
                el.btnDownloadAll.disabled = true;
                alertToast(`Mempersiapkan unduhan ${totalFiles} foto...`);

                // 1. Download foto utama
                await downloadFileFromUrl(mainFileUrl, mainFilename);
                await new Promise(r => setTimeout(r, 400));

                // 2. Download foto satuan satu per satu
                for (let i = 0; i < singlePhotos.length; i++) {
                    const item = singlePhotos[i];
                    alertToast(`Mengunduh foto ${i + 2}/${totalFiles}...`);
                    await downloadFileFromUrl(item.url, `bapotojo_pose_${item.index}_${session.id.slice(0, 8)}.jpg`);
                    await new Promise(r => setTimeout(r, 400));
                }

                alertToast(`Semua ${totalFiles} foto berhasil diunduh! 🎉`);
                el.btnDownloadAll.disabled = false;
            });
        }

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
