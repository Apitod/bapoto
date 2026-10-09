/**
 * Alur pengambilan foto (Step 4): countdown, snapshot Photo Strip,
 * dan rekaman frame untuk GIF. Perilaku identik dengan index.html lama.
 */
import { state } from './state.js';
import { playShutterSound } from '../core/audio.js';
import { alertToast } from '../ui/toast.js';
import {
    COUNTDOWN_SECONDS,
    MAX_PHOTO_CAPTURE_WIDTH,
    PHOTO_JPEG_QUALITY,
    GIF_DURATION_MS,
    GIF_INTERVAL_MS,
    GIF_CAPTURE_W,
    GIF_CAPTURE_JPEG_QUALITY,
    RING_LEN
} from '../config/capture.js';

/**
 * @param {object} deps
 * @param {ReturnType<import('../core/camera.js').createCamera>} deps.camera
 * @param {HTMLVideoElement} deps.video
 * @param {() => void} deps.onComplete  dipanggil saat semua pose / rekaman selesai
 */
export function createCaptureController({ camera, video, onComplete }) {
    const el = {
        btn: document.getElementById('btn-capture'),
        overlay: document.getElementById('countdown-overlay'),
        countText: document.getElementById('countdown-text'),
        flash: document.getElementById('flash-overlay'),
        canvas: document.getElementById('capture-canvas'),
        poseCounter: document.getElementById('pose-counter'),
        ring: document.getElementById('gif-ring'),
        ringProgress: document.getElementById('gif-ring-progress'),
        recBadge: document.getElementById('rec-badge'),
        recTimer: document.getElementById('rec-timer')
    };

    function updatePoseCounter() {
        if (state.selectedFormat === 'gif') {
            el.poseCounter.innerText = 'GIF 7s';
            return;
        }
        const max = state.selectedFrame ? state.selectedFrame.poseCount : 0;
        el.poseCounter.innerText = `${state.capturedPhotos.length}/${max}`;
    }

    function startCapture() {
        const btn = el.btn;
        if (btn.disabled) return;
        btn.disabled = true;

        el.overlay.classList.remove('hidden');
        let count = COUNTDOWN_SECONDS;

        const animateCount = () => {
            el.countText.innerText = count;
            el.countText.classList.remove('animate-countdown');
            void el.countText.offsetWidth; // trigger reflow
            el.countText.classList.add('animate-countdown');
        };

        animateCount();

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                animateCount();
            } else {
                clearInterval(timer);
                el.overlay.classList.add('hidden');
                if (state.selectedFormat === 'gif') {
                    startGifRecording(); // tombol tetap disabled sampai rekaman selesai
                } else {
                    executeSnapshot();
                    btn.disabled = false;
                }
            }
        }, 1000);
    }

    function executeSnapshot() {
        const canvas = el.canvas;
        const ctx = canvas.getContext('2d');

        // Flash effect
        el.flash.style.opacity = '1';
        setTimeout(() => (el.flash.style.opacity = '0'), 150);
        playShutterSound();

        const sourceW = video.videoWidth || 1280;
        const sourceH = video.videoHeight || 720;
        const w = Math.min(sourceW, MAX_PHOTO_CAPTURE_WIDTH);
        const h = Math.round(w * sourceH / sourceW);

        canvas.width = w;
        canvas.height = h;

        if (video.readyState === 4) {
            camera.drawTo(ctx, w, h);
        } else {
            // Fallback bila kamera tidak memberi sinyal (perilaku lama)
            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 50px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NO CAMERA SIGNAL', w / 2, h / 2);
        }

        state.capturedPhotos.push(canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY));
        updatePoseCounter();

        if (state.capturedPhotos.length >= state.selectedFrame.poseCount) {
            setTimeout(onComplete, 600);
        }
    }

    function startGifRecording() {
        const btn = el.btn;
        if (!camera.isReady()) {
            alertToast('Kamera belum siap. Coba lagi.');
            btn.disabled = false;
            return;
        }

        const myId = ++state.recordId;
        const cw = GIF_CAPTURE_W;
        const ch = Math.round(cw * video.videoHeight / video.videoWidth);
        const c = document.createElement('canvas');
        c.width = cw;
        c.height = ch;
        const cctx = c.getContext('2d');

        state.gifFrames = [];
        el.ring.classList.remove('hidden');
        el.recBadge.classList.remove('hidden');
        el.ringProgress.style.transition = 'none';
        el.ringProgress.style.strokeDashoffset = RING_LEN;
        void el.ringProgress.getBoundingClientRect();
        el.ringProgress.style.transition = `stroke-dashoffset ${GIF_DURATION_MS}ms linear`;
        el.ringProgress.style.strokeDashoffset = 0;

        const startTime = performance.now();
        let tid;

        const finish = (ok) => {
            clearTimeout(tid);
            if (myId !== state.recordId) return;
            el.ring.classList.add('hidden');
            el.recBadge.classList.add('hidden');
            btn.disabled = false;
            if (ok && state.currentStep === 4) {
                playShutterSound();
                setTimeout(onComplete, 300);
            } else {
                state.gifFrames = [];
            }
        };

        const tick = () => {
            if (myId !== state.recordId) return;
            if (state.currentStep !== 4 || !camera.stream) { finish(false); return; }

            const elapsed = performance.now() - startTime;
            camera.drawTo(cctx, cw, ch);
            state.gifFrames.push(c.toDataURL('image/jpeg', GIF_CAPTURE_JPEG_QUALITY));
            el.recTimer.innerText = Math.min(7, Math.round(elapsed / 1000));

            const remain = GIF_DURATION_MS - elapsed;
            if (remain <= GIF_INTERVAL_MS) {
                tid = setTimeout(() => finish(true), Math.max(remain, 0));
            } else {
                tid = setTimeout(tick, GIF_INTERVAL_MS);
            }
        };
        tick();
    }

    return { startCapture, updatePoseCounter };
}
