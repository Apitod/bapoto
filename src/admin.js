/**
 * Controller untuk Admin Dashboard (admin.html).
 * Menghandle:
 * - Autentikasi Supabase Auth (Login/Logout)
 * - Pemantauan antrean sesi foto secara Real-time
 * - Filter status cetak (Semua / Belum Dicetak / Sudah Dicetak)
 * - Tampilan preview hasil foto & dialog print browser
 * - Update status cetak (printed / unprinted)
 * - Pembersihan sesi kedaluwarsa
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
import { alertToast } from './ui/toast.js';
import { escapeHtml } from './utils/html.js';

let currentFilter = 'all';
let allSessions = [];
let activeSubscription = null;
let currentPreviewUrl = '';

const el = {
    authSection: document.getElementById('auth-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    unconfiguredAlert: document.getElementById('supabase-unconfigured-alert'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    userEmail: document.getElementById('admin-user-email'),
    btnLogout: document.getElementById('btn-logout'),

    // Stats
    statTotal: document.getElementById('stat-total'),
    statUnprinted: document.getElementById('stat-unprinted'),
    statPrinted: document.getElementById('stat-printed'),

    // List & states
    sessionsLoading: document.getElementById('sessions-loading'),
    sessionsEmpty: document.getElementById('sessions-empty'),
    sessionsGrid: document.getElementById('sessions-grid'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnCleanup: document.getElementById('btn-cleanup'),

    // Modal & Print
    previewModal: document.getElementById('preview-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalImage: document.getElementById('modal-image'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnModalPrint: document.getElementById('btn-modal-print'),
    printArea: document.getElementById('print-area'),
    printImage: document.getElementById('print-image')
};

async function initAdmin() {
    if (!isConfigured || !supabase) {
        if (el.unconfiguredAlert) el.unconfiguredAlert.classList.remove('hidden');
        return;
    }

    // Cek sesi login saat ini
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        showDashboard(session.user);
    } else {
        showAuth();
    }

    // Listen auth state changes
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

    loadSessions();
    setupRealtimeSubscription();
}

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
                console.log('Realtime update detected in sessions table.');
                loadSessions();
                alertToast('Sesi diperbarui secara real-time! ⚡');
            }
        )
        .subscribe();
}

// Handler Aksi Delegated pada Kartu Sesi
document.addEventListener('click', async (e) => {
    // 1. Preview / Print
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
        el.modalTitle.innerText = `Preview: ${session.frame_name || 'Sesi'} (${session.id.slice(0, 8)})`;
        el.modalImage.src = signedUrl;
        el.previewModal.classList.remove('hidden');
        return;
    }

    // 2. Toggle Status Cetak
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

    // 3. Hapus Sesi
    const deleteBtn = e.target.closest('.btn-action-delete');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const session = allSessions.find(s => s.id === id);
        if (!session) return;

        if (!confirm('Apakah Anda yakin ingin menghapus sesi foto ini dari database dan cloud storage?')) {
            return;
        }

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
});

// Modal Events
el.btnCloseModal.addEventListener('click', () => {
    el.previewModal.classList.add('hidden');
    el.modalImage.src = '';
    currentPreviewUrl = '';
});

el.btnModalPrint.addEventListener('click', () => {
    if (!currentPreviewUrl) return;
    el.printImage.src = currentPreviewUrl;
    el.printArea.classList.remove('hidden');

    setTimeout(() => {
        window.print();
        el.printArea.classList.add('hidden');
    }, 300);
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
