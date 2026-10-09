/**
 * Controller untuk Admin Dashboard (admin.html).
 * Menghandle:
 * - Autentikasi Supabase Auth (Login/Logout)
 * - Pemantauan antrean sesi foto secara Real-time & Dialog Print
 * - Pengelolaan Frame Dinamis (Upload frame baru, preset layout slot, aktif/nonaktifkan, hapus)
 * - Pembersihan sesi kedaluwarsa (Retensi 24 jam)
 */
import './styles/main.css';
import { supabase, isConfigured } from './services/supabase.js';
import {
    getAdminSessions,
    getAdminSignedUrl,
    updatePrintStatus,
    deleteSession,
    runExpiredCleanup
} from './services/sessionService.js';
import {
    getAllFramesForAdmin,
    createNewFrame,
    toggleFrameActive,
    deleteFrameById
} from './services/frameService.js';
import { LAYOUT_PRESETS } from './config/layoutPresets.js';
import { alertToast } from './ui/toast.js';
import { escapeHtml } from './utils/html.js';
import { printPhoto } from './utils/print.js';

let currentFilter = 'all';
let allSessions = [];
let allAdminFrames = [];
let activeSubscription = null;
let currentPreviewUrl = '';
let currentPreviewSession = null;

const el = {
    // Auth & Layout
    authSection: document.getElementById('auth-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    unconfiguredAlert: document.getElementById('supabase-unconfigured-alert'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    userEmail: document.getElementById('admin-user-email'),
    btnLogout: document.getElementById('btn-logout'),

    // Top View Switcher
    tabNavSessions: document.getElementById('tab-nav-sessions'),
    tabNavFrames: document.getElementById('tab-nav-frames'),
    viewSessions: document.getElementById('view-sessions'),
    viewFrames: document.getElementById('view-frames'),

    // Sessions Stats & List
    statTotal: document.getElementById('stat-total'),
    statUnprinted: document.getElementById('stat-unprinted'),
    statPrinted: document.getElementById('stat-printed'),
    sessionsLoading: document.getElementById('sessions-loading'),
    sessionsEmpty: document.getElementById('sessions-empty'),
    sessionsGrid: document.getElementById('sessions-grid'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnCleanup: document.getElementById('btn-cleanup'),

    // Frames View & Modal
    framesGrid: document.getElementById('frames-grid'),
    btnOpenAddFrame: document.getElementById('btn-open-add-frame'),
    addFrameModal: document.getElementById('add-frame-modal'),
    btnCloseFrameModal: document.getElementById('btn-close-frame-modal'),
    btnCancelFrame: document.getElementById('btn-cancel-frame'),
    addFrameForm: document.getElementById('add-frame-form'),
    frameName: document.getElementById('frame-name'),
    frameFile: document.getElementById('frame-file'),
    framePreset: document.getElementById('frame-preset'),
    frameIsActive: document.getElementById('frame-is-active'),
    btnSubmitFrame: document.getElementById('btn-submit-frame'),
    framePreviewImg: document.getElementById('frame-preview-img'),
    framePreviewSlots: document.getElementById('frame-preview-slots'),
    framePreviewPlaceholder: document.getElementById('frame-preview-placeholder'),

    // Modal Preview & Print
    previewModal: document.getElementById('preview-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalImage: document.getElementById('modal-image'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnModalPrint: document.getElementById('btn-modal-print'),
    printArea: document.getElementById('print-area'),
    printImage: document.getElementById('print-image')
};

async function initAdmin() {
    initPresetOptions();

    if (!isConfigured || !supabase) {
        if (el.unconfiguredAlert) el.unconfiguredAlert.classList.remove('hidden');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        showDashboard(session.user);
    } else {
        showAuth();
    }

    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            showDashboard(session.user);
        } else {
            showAuth();
        }
    });
}

function showAuth() {
    el.authSection.classList.remove('hidden');
    el.dashboardSection.classList.add('hidden');
    el.btnLogout.classList.add('hidden');
    el.userEmail.innerText = '';
    if (activeSubscription) {
        supabase.removeChannel(activeSubscription);
        activeSubscription = null;
    }
}

function showDashboard(user) {
    el.authSection.classList.add('hidden');
    el.dashboardSection.classList.remove('hidden');
    el.btnLogout.classList.remove('hidden');
    el.userEmail.innerText = user.email || 'Admin';

    switchView('sessions');
    loadSessions();
    loadFrames();
    setupRealtimeSubscription();
}

function switchView(viewName) {
    if (viewName === 'sessions') {
        el.tabNavSessions.classList.remove('bg-white', 'text-brutalDark');
        el.tabNavSessions.classList.add('bg-brutalDark', 'text-white');
        el.tabNavFrames.classList.remove('bg-brutalDark', 'text-white');
        el.tabNavFrames.classList.add('bg-white', 'text-brutalDark');

        el.viewSessions.classList.remove('hidden');
        el.viewFrames.classList.add('hidden');
    } else {
        el.tabNavFrames.classList.remove('bg-white', 'text-brutalDark');
        el.tabNavFrames.classList.add('bg-brutalDark', 'text-white');
        el.tabNavSessions.classList.remove('bg-brutalDark', 'text-white');
        el.tabNavSessions.classList.add('bg-white', 'text-brutalDark');

        el.viewFrames.classList.remove('hidden');
        el.viewSessions.classList.add('hidden');
    }
}

el.tabNavSessions.addEventListener('click', () => switchView('sessions'));
el.tabNavFrames.addEventListener('click', () => switchView('frames'));

// ==========================================
// 1. SESSIONS & PRINT MANAGEMENT
// ==========================================

async function loadSessions() {
    el.sessionsLoading.classList.remove('hidden');
    el.sessionsGrid.classList.add('hidden');
    el.sessionsEmpty.classList.add('hidden');

    try {
        const { data, error } = await getAdminSessions();
        if (error) throw new Error(error.message || error);

        allSessions = data || [];
        updateStats();
        renderSessions();
    } catch (err) {
        console.error('Error loading sessions:', err);
        alertToast(`Gagal memuat sesi: ${err.message}`);
    } finally {
        el.sessionsLoading.classList.add('hidden');
    }
}

function updateStats() {
    const total = allSessions.length;
    const unprinted = allSessions.filter(s => s.print_status === 'unprinted').length;
    const printed = allSessions.filter(s => s.print_status === 'printed').length;

    if (el.statTotal) el.statTotal.innerText = total;
    if (el.statUnprinted) el.statUnprinted.innerText = unprinted;
    if (el.statPrinted) el.statPrinted.innerText = printed;
}

function renderSessions() {
    const filtered = allSessions.filter(s => {
        if (currentFilter === 'unprinted') return s.print_status === 'unprinted';
        if (currentFilter === 'printed') return s.print_status === 'printed';
        return true;
    });

    if (filtered.length === 0) {
        el.sessionsEmpty.classList.remove('hidden');
        el.sessionsGrid.classList.add('hidden');
        return;
    }

    el.sessionsEmpty.classList.add('hidden');
    el.sessionsGrid.classList.remove('hidden');
    el.sessionsGrid.innerHTML = '';

    filtered.forEach(session => {
        const card = document.createElement('div');
        const isPrinted = session.print_status === 'printed';
        const isGif = session.output_type === 'gif';
        const dateStr = new Date(session.created_at).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        card.className = 'card-brutal bg-white p-5 flex flex-col justify-between';
        card.dataset.sessionId = session.id;

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="font-black text-xs px-2 py-1 border-2 border-brutal ${isPrinted ? 'bg-brutalGreen text-brutalDark' : 'bg-brutalYellow text-brutalDark'}">
                        ${isPrinted ? '✓ SUDAH DICETAK' : '⏳ BELUM DICETAK'}
                    </span>
                    <span class="font-bold text-xs bg-brutalDark text-white px-2 py-0.5 uppercase">
                        ${isGif ? 'GIF' : 'PHOTO STRIP'}
                    </span>
                </div>

                <div class="mb-3">
                    <h4 class="font-black text-lg uppercase truncate">${escapeHtml(session.frame_name || session.frame_id || 'Frame')}</h4>
                    <p class="font-bold text-xs text-gray-500">${dateStr}</p>
                    <p class="text-[10px] text-gray-400 font-mono mt-1">ID: ${session.id.slice(0, 8)}...</p>
                </div>
            </div>

            <div class="flex flex-col gap-2 mt-4 pt-4 border-t-2 border-brutal">
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" class="btn-action-preview btn-brutal bg-brutalYellow text-brutalDark py-2 text-xs font-black flex items-center justify-center gap-1" data-id="${session.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        PREVIEW / CETAK
                    </button>
                    <button type="button" class="btn-action-toggle btn-brutal bg-white text-brutalDark py-2 text-xs font-black" data-id="${session.id}" data-current="${session.print_status}">
                        ${isPrinted ? 'UBAH: BELUM' : 'TANDAI CETAK'}
                    </button>
                </div>
                <button type="button" class="btn-action-delete text-xs font-bold text-red-600 hover:underline text-center pt-1" data-id="${session.id}">
                    Hapus Sesi
                </button>
            </div>
        `;

        el.sessionsGrid.appendChild(card);
    });
}

function setupRealtimeSubscription() {
    if (!supabase || activeSubscription) return;

    activeSubscription = supabase
        .channel('admin-sessions-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sessions' },
            () => {
                loadSessions();
                alertToast('Sesi diperbarui secara real-time! ⚡');
            }
        )
        .subscribe();
}

// ==========================================
// 2. DYNAMIC FRAME MANAGEMENT
// ==========================================

function initPresetOptions() {
    el.framePreset.innerHTML = '';
    LAYOUT_PRESETS.forEach(preset => {
        const opt = document.createElement('option');
        opt.value = preset.id;
        opt.innerText = preset.name;
        el.framePreset.appendChild(opt);
    });
    updateLiveSlotPreview();
}

async function loadFrames() {
    try {
        const { data, isLocal, error } = await getAllFramesForAdmin();
        if (error) console.warn(error);

        allAdminFrames = data || [];
        renderFramesGrid(isLocal);
    } catch (err) {
        console.error('Error loading admin frames:', err);
    }
}

function renderFramesGrid(isLocal) {
    el.framesGrid.innerHTML = '';

    allAdminFrames.forEach(frame => {
        const card = document.createElement('div');
        card.className = 'card-brutal bg-white p-4 flex flex-col justify-between';
        const isActive = frame.isActive;

        card.innerHTML = `
            <div>
                <div class="w-full bg-gray-100 border-2 border-brutal flex items-center justify-center overflow-hidden mb-3 relative" style="aspect-ratio: 2/3; max-height: 260px;">
                    <img src="${escapeHtml(frame.previewUrl)}" alt="${escapeHtml(frame.name)}" class="w-full h-full object-contain" style="max-height: 260px;">
                    <div class="absolute top-2 right-2 bg-brutalYellow border-2 border-brutal px-2 py-0.5 text-[10px] font-black">
                        ${frame.poseCount} POSE
                    </div>
                </div>

                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-black text-base uppercase truncate">${escapeHtml(frame.name)}</h3>
                    <span class="text-[10px] font-black px-2 py-0.5 border ${isActive ? 'bg-brutalGreen text-brutalDark' : 'bg-gray-300 text-gray-700'}">
                        ${isActive ? 'AKTIF' : 'NON-AKTIF'}
                    </span>
                </div>
            </div>

            <div class="flex flex-col gap-2 mt-3 pt-3 border-t-2 border-brutal">
                <button type="button" class="btn-toggle-frame btn-brutal ${isActive ? 'bg-gray-200' : 'bg-brutalGreen'} py-2 text-xs font-black" data-id="${frame.id}" data-status="${isActive}">
                    ${isActive ? 'NONAKTIFKAN' : 'AKTIFKAN'}
                </button>
                ${!isLocal && !frame.id.startsWith('frame-') ? `
                    <button type="button" class="btn-delete-frame text-xs font-bold text-red-600 hover:underline text-center" data-id="${frame.id}">
                        Hapus Frame
                    </button>
                ` : ''}
            </div>
        `;

        el.framesGrid.appendChild(card);
    });
}

function updateLiveSlotPreview() {
    const selectedPresetId = el.framePreset.value;
    const preset = LAYOUT_PRESETS.find(p => p.id === selectedPresetId);
    if (!preset) return;

    el.framePreviewSlots.innerHTML = '';
    preset.slots.forEach(slot => {
        const sBox = document.createElement('div');
        sBox.style.position = 'absolute';
        sBox.style.left = `${slot.x}%`;
        sBox.style.top = `${slot.y}%`;
        sBox.style.width = `${slot.w}%`;
        sBox.style.height = `${slot.h}%`;
        sBox.style.border = '2px dashed #0055FF';
        sBox.style.backgroundColor = 'rgba(0, 85, 255, 0.2)';
        if (slot.shape === 'ellipse') {
            sBox.style.borderRadius = '50%';
        }
        el.framePreviewSlots.appendChild(sBox);
    });
}

el.framePreset.addEventListener('change', updateLiveSlotPreview);

el.frameFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            el.framePreviewImg.src = re.target.result;
            el.framePreviewImg.classList.remove('hidden');
            el.framePreviewPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Modal Open/Close Frame
el.btnOpenAddFrame.addEventListener('click', () => {
    el.addFrameForm.reset();
    el.framePreviewImg.src = '';
    el.framePreviewImg.classList.add('hidden');
    el.framePreviewPlaceholder.classList.remove('hidden');
    updateLiveSlotPreview();
    el.addFrameModal.classList.remove('hidden');
});

function closeAddFrameModal() {
    el.addFrameModal.classList.add('hidden');
}

el.btnCloseFrameModal.addEventListener('click', closeAddFrameModal);
el.btnCancelFrame.addEventListener('click', closeAddFrameModal);

// Submit Tambah Frame Baru
el.addFrameForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = el.frameName.value.trim();
    const file = el.frameFile.files[0];
    const presetId = el.framePreset.value;
    const isActive = el.frameIsActive.checked;

    if (!file) {
        alertToast('Pilih file gambar frame terlebih dahulu.');
        return;
    }

    const preset = LAYOUT_PRESETS.find(p => p.id === presetId);
    if (!preset) {
        alertToast('Pilih preset slot yang valid.');
        return;
    }

    el.btnSubmitFrame.disabled = true;
    el.btnSubmitFrame.innerText = 'Mengunggah Frame...';

    try {
        await createNewFrame({
            name,
            imageFile: file,
            aspectRatio: preset.aspectRatio,
            poseCount: preset.poseCount,
            gap: preset.gap,
            slots: preset.slots,
            isActive
        });

        alertToast('Frame baru berhasil disimpan & diunggah! 🖼️✨');
        closeAddFrameModal();
        loadFrames();
    } catch (err) {
        console.error('Submit frame error:', err);
        alertToast(`Gagal: ${err.message}`);
    } finally {
        el.btnSubmitFrame.disabled = false;
        el.btnSubmitFrame.innerText = 'SIMPAN & UNGGAH FRAME';
    }
});

// ==========================================
// 3. GLOBAL CLICK DELEGATION
// ==========================================

document.addEventListener('click', async (e) => {
    // Preview / Print Sesi
    const previewBtn = e.target.closest('.btn-action-preview');
    if (previewBtn) {
        const id = previewBtn.dataset.id;
        const session = allSessions.find(s => s.id === id);
        if (!session) return;

        alertToast('Membuat tautan pratinjau foto...');
        const signedUrl = await getAdminSignedUrl(session.result_path);
        if (!signedUrl) {
            alertToast('Gagal memuat URL foto dari storage.');
            return;
        }

        currentPreviewUrl = signedUrl;
        currentPreviewSession = session;
        el.modalTitle.innerText = `Preview: ${session.frame_name || 'Sesi'} (${session.id.slice(0, 8)})`;
        el.modalImage.src = signedUrl;
        el.previewModal.classList.remove('hidden');
        return;
    }

    // Toggle Status Cetak Sesi
    const toggleBtn = e.target.closest('.btn-action-toggle');
    if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const current = toggleBtn.dataset.current;
        const newStatus = current === 'printed' ? 'unprinted' : 'printed';

        toggleBtn.disabled = true;
        const { error } = await updatePrintStatus(id, newStatus);
        if (error) {
            alertToast('Gagal mengubah status cetak.');
        } else {
            const s = allSessions.find(item => item.id === id);
            if (s) s.print_status = newStatus;
            updateStats();
            renderSessions();
            alertToast(newStatus === 'printed' ? 'Ditandai sudah dicetak! 🖨️' : 'Status diubah ke belum dicetak.');
        }
        toggleBtn.disabled = false;
        return;
    }

    // Hapus Sesi
    const deleteBtn = e.target.closest('.btn-action-delete');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const session = allSessions.find(s => s.id === id);
        if (!session) return;

        if (!confirm('Apakah Anda yakin ingin menghapus sesi foto ini dari database dan cloud storage?')) return;

        const { error } = await deleteSession(session);
        if (error) {
            alertToast('Gagal menghapus sesi.');
        } else {
            allSessions = allSessions.filter(item => item.id !== id);
            updateStats();
            renderSessions();
            alertToast('Sesi berhasil dihapus.');
        }
        return;
    }

    // Toggle Status Aktif Frame
    const toggleFrameBtn = e.target.closest('.btn-toggle-frame');
    if (toggleFrameBtn) {
        const id = toggleFrameBtn.dataset.id;
        const status = toggleFrameBtn.dataset.status === 'true';

        toggleFrameBtn.disabled = true;
        try {
            const newStatus = await toggleFrameActive(id, status);
            const target = allAdminFrames.find(f => f.id === id);
            if (target) target.isActive = newStatus;
            renderFramesGrid(false);
            alertToast(newStatus ? 'Frame diaktifkan!' : 'Frame dinonaktifkan.');
        } catch (err) {
            alertToast(`Gagal: ${err.message}`);
        } finally {
            toggleFrameBtn.disabled = false;
        }
        return;
    }

    // Hapus Frame
    const deleteFrameBtn = e.target.closest('.btn-delete-frame');
    if (deleteFrameBtn) {
        const id = deleteFrameBtn.dataset.id;
        if (!confirm('Hapus frame ini dari database dan storage?')) return;

        try {
            await deleteFrameById(id);
            allAdminFrames = allAdminFrames.filter(f => f.id !== id);
            renderFramesGrid(false);
            alertToast('Frame berhasil dihapus.');
        } catch (err) {
            alertToast(`Gagal menghapus: ${err.message}`);
        }
        return;
    }
});

// Modal Events
el.btnCloseModal.addEventListener('click', () => {
    el.previewModal.classList.add('hidden');
    el.modalImage.src = '';
    currentPreviewUrl = '';
    currentPreviewSession = null;
});

el.btnModalPrint.addEventListener('click', async () => {
    if (!currentPreviewUrl) {
        alertToast('Pilih foto terlebih dahulu untuk dicetak.');
        return;
    }

    const originalContent = el.btnModalPrint.innerHTML;
    try {
        el.btnModalPrint.disabled = true;
        el.btnModalPrint.innerHTML = `
            <svg class="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>MENYIAPKAN CETAK...</span>
        `;
        alertToast('Membuka dialog cetak printer... 🖨️');

        await printPhoto(currentPreviewUrl, {
            title: `BAPOTO.JO — ${currentPreviewSession?.frame_name || 'Cetak Foto'}`
        });

        // Jika sesi belum ditandai sudah dicetak, otomatis perbarui statusnya
        if (currentPreviewSession && currentPreviewSession.print_status !== 'printed') {
            try {
                await updatePrintStatus(currentPreviewSession.id, 'printed');
                currentPreviewSession.print_status = 'printed';
                loadSessions();
                alertToast('Sesi foto otomatis ditandai SUDAH DICETAK! ✅');
            } catch (statusErr) {
                console.warn('Gagal memperbarui status cetak otomatis:', statusErr);
            }
        }
    } catch (err) {
        console.error('Print dialog error:', err);
        alertToast(`Gagal mencetak: ${err.message}`);
    } finally {
        el.btnModalPrint.disabled = false;
        el.btnModalPrint.innerHTML = originalContent;
    }
});

// Login Form Submit
el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isConfigured || !supabase) {
        alertToast('Konfigurasikan Supabase pada file .env terlebih dahulu!');
        return;
    }

    const email = el.loginEmail.value.trim();
    const password = el.loginPassword.value;

    el.btnLoginSubmit.disabled = true;
    el.btnLoginSubmit.innerText = 'MEMVERIFIKASI...';

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alertToast('Login berhasil!');
    } catch (err) {
        console.error('Login error:', err);
        alertToast(`Gagal login: ${err.message}`);
    } finally {
        el.btnLoginSubmit.disabled = false;
        el.btnLoginSubmit.innerText = 'MASUK KE DASHBOARD';
    }
});

// Logout
el.btnLogout.addEventListener('click', async () => {
    if (supabase) {
        await supabase.auth.signOut();
        alertToast('Anda telah keluar.');
    }
});

// Refresh button
el.btnRefresh.addEventListener('click', () => {
    loadSessions();
    alertToast('Daftar sesi dimuat ulang.');
});

// Cleanup button
el.btnCleanup.addEventListener('click', async () => {
    if (!confirm('Jalankan pembersihan sesi yang sudah melewati masa berlaku 24 jam?')) return;
    alertToast('Menjalankan pembersihan sesi kedaluwarsa... 🧹');
    const { count, error } = await runExpiredCleanup();
    if (error) {
        alertToast(`Gagal: ${error}`);
    } else {
        alertToast(`Berhasil membersihkan ${count} sesi kedaluwarsa! ✨`);
        loadSessions();
    }
});

// Filter Tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.remove('bg-brutalDark', 'text-white');
            t.classList.add('bg-white', 'text-brutalDark');
        });
        tab.classList.remove('bg-white', 'text-brutalDark');
        tab.classList.add('bg-brutalDark', 'text-white');

        currentFilter = tab.dataset.filter;
        renderSessions();
    });
});

window.addEventListener('DOMContentLoaded', initAdmin);
