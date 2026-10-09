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
    tabBtnFrame: document.getElementById('tab-btn-frame'),
    tabBtnSingles: document.getElementById('tab-btn-singles'),
    tabSinglesCount: document.getElementById('tab-singles-count'),
    currentPreviewBadge: document.getElementById('current-preview-badge'),
    currentPreviewLabel: document.getElementById('current-preview-label'),
    btnDownloadActive: document.getElementById('btn-download-active'),
    thumbnailStrip: document.getElementById('thumbnail-strip'),
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

        // Set Info Dasar
        el.format.innerText = isGif ? 'ANIMATED GIF' : 'PHOTO STRIP';
        el.frame.innerText = session.frame_name || session.frame_id || 'STANDAR';

        // State Pratinjau Aktif
        let currentActiveItem = {
            url: mainFileUrl,
            filename: mainFilename,
            label: isGif ? 'ANIMATED GIF HASIL AKHIR' : 'PHOTO STRIP (DENGAN FRAME)',
            badge: 'FRAME'
        };

        function setActivePreview(item) {
            currentActiveItem = item;
            el.preview.style.opacity = '0';
            setTimeout(() => {
                el.preview.src = item.url;
                el.currentPreviewLabel.innerText = item.label;
                el.currentPreviewBadge.innerText = item.badge;
                el.currentPreviewBadge.className = item.badge === 'FRAME'
                    ? 'bg-brutalPink text-white text-[10px] font-black px-1.5 py-0.5 border border-brutal uppercase'
                    : 'bg-brutalGreen text-brutalDark text-[10px] font-black px-1.5 py-0.5 border border-brutal uppercase';
                el.preview.style.opacity = '1';
            }, 120);

            // Highlight thumbnail aktif
            document.querySelectorAll('.preview-thumb-btn').forEach(btn => {
                const isActive = btn.dataset.url === item.url;
                btn.className = isActive
                    ? 'preview-thumb-btn flex-shrink-0 w-16 h-20 border-4 border-brutalPink shadow-neo p-0.5 bg-white scale-105 transition-transform'
                    : 'preview-thumb-btn flex-shrink-0 w-16 h-20 border-2 border-brutal shadow-sm p-0.5 bg-gray-100 opacity-80 hover:opacity-100 transition-all';
            });
        }

        // Tampilkan awal foto utama
        setActivePreview(currentActiveItem);

        // Download tombol aktif (foto yang sedang dilihat di preview)
        el.btnDownloadActive.addEventListener('click', async () => {
            alertToast(`Mengunduh ${currentActiveItem.label}... ⏳`);
            await downloadFileFromUrl(currentActiveItem.url, currentActiveItem.filename);
            alertToast(`${currentActiveItem.label} berhasil disimpan! 📸✨`);
        });

        // Download tombol foto utama (dengan frame)
        el.btnDownload.addEventListener('click', async (e) => {
            e.preventDefault();
            alertToast('Memulai unduh foto strip frame... ⏳');
            await downloadFileFromUrl(mainFileUrl, mainFilename);
            alertToast('Foto strip frame berhasil diunduh! 📸✨');
        });

        // Setup Thumbnail Strip
        el.thumbnailStrip.innerHTML = '';

        // 1. Thumbnail untuk Foto Strip / GIF Utama
        const frameThumb = document.createElement('button');
        frameThumb.type = 'button';
        frameThumb.dataset.url = mainFileUrl;
        frameThumb.className = 'preview-thumb-btn flex-shrink-0 w-16 h-20 border-4 border-brutalPink shadow-neo p-0.5 bg-white';
        frameThumb.innerHTML = `
            <img src="${mainFileUrl}" alt="Frame" class="w-full h-full object-contain">
        `;
        frameThumb.addEventListener('click', () => {
            setActivePreview({
                url: mainFileUrl,
                filename: mainFilename,
                label: isGif ? 'ANIMATED GIF HASIL AKHIR' : 'PHOTO STRIP (DENGAN FRAME)',
                badge: 'FRAME'
            });
        });
        el.thumbnailStrip.appendChild(frameThumb);

        // 2. Thumbnail dan Galeri untuk Seluruh Foto Satuan
        if (singlePhotos.length > 0) {
            const totalFiles = singlePhotos.length + 1; // 1 frame + N single
            el.tabSinglesCount.innerText = singlePhotos.length;
            el.btnDownloadAll.classList.remove('hidden');
            el.btnDownloadAllLabel.innerText = `⚡ UNDUH SEMUA (${totalFiles} FOTO)`;

            el.singlePhotosSection.classList.remove('hidden');
            el.singlePhotosCount.innerText = `${singlePhotos.length} FOTO SATUAN`;
            el.singlePhotosGrid.innerHTML = '';

            singlePhotos.forEach(item => {
                const singleFilename = `bapotojo_pose_${item.index}_${session.id.slice(0, 8)}.jpg`;
                const singleItem = {
                    url: item.url,
                    filename: singleFilename,
                    label: `FOTO POSE #${item.index} (TANPA FRAME)`,
                    badge: `POSE #${item.index}`
                };

                // Masukkan ke thumbnail strip atas
                const sThumb = document.createElement('button');
                sThumb.type = 'button';
                sThumb.dataset.url = item.url;
                sThumb.className = 'preview-thumb-btn flex-shrink-0 w-16 h-20 border-2 border-brutal shadow-sm p-0.5 bg-gray-100 opacity-80 hover:opacity-100 transition-all';
                sThumb.innerHTML = `
                    <img src="${item.url}" alt="Pose #${item.index}" class="w-full h-full object-cover">
                `;
                sThumb.addEventListener('click', () => {
                    setActivePreview(singleItem);
                });
                el.thumbnailStrip.appendChild(sThumb);

                // Masukkan ke galeri grid bawah
                const card = document.createElement('div');
                card.className = 'border-2 border-brutal bg-white p-2.5 flex flex-col justify-between shadow-neo-hover';

                card.innerHTML = `
                    <div>
                        <div class="aspect-[4/3] bg-gray-100 border border-brutal overflow-hidden mb-2 relative group cursor-pointer">
                            <img src="${item.url}" alt="Pose #${item.index}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                            <span class="absolute top-1 left-1 bg-brutalDark text-white px-1.5 py-0.5 text-[10px] font-black">
                                POSE #${item.index}
                            </span>
                            <span class="absolute bottom-1 right-1 bg-white/90 text-brutalDark border border-brutal px-1 py-0.2 text-[9px] font-black">
                                🔍 PREVIEW
                            </span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <button type="button" class="btn-preview-single btn-brutal bg-white hover:bg-gray-100 py-1.5 px-1 text-[11px] font-black w-full flex items-center justify-center gap-1">
                            <span>LIHAT PRATINJAU</span>
                        </button>
                        <button type="button" class="btn-single-download btn-brutal bg-brutalYellow hover:bg-yellow-400 py-1.5 px-1 text-xs font-black w-full flex items-center justify-center gap-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span>UNDUH POSE #${item.index}</span>
                        </button>
                    </div>
                `;

                // Klik gambar atau tombol preview -> ubah preview utama
                const previewImgBox = card.querySelector('.cursor-pointer');
                const btnPreview = card.querySelector('.btn-preview-single');
                const onPreviewClick = () => {
                    setActivePreview(singleItem);
                    el.preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    alertToast(`Menampilkan Pratinjau Pose #${item.index} 📸`);
                };
                previewImgBox.addEventListener('click', onPreviewClick);
                btnPreview.addEventListener('click', onPreviewClick);

                // Klik download pose
                const btnDownload = card.querySelector('.btn-single-download');
                btnDownload.addEventListener('click', async () => {
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

            // Tab Buttons
            el.tabBtnFrame.addEventListener('click', () => {
                el.tabBtnFrame.classList.remove('bg-white', 'text-brutalDark');
                el.tabBtnFrame.classList.add('bg-brutalDark', 'text-white');
                el.tabBtnSingles.classList.remove('bg-brutalDark', 'text-white');
                el.tabBtnSingles.classList.add('bg-white', 'text-brutalDark');
                setActivePreview({
                    url: mainFileUrl,
                    filename: mainFilename,
                    label: isGif ? 'ANIMATED GIF HASIL AKHIR' : 'PHOTO STRIP (DENGAN FRAME)',
                    badge: 'FRAME'
                });
            });

            el.tabBtnSingles.addEventListener('click', () => {
                el.tabBtnSingles.classList.remove('bg-white', 'text-brutalDark');
                el.tabBtnSingles.classList.add('bg-brutalDark', 'text-white');
                el.tabBtnFrame.classList.remove('bg-brutalDark', 'text-white');
                el.tabBtnFrame.classList.add('bg-white', 'text-brutalDark');

                // Tampilkan single photo pertama di preview
                if (singlePhotos.length > 0) {
                    setActivePreview({
                        url: singlePhotos[0].url,
                        filename: `bapotojo_pose_1_${session.id.slice(0, 8)}.jpg`,
                        label: 'FOTO POSE #1 (TANPA FRAME)',
                        badge: 'POSE #1'
                    });
                }
                el.singlePhotosSection.scrollIntoView({ behavior: 'smooth' });
            });
        } else {
            // Bila sesi hanya memiliki foto utama (tidak ada single photos)
            el.tabSinglesCount.innerText = '0';
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
