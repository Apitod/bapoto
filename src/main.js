/**
 * Entry point photobooth kiosk.
 * Menggantikan <script> inline di index.html lama; handler `onclick="..."`
 * diganti atribut data-nav / data-action + satu event delegation.
 */
import './styles/main.css';

import { getActiveFrames } from './services/frameService.js';
import { state, resetCaptureData } from './booth/state.js';
import { createCamera } from './core/camera.js';
import { createCaptureController } from './booth/capture.js';
import { createResultController } from './booth/result.js';
import { renderFrameCatalog } from './booth/frameCatalog.js';
import { renderFilters } from './booth/filterPicker.js';
import { alertToast } from './ui/toast.js';

const video = document.getElementById('webcam');
const camera = createCamera(video);
const capture = createCaptureController({ camera, video, onComplete: () => navToStep(5) });

const result = createResultController({
    onSessionReady: () => navToStep(6),
    onSessionReset: () => finishAndResetSession()
});

/** Normalisasi id step: '1' -> 1, '2b' tetap string. */
function parseStep(value) {
    return /^\d+$/.test(String(value)) ? Number(value) : value;
}

async function startCameraForSession() {
    const ok = await camera.start();
    if (!ok) alertToast('Gagal mengakses kamera. Periksa izin browser Anda.');
}

function finishAndResetSession() {
    result.stopAutoResetTimer();
    camera.stop();
    resetCaptureData();
    state.selectedFrame = null;
    state.selectedFilter = 'normal';
    state.selectedFormat = 'photo';
    navToStep(1);
    alertToast('Sesi selesai. Siap untuk sesi berikutnya! 🎉');
}

function navToStep(step) {
    if (state.currentStep === 6 && step !== 6) {
        result.stopAutoResetTimer();
    }

    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    state.currentStep = step;

    if (step === 3) {
        getActiveFrames().then(frames => {
            renderFrameCatalog(document.getElementById('frame-catalog'), frames, frame => {
                state.selectedFrame = frame;
                navToStep(4);
            });
        });
    }

    if (step === 4) {
        if (!state.selectedFrame) {
            alertToast('Pilih frame terlebih dahulu!');
            return navToStep(3);
        }
        resetCaptureData();
        capture.updatePoseCounter();
        startCameraForSession();
    } else {
        camera.stop();
    }

    if (step === 5) {
        refreshFilters();
        result.renderResult();
    }
}

function refreshFilters() {
    renderFilters(document.getElementById('filter-container'), state.selectedFilter, filterId => {
        state.selectedFilter = filterId;
        refreshFilters();
        result.renderResult();
    });
}

function selectFormat(format) {
    state.selectedFormat = format === 'gif' ? 'gif' : 'photo';
    navToStep(3);
}

const actions = {
    'select-format': el => selectFormat(el.dataset.format),
    'toast': el => alertToast(el.dataset.message),
    'stop-camera-return': () => { camera.stop(); navToStep(3); },
    'toggle-mirror': () => camera.toggleMirror(),
    'switch-camera': () => camera.switch().then(ok => {
        if (!ok) alertToast('Gagal mengakses kamera. Periksa izin browser Anda.');
    }),
    'capture': () => capture.startCapture(),
    'download-photo': () => result.downloadPhoto(),
    'download-gif': () => result.downloadGif(),
    'create-qr': () => result.handleCreateQr(),
    'finish-session': () => finishAndResetSession(),
    'download-current-result': () => result.downloadCurrentResult()
};

document.addEventListener('click', event => {
    const target = event.target.closest('[data-nav], [data-action]');
    if (!target) return;

    if (target.dataset.nav !== undefined) {
        navToStep(parseStep(target.dataset.nav));
        return;
    }

    const handler = actions[target.dataset.action];
    if (handler) handler(target);
});

// Initialize App
window.addEventListener('load', () => navToStep(1));
