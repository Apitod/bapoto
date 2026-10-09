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
    framePreviewBox: document.getElementById('frame-preview-box'),
    framePreviewCanvas: document.getElementById('frame-preview-canvas'),
    framePreviewSlots: document.getElementById('frame-preview-slots'),
    framePreviewPlaceholder: document.getElementById('frame-preview-placeholder'),

    // Frame Composition Controls
    btnCompRotateLeft: document.getElementById('btn-comp-rotate-left'),
    btnCompRotateRight: document.getElementById('btn-comp-rotate-right'),
    btnCompFlipH: document.getElementById('btn-comp-flip-h'),
    btnCompFlipV: document.getElementById('btn-comp-flip-v'),
    btnCompFit: document.getElementById('btn-comp-fit'),
    btnCompCover: document.getElementById('btn-comp-cover'),
    btnCompReset: document.getElementById('btn-comp-reset'),
    compScale: document.getElementById('comp-scale'),
    compScaleVal: document.getElementById('comp-scale-val'),
    compRotate: document.getElementById('comp-rotate'),
    compRotateVal: document.getElementById('comp-rotate-val'),
    compPanX: document.getElementById('comp-pan-x'),
    compPanXVal: document.getElementById('comp-pan-x-val'),
    compPanY: document.getElementById('comp-pan-y'),
    compPanYVal: document.getElementById('comp-pan-y-val'),
    compBgColor: document.getElementById('comp-bg-color'),
    compLayerMode: document.getElementById('comp-layer-mode'),

    // Slot Photo Editor Controls (Kotak Biru)
    slotCountBadge: document.getElementById('slot-count-badge'),
    btnSlotAdd: document.getElementById('btn-slot-add'),
    btnSlotDuplicate: document.getElementById('btn-slot-duplicate'),
    btnSlotMatch: document.getElementById('btn-slot-match'),
    btnSlotDelete: document.getElementById('btn-slot-delete'),
    btnSlotReset: document.getElementById('btn-slot-reset'),
    slotSelect: document.getElementById('slot-select'),
    slotShape: document.getElementById('slot-shape'),
    slotX: document.getElementById('slot-x'),
    slotY: document.getElementById('slot-y'),
    slotW: document.getElementById('slot-w'),
    slotH: document.getElementById('slot-h'),
    slotSnap: document.getElementById('slot-snap'),
    slotLockRatio: document.getElementById('slot-lock-ratio'),

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
    initCustomSlotsFromPreset(el.framePreset.value);
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
                ${!isLocal ? `
                    <button type="button" class="btn-delete-frame btn-brutal bg-red-100 border-red-400 text-red-700 hover:bg-red-200 py-2 text-xs font-black" data-id="${frame.id}">
                        🗑 HAPUS FRAME
                    </button>
                ` : ''}
            </div>
        `;

        el.framesGrid.appendChild(card);
    });
}

// State Komposisi Frame untuk Upload
const frameTransform = {
    img: null,
    scale: 1.0,
    rotation: 0,
    panX: 0,
    panY: 0,
    flipX: false,
    flipY: false,
    bgColor: 'transparent',
    layerMode: 'slots-front'
};

function resetFrameTransform() {
    frameTransform.scale = 1.0;
    frameTransform.rotation = 0;
    frameTransform.panX = 0;
    frameTransform.panY = 0;
    frameTransform.flipX = false;
    frameTransform.flipY = false;
    frameTransform.bgColor = 'transparent';
    frameTransform.layerMode = 'slots-front';
    if (el.compBgColor) el.compBgColor.value = 'transparent';
    if (el.compLayerMode) el.compLayerMode.value = 'slots-front';
}

function renderTransformedFrameToContext(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    if (frameTransform.bgColor && frameTransform.bgColor !== 'transparent') {
        ctx.fillStyle = frameTransform.bgColor;
        ctx.fillRect(0, 0, width, height);
    }

    if (!frameTransform.img) return;

    ctx.save();
    // Geser titik pusat ke tengah ditambah persentase panX & panY
    const cx = (width / 2) + (frameTransform.panX / 100) * width;
    const cy = (height / 2) + (frameTransform.panY / 100) * height;
    ctx.translate(cx, cy);

    // Rotasi
    ctx.rotate((frameTransform.rotation * Math.PI) / 180);

    // Cermin
    ctx.scale(frameTransform.flipX ? -1 : 1, frameTransform.flipY ? -1 : 1);

    // Skala dasar agar muat ke dalam kanvas (fit), dikali scale slider
    const baseScale = Math.min(width / frameTransform.img.naturalWidth, height / frameTransform.img.naturalHeight);
    const drawW = frameTransform.img.naturalWidth * baseScale * frameTransform.scale;
    const drawH = frameTransform.img.naturalHeight * baseScale * frameTransform.scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameTransform.img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
}

function renderFramePreview() {
    if (!frameTransform.img) {
        if (el.framePreviewCanvas) el.framePreviewCanvas.classList.add('hidden');
        if (el.framePreviewPlaceholder) el.framePreviewPlaceholder.classList.remove('hidden');
        return;
    }

    if (el.framePreviewPlaceholder) el.framePreviewPlaceholder.classList.add('hidden');
    if (el.framePreviewCanvas && el.framePreviewBox) {
        el.framePreviewCanvas.classList.remove('hidden');
        const box = el.framePreviewBox.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        el.framePreviewCanvas.width = (box.width || 256) * dpr;
        el.framePreviewCanvas.height = (box.height || 382) * dpr;
        const ctx = el.framePreviewCanvas.getContext('2d');
        renderTransformedFrameToContext(ctx, el.framePreviewCanvas.width, el.framePreviewCanvas.height);
    }

    // Update Sliders & Display Text
    if (el.compScale) el.compScale.value = frameTransform.scale;
    if (el.compScaleVal) el.compScaleVal.innerText = `${Math.round(frameTransform.scale * 100)}%`;

    if (el.compRotate) el.compRotate.value = frameTransform.rotation;
    if (el.compRotateVal) el.compRotateVal.innerText = `${frameTransform.rotation}°`;

    if (el.compPanX) el.compPanX.value = frameTransform.panX;
    if (el.compPanXVal) el.compPanXVal.innerText = `${Math.round(frameTransform.panX)}%`;

    if (el.compPanY) el.compPanY.value = frameTransform.panY;
    if (el.compPanYVal) el.compPanYVal.innerText = `${Math.round(frameTransform.panY)}%`;

    // Layering Z-Index
    if (el.framePreviewSlots && el.framePreviewCanvas) {
        if (frameTransform.layerMode === 'slots-front') {
            el.framePreviewSlots.style.zIndex = '20';
            el.framePreviewCanvas.style.zIndex = '10';
        } else {
            el.framePreviewSlots.style.zIndex = '10';
            el.framePreviewCanvas.style.zIndex = '20';
        }
    }
}

// ==========================================
// STATE & LOGIKA SLOT FOTO (KOTAK BIRU)
// ==========================================
let customSlots = [];
let selectedSlotIndex = 0;
let isDraggingSlot = false;
let isResizingSlot = false;
let resizeHandleType = null;
let slotDragStartX = 0;
let slotDragStartY = 0;
let initialSlotSnapshot = null;

function initCustomSlotsFromPreset(presetId) {
    const preset = LAYOUT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    customSlots = JSON.parse(JSON.stringify(preset.slots || []));
    selectedSlotIndex = customSlots.length > 0 ? 0 : -1;
    renderSlotControls();
    renderLiveSlotBoxes();
}

function renderSlotControls() {
    if (el.slotCountBadge) {
        el.slotCountBadge.innerText = `${customSlots.length} SLOT`;
    }

    if (el.slotSelect) {
        el.slotSelect.innerHTML = '';
        customSlots.forEach((slot, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `Slot #${idx + 1} (${slot.shape === 'ellipse' ? 'Elips' : 'Persegi'}) [${slot.w.toFixed(1)}% × ${slot.h.toFixed(1)}%]`;
            el.slotSelect.appendChild(opt);
        });
        if (selectedSlotIndex >= 0 && selectedSlotIndex < customSlots.length) {
            el.slotSelect.value = selectedSlotIndex;
        }
    }

    const currentSlot = customSlots[selectedSlotIndex];
    const hasSlot = !!currentSlot;

    if (el.btnSlotDuplicate) el.btnSlotDuplicate.disabled = !hasSlot;
    if (el.btnSlotMatch) el.btnSlotMatch.disabled = !hasSlot;
    if (el.btnSlotDelete) el.btnSlotDelete.disabled = customSlots.length <= 1;

    if (el.slotShape) el.slotShape.disabled = !hasSlot;
    if (el.slotX) el.slotX.disabled = !hasSlot;
    if (el.slotY) el.slotY.disabled = !hasSlot;
    if (el.slotW) el.slotW.disabled = !hasSlot;
    if (el.slotH) el.slotH.disabled = !hasSlot;

    if (hasSlot) {
        if (el.slotShape) el.slotShape.value = currentSlot.shape || 'rect';
        if (el.slotX) el.slotX.value = Number(currentSlot.x.toFixed(2));
        if (el.slotY) el.slotY.value = Number(currentSlot.y.toFixed(2));
        if (el.slotW) el.slotW.value = Number(currentSlot.w.toFixed(2));
        if (el.slotH) el.slotH.value = Number(currentSlot.h.toFixed(2));
    }
}

function syncSlotInputs() {
    const slot = customSlots[selectedSlotIndex];
    if (!slot) return;
    if (el.slotX) el.slotX.value = Number(slot.x.toFixed(2));
    if (el.slotY) el.slotY.value = Number(slot.y.toFixed(2));
    if (el.slotW) el.slotW.value = Number(slot.w.toFixed(2));
    if (el.slotH) el.slotH.value = Number(slot.h.toFixed(2));
    if (el.slotShape) el.slotShape.value = slot.shape || 'rect';
}

function updateSlotElementStyles(index) {
    if (!el.framePreviewSlots) return;
    const slot = customSlots[index];
    if (!slot) return;
    const sBox = el.framePreviewSlots.querySelector(`.slot-box-item[data-index="${index}"]`);
    if (!sBox) return;

    sBox.style.left = `${slot.x}%`;
    sBox.style.top = `${slot.y}%`;
    sBox.style.width = `${slot.w}%`;
    sBox.style.height = `${slot.h}%`;

    const badge = sBox.querySelector('.slot-badge');
    if (badge) {
        badge.innerHTML = `<span>#${index + 1}</span><span style="font-size: 8px; opacity: 0.9;">${slot.w.toFixed(1)}×${slot.h.toFixed(1)}%</span>`;
    }
}

function renderLiveSlotBoxes() {
    if (!el.framePreviewSlots) return;
    el.framePreviewSlots.innerHTML = '';

    customSlots.forEach((slot, idx) => {
        const isSelected = (idx === selectedSlotIndex);
        const sBox = document.createElement('div');
        sBox.className = 'slot-box-item';
        sBox.dataset.index = idx;

        sBox.style.position = 'absolute';
        sBox.style.left = `${slot.x}%`;
        sBox.style.top = `${slot.y}%`;
        sBox.style.width = `${slot.w}%`;
        sBox.style.height = `${slot.h}%`;
        sBox.style.pointerEvents = 'auto';
        sBox.style.cursor = 'move';
        sBox.style.boxSizing = 'border-box';
        sBox.style.display = 'flex';
        sBox.style.alignItems = 'center';
        sBox.style.justifyContent = 'center';

        if (slot.shape === 'ellipse') {
            sBox.style.borderRadius = '50%';
        } else {
            sBox.style.borderRadius = '2px';
        }

        if (isSelected) {
            sBox.style.border = '2.5px solid #0055FF';
            sBox.style.backgroundColor = 'rgba(0, 85, 255, 0.32)';
            sBox.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 10px rgba(0, 85, 255, 0.7)';
            sBox.style.zIndex = '30';
        } else {
            sBox.style.border = '2px dashed #0055FF';
            sBox.style.backgroundColor = 'rgba(0, 85, 255, 0.18)';
            sBox.style.zIndex = '20';
        }

        // Center badge
        const badge = document.createElement('div');
        badge.className = 'slot-badge';
        badge.style.pointerEvents = 'none';
        badge.style.backgroundColor = isSelected ? '#0055FF' : 'rgba(0, 85, 255, 0.85)';
        badge.style.color = '#FFFFFF';
        badge.style.fontWeight = '900';
        badge.style.fontSize = '10px';
        badge.style.padding = '1px 5px';
        badge.style.borderRadius = '3px';
        badge.style.border = '1px solid #FFFFFF';
        badge.style.display = 'flex';
        badge.style.flexDirection = 'column';
        badge.style.alignItems = 'center';
        badge.style.lineHeight = '1.1';
        badge.innerHTML = `<span>#${idx + 1}</span><span style="font-size: 8px; opacity: 0.9;">${slot.w.toFixed(1)}×${slot.h.toFixed(1)}%</span>`;
        sBox.appendChild(badge);

        // Slot Drag Start
        const onSlotStart = (clientX, clientY, e) => {
            e.stopPropagation();
            selectedSlotIndex = idx;
            isDraggingSlot = true;
            isResizingSlot = false;
            slotDragStartX = clientX;
            slotDragStartY = clientY;
            initialSlotSnapshot = { ...customSlots[idx] };
            renderSlotControls();
            renderLiveSlotBoxes();
        };

        sBox.addEventListener('mousedown', (e) => {
            if (e.target.closest('.slot-resize-handle')) return;
            onSlotStart(e.clientX, e.clientY, e);
        });

        sBox.addEventListener('touchstart', (e) => {
            if (e.target.closest('.slot-resize-handle')) return;
            if (e.touches.length > 0) {
                onSlotStart(e.touches[0].clientX, e.touches[0].clientY, e);
            }
        }, { passive: false });

        // Resize Handles if Selected
        if (isSelected) {
            const handlePositions = [
                { type: 'nw', cursor: 'nwse-resize', style: 'top: -5px; left: -5px;' },
                { type: 'ne', cursor: 'nesw-resize', style: 'top: -5px; right: -5px;' },
                { type: 'se', cursor: 'nwse-resize', style: 'bottom: -5px; right: -5px;' },
                { type: 'sw', cursor: 'nesw-resize', style: 'bottom: -5px; left: -5px;' },
                { type: 'n', cursor: 'ns-resize', style: 'top: -5px; left: calc(50% - 5px);' },
                { type: 's', cursor: 'ns-resize', style: 'bottom: -5px; left: calc(50% - 5px);' },
                { type: 'w', cursor: 'ew-resize', style: 'top: calc(50% - 5px); left: -5px;' },
                { type: 'e', cursor: 'ew-resize', style: 'top: calc(50% - 5px); right: -5px;' }
            ];

            handlePositions.forEach(h => {
                const handle = document.createElement('div');
                handle.className = 'slot-resize-handle';
                handle.dataset.handle = h.type;
                handle.style.cssText = `
                    width: 10px;
                    height: 10px;
                    background-color: #FFFFFF;
                    border: 2px solid #0055FF;
                    position: absolute;
                    z-index: 40;
                    pointer-events: auto;
                    border-radius: 2px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                    cursor: ${h.cursor};
                    ${h.style}
                `;

                const onResizeStart = (clientX, clientY, ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    isResizingSlot = true;
                    isDraggingSlot = false;
                    resizeHandleType = h.type;
                    slotDragStartX = clientX;
                    slotDragStartY = clientY;
                    initialSlotSnapshot = { ...customSlots[selectedSlotIndex] };
                };

                handle.addEventListener('mousedown', (ev) => {
                    onResizeStart(ev.clientX, ev.clientY, ev);
                });

                handle.addEventListener('touchstart', (ev) => {
                    if (ev.touches.length > 0) {
                        onResizeStart(ev.touches[0].clientX, ev.touches[0].clientY, ev);
                    }
                }, { passive: false });

                sBox.appendChild(handle);
            });
        }

        el.framePreviewSlots.appendChild(sBox);
    });
}

function handleSlotResize(clientX, clientY) {
    if (!el.framePreviewBox || !initialSlotSnapshot || selectedSlotIndex < 0) return;
    const box = el.framePreviewBox.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;

    const deltaX = ((clientX - slotDragStartX) / box.width) * 100;
    const deltaY = ((clientY - slotDragStartY) / box.height) * 100;

    let { x, y, w, h } = initialSlotSnapshot;
    const isSnap = el.slotSnap ? el.slotSnap.checked : true;
    const snapVal = 0.5;
    const isLockRatio = el.slotLockRatio ? el.slotLockRatio.checked : false;
    const initialRatio = (initialSlotSnapshot.w / initialSlotSnapshot.h) || 1;

    // Horisontal
    if (resizeHandleType.includes('e')) {
        w = Math.max(3, initialSlotSnapshot.w + deltaX);
    } else if (resizeHandleType.includes('w')) {
        const potentialW = initialSlotSnapshot.w - deltaX;
        if (potentialW >= 3) {
            w = potentialW;
            x = initialSlotSnapshot.x + deltaX;
        } else {
            w = 3;
            x = initialSlotSnapshot.x + (initialSlotSnapshot.w - 3);
        }
    }

    // Vertikal
    if (resizeHandleType.includes('s')) {
        h = Math.max(3, initialSlotSnapshot.h + deltaY);
    } else if (resizeHandleType.includes('n')) {
        const potentialH = initialSlotSnapshot.h - deltaY;
        if (potentialH >= 3) {
            h = potentialH;
            y = initialSlotSnapshot.y + deltaY;
        } else {
            h = 3;
            y = initialSlotSnapshot.y + (initialSlotSnapshot.h - 3);
        }
    }

    // Lock Ratio
    if (isLockRatio) {
        if (resizeHandleType === 'e' || resizeHandleType === 'w') {
            h = w / initialRatio;
        } else if (resizeHandleType === 's' || resizeHandleType === 'n') {
            w = h * initialRatio;
        } else {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                h = w / initialRatio;
            } else {
                w = h * initialRatio;
            }
        }
    }

    // Boundary limits
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > 100) { w = 100 - x; }
    if (y + h > 100) { h = 100 - y; }

    w = Math.max(3, w);
    h = Math.max(3, h);

    if (isSnap) {
        x = Math.round(x / snapVal) * snapVal;
        y = Math.round(y / snapVal) * snapVal;
        w = Math.max(3, Math.round(w / snapVal) * snapVal);
        h = Math.max(3, Math.round(h / snapVal) * snapVal);
    }

    customSlots[selectedSlotIndex].x = Number(x.toFixed(2));
    customSlots[selectedSlotIndex].y = Number(y.toFixed(2));
    customSlots[selectedSlotIndex].w = Number(w.toFixed(2));
    customSlots[selectedSlotIndex].h = Number(h.toFixed(2));

    syncSlotInputs();
    updateSlotElementStyles(selectedSlotIndex);
}

function handleSlotMove(clientX, clientY) {
    if (!el.framePreviewBox || !initialSlotSnapshot || selectedSlotIndex < 0) return;
    const box = el.framePreviewBox.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;

    const deltaX = ((clientX - slotDragStartX) / box.width) * 100;
    const deltaY = ((clientY - slotDragStartY) / box.height) * 100;

    let x = initialSlotSnapshot.x + deltaX;
    let y = initialSlotSnapshot.y + deltaY;
    const w = initialSlotSnapshot.w;
    const h = initialSlotSnapshot.h;

    const isSnap = el.slotSnap ? el.slotSnap.checked : true;
    const snapVal = 0.5;

    x = Math.max(0, Math.min(100 - w, x));
    y = Math.max(0, Math.min(100 - h, y));

    if (isSnap) {
        x = Math.round(x / snapVal) * snapVal;
        y = Math.round(y / snapVal) * snapVal;
    }

    customSlots[selectedSlotIndex].x = Number(x.toFixed(2));
    customSlots[selectedSlotIndex].y = Number(y.toFixed(2));

    syncSlotInputs();
    updateSlotElementStyles(selectedSlotIndex);
}

// Interaktif Drag-to-Pan pada Preview Box
let isDraggingPreview = false;
let dragStartX = 0;
let dragStartY = 0;
let initialPanX = 0;
let initialPanY = 0;

if (el.framePreviewBox) {
    el.framePreviewBox.addEventListener('mousedown', (e) => {
        if (e.target.closest('.slot-box-item') || e.target.closest('.slot-resize-handle')) return;
        if (!frameTransform.img) return;
        isDraggingPreview = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialPanX = frameTransform.panX;
        initialPanY = frameTransform.panY;
    });

    el.framePreviewBox.addEventListener('touchstart', (e) => {
        if (e.target.closest('.slot-box-item') || e.target.closest('.slot-resize-handle')) return;
        if (!frameTransform.img || e.touches.length === 0) return;
        isDraggingPreview = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        initialPanX = frameTransform.panX;
        initialPanY = frameTransform.panY;
    }, { passive: true });

    el.framePreviewBox.addEventListener('wheel', (e) => {
        if (!frameTransform.img) return;
        e.preventDefault();
        const step = e.deltaY < 0 ? 0.05 : -0.05;
        frameTransform.scale = Math.max(0.2, Math.min(3.0, Number((frameTransform.scale + step).toFixed(2))));
        renderFramePreview();
    }, { passive: false });
}

window.addEventListener('mousemove', (e) => {
    if (isResizingSlot) {
        handleSlotResize(e.clientX, e.clientY);
        return;
    }
    if (isDraggingSlot) {
        handleSlotMove(e.clientX, e.clientY);
        return;
    }
    if (isDraggingPreview && el.framePreviewBox) {
        const box = el.framePreviewBox.getBoundingClientRect();
        const deltaX = ((e.clientX - dragStartX) / box.width) * 100;
        const deltaY = ((e.clientY - dragStartY) / box.height) * 100;
        frameTransform.panX = Math.max(-100, Math.min(100, Math.round(initialPanX + deltaX)));
        frameTransform.panY = Math.max(-100, Math.min(100, Math.round(initialPanY + deltaY)));
        renderFramePreview();
    }
});

window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;

    if (isResizingSlot) {
        handleSlotResize(clientX, clientY);
        return;
    }
    if (isDraggingSlot) {
        handleSlotMove(clientX, clientY);
        return;
    }
    if (isDraggingPreview && el.framePreviewBox) {
        const box = el.framePreviewBox.getBoundingClientRect();
        const deltaX = ((clientX - dragStartX) / box.width) * 100;
        const deltaY = ((clientY - dragStartY) / box.height) * 100;
        frameTransform.panX = Math.max(-100, Math.min(100, Math.round(initialPanX + deltaX)));
        frameTransform.panY = Math.max(-100, Math.min(100, Math.round(initialPanY + deltaY)));
        renderFramePreview();
    }
}, { passive: true });

window.addEventListener('mouseup', () => {
    if (isDraggingSlot || isResizingSlot) {
        isDraggingSlot = false;
        isResizingSlot = false;
        resizeHandleType = null;
        renderSlotControls();
        renderLiveSlotBoxes();
    }
    isDraggingPreview = false;
});

window.addEventListener('touchend', () => {
    if (isDraggingSlot || isResizingSlot) {
        isDraggingSlot = false;
        isResizingSlot = false;
        resizeHandleType = null;
        renderSlotControls();
        renderLiveSlotBoxes();
    }
    isDraggingPreview = false;
});

// Event Listeners Kontrol Komposisi
if (el.btnCompRotateLeft) {
    el.btnCompRotateLeft.addEventListener('click', () => {
        let r = frameTransform.rotation - 90;
        if (r < -180) r += 360;
        frameTransform.rotation = r;
        renderFramePreview();
    });
}
if (el.btnCompRotateRight) {
    el.btnCompRotateRight.addEventListener('click', () => {
        let r = frameTransform.rotation + 90;
        if (r > 180) r -= 360;
        frameTransform.rotation = r;
        renderFramePreview();
    });
}
if (el.btnCompFlipH) {
    el.btnCompFlipH.addEventListener('click', () => {
        frameTransform.flipX = !frameTransform.flipX;
        renderFramePreview();
    });
}
if (el.btnCompFlipV) {
    el.btnCompFlipV.addEventListener('click', () => {
        frameTransform.flipY = !frameTransform.flipY;
        renderFramePreview();
    });
}
if (el.btnCompFit) {
    el.btnCompFit.addEventListener('click', () => {
        frameTransform.scale = 1.0;
        frameTransform.panX = 0;
        frameTransform.panY = 0;
        renderFramePreview();
    });
}
if (el.btnCompCover) {
    el.btnCompCover.addEventListener('click', () => {
        if (!frameTransform.img) return;
        const boxW = 1204;
        const boxH = 1795;
        const baseScale = Math.min(boxW / frameTransform.img.naturalWidth, boxH / frameTransform.img.naturalHeight);
        const coverScale = Math.max(boxW / (frameTransform.img.naturalWidth * baseScale), boxH / (frameTransform.img.naturalHeight * baseScale));
        frameTransform.scale = Number(coverScale.toFixed(2));
        frameTransform.panX = 0;
        frameTransform.panY = 0;
        renderFramePreview();
    });
}
if (el.btnCompReset) {
    el.btnCompReset.addEventListener('click', () => {
        resetFrameTransform();
        renderFramePreview();
    });
}
if (el.compScale) {
    el.compScale.addEventListener('input', (e) => {
        frameTransform.scale = Number(e.target.value);
        renderFramePreview();
    });
}
if (el.compRotate) {
    el.compRotate.addEventListener('input', (e) => {
        frameTransform.rotation = Number(e.target.value);
        renderFramePreview();
    });
}
if (el.compPanX) {
    el.compPanX.addEventListener('input', (e) => {
        frameTransform.panX = Number(e.target.value);
        renderFramePreview();
    });
}
if (el.compPanY) {
    el.compPanY.addEventListener('input', (e) => {
        frameTransform.panY = Number(e.target.value);
        renderFramePreview();
    });
}
if (el.compBgColor) {
    el.compBgColor.addEventListener('change', (e) => {
        frameTransform.bgColor = e.target.value;
        renderFramePreview();
    });
}
if (el.compLayerMode) {
    el.compLayerMode.addEventListener('change', (e) => {
        frameTransform.layerMode = e.target.value;
        renderFramePreview();
    });
}

el.framePreset.addEventListener('change', () => {
    initCustomSlotsFromPreset(el.framePreset.value);
    renderFramePreview();
});

// Event Listeners Slot Editor
if (el.btnSlotAdd) {
    el.btnSlotAdd.addEventListener('click', () => {
        const lastSlot = customSlots[customSlots.length - 1] || { w: 40, h: 25, shape: 'rect' };
        const newSlot = {
            x: Math.min(60, customSlots.length * 4 + 8),
            y: Math.min(60, customSlots.length * 4 + 8),
            w: lastSlot.w,
            h: lastSlot.h,
            shape: lastSlot.shape || 'rect'
        };
        customSlots.push(newSlot);
        selectedSlotIndex = customSlots.length - 1;
        renderSlotControls();
        renderLiveSlotBoxes();
    });
}

if (el.btnSlotDuplicate) {
    el.btnSlotDuplicate.addEventListener('click', () => {
        if (selectedSlotIndex < 0 || !customSlots[selectedSlotIndex]) return;
        const current = customSlots[selectedSlotIndex];
        const dup = {
            ...current,
            x: Math.min(100 - current.w, Number((current.x + 3).toFixed(2))),
            y: Math.min(100 - current.h, Number((current.y + 3).toFixed(2)))
        };
        customSlots.push(dup);
        selectedSlotIndex = customSlots.length - 1;
        renderSlotControls();
        renderLiveSlotBoxes();
    });
}

if (el.btnSlotMatch) {
    el.btnSlotMatch.addEventListener('click', () => {
        if (selectedSlotIndex < 0 || !customSlots[selectedSlotIndex]) return;
        const target = customSlots[selectedSlotIndex];
        customSlots.forEach(s => {
            s.w = target.w;
            s.h = target.h;
            s.shape = target.shape;
        });
        renderSlotControls();
        renderLiveSlotBoxes();
        alertToast(`Ukuran semua slot disamakan (${target.w}% × ${target.h}%)`);
    });
}

if (el.btnSlotDelete) {
    el.btnSlotDelete.addEventListener('click', () => {
        if (customSlots.length <= 1) {
            alertToast('Minimal harus ada 1 slot foto!');
            return;
        }
        customSlots.splice(selectedSlotIndex, 1);
        selectedSlotIndex = Math.max(0, selectedSlotIndex - 1);
        renderSlotControls();
        renderLiveSlotBoxes();
    });
}

if (el.btnSlotReset) {
    el.btnSlotReset.addEventListener('click', () => {
        initCustomSlotsFromPreset(el.framePreset.value);
        alertToast('Slot dikembalikan ke konfigurasi preset.');
    });
}

if (el.slotSelect) {
    el.slotSelect.addEventListener('change', (e) => {
        selectedSlotIndex = Number(e.target.value);
        renderSlotControls();
        renderLiveSlotBoxes();
    });
}

if (el.slotShape) {
    el.slotShape.addEventListener('change', (e) => {
        if (selectedSlotIndex >= 0 && customSlots[selectedSlotIndex]) {
            customSlots[selectedSlotIndex].shape = e.target.value;
            renderSlotControls();
            renderLiveSlotBoxes();
        }
    });
}

if (el.slotX) {
    el.slotX.addEventListener('input', (e) => {
        if (selectedSlotIndex >= 0 && customSlots[selectedSlotIndex]) {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                customSlots[selectedSlotIndex].x = Math.max(0, Math.min(100, val));
                renderLiveSlotBoxes();
            }
        }
    });
}

if (el.slotY) {
    el.slotY.addEventListener('input', (e) => {
        if (selectedSlotIndex >= 0 && customSlots[selectedSlotIndex]) {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                customSlots[selectedSlotIndex].y = Math.max(0, Math.min(100, val));
                renderLiveSlotBoxes();
            }
        }
    });
}

if (el.slotW) {
    el.slotW.addEventListener('input', (e) => {
        if (selectedSlotIndex >= 0 && customSlots[selectedSlotIndex]) {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
                const prevW = customSlots[selectedSlotIndex].w;
                const prevH = customSlots[selectedSlotIndex].h;
                customSlots[selectedSlotIndex].w = Math.max(2, Math.min(100, val));
                if (el.slotLockRatio && el.slotLockRatio.checked && prevW > 0) {
                    const ratio = prevW / prevH;
                    const newH = Number((customSlots[selectedSlotIndex].w / ratio).toFixed(2));
                    customSlots[selectedSlotIndex].h = Math.max(2, Math.min(100, newH));
                    if (el.slotH) el.slotH.value = customSlots[selectedSlotIndex].h;
                }
                renderLiveSlotBoxes();
            }
        }
    });
}

if (el.slotH) {
    el.slotH.addEventListener('input', (e) => {
        if (selectedSlotIndex >= 0 && customSlots[selectedSlotIndex]) {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
                const prevW = customSlots[selectedSlotIndex].w;
                const prevH = customSlots[selectedSlotIndex].h;
                customSlots[selectedSlotIndex].h = Math.max(2, Math.min(100, val));
                if (el.slotLockRatio && el.slotLockRatio.checked && prevH > 0) {
                    const ratio = prevW / prevH;
                    const newW = Number((customSlots[selectedSlotIndex].h * ratio).toFixed(2));
                    customSlots[selectedSlotIndex].w = Math.max(2, Math.min(100, newW));
                    if (el.slotW) el.slotW.value = customSlots[selectedSlotIndex].w;
                }
                renderLiveSlotBoxes();
            }
        }
    });
}

// Navigasi Keyboard untuk Slot
window.addEventListener('keydown', (e) => {
    if (!el.addFrameModal || el.addFrameModal.classList.contains('hidden')) return;
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') return;

    if (selectedSlotIndex < 0 || !customSlots[selectedSlotIndex]) return;
    const slot = customSlots[selectedSlotIndex];
    const step = e.shiftKey ? 2.0 : (el.slotSnap?.checked ? 0.5 : 0.2);

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        slot.x = Math.max(0, Number((slot.x - step).toFixed(2)));
        renderSlotControls();
        renderLiveSlotBoxes();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        slot.x = Math.min(100 - slot.w, Number((slot.x + step).toFixed(2)));
        renderSlotControls();
        renderLiveSlotBoxes();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        slot.y = Math.max(0, Number((slot.y - step).toFixed(2)));
        renderSlotControls();
        renderLiveSlotBoxes();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        slot.y = Math.min(100 - slot.h, Number((slot.y + step).toFixed(2)));
        renderSlotControls();
        renderLiveSlotBoxes();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (customSlots.length > 1) {
            customSlots.splice(selectedSlotIndex, 1);
            selectedSlotIndex = Math.max(0, selectedSlotIndex - 1);
            renderSlotControls();
            renderLiveSlotBoxes();
        } else {
            alertToast('Minimal harus ada 1 slot foto!');
        }
    }
});

el.frameFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            const img = new Image();
            img.onload = () => {
                frameTransform.img = img;
                resetFrameTransform();
                renderFramePreview();
            };
            img.src = re.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Modal Open/Close Frame
el.btnOpenAddFrame.addEventListener('click', () => {
    el.addFrameForm.reset();
    frameTransform.img = null;
    resetFrameTransform();
    if (el.framePreviewCanvas) el.framePreviewCanvas.classList.add('hidden');
    if (el.framePreviewPlaceholder) el.framePreviewPlaceholder.classList.remove('hidden');
    initCustomSlotsFromPreset(el.framePreset.value);
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

    if (!file || !frameTransform.img) {
        alertToast('Pilih file gambar frame terlebih dahulu.');
        return;
    }

    const preset = LAYOUT_PRESETS.find(p => p.id === presetId);
    if (!preset) {
        alertToast('Pilih preset slot yang valid.');
        return;
    }

    if (!customSlots || customSlots.length === 0) {
        alertToast('Frame harus memiliki minimal 1 slot foto.');
        return;
    }

    el.btnSubmitFrame.disabled = true;
    el.btnSubmitFrame.innerText = 'Mengolah & Mengunggah Frame...';

    try {
        // Render ke canvas beresolusi penuh (1204 x 1795 px) dengan transformasi yang diterapkan
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = preset.aspectRatio.width || 1204;
        exportCanvas.height = preset.aspectRatio.height || 1795;
        const exportCtx = exportCanvas.getContext('2d');
        renderTransformedFrameToContext(exportCtx, exportCanvas.width, exportCanvas.height);

        const processedBlob = await new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
        if (!processedBlob) {
            throw new Error('Gagal merender gambar frame hasil transformasi.');
        }

        const safeFilename = `${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}.png`;
        const processedFile = new File([processedBlob], safeFilename, { type: 'image/png' });

        await createNewFrame({
            name,
            imageFile: processedFile,
            aspectRatio: preset.aspectRatio,
            poseCount: customSlots.length,
            gap: preset.gap || 0,
            slots: customSlots,
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
