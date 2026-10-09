/**
 * Pengelolaan kamera browser (getUserMedia), mirror, dan switch kamera.
 * Perilaku identik dengan index.html lama.
 */

export function createCamera(videoEl) {
    const cam = {
        stream: null,
        facingMode: 'user',
        isMirrored: true,

        /** Mirror hanya berlaku untuk kamera depan. */
        get shouldMirror() {
            return cam.isMirrored && cam.facingMode === 'user';
        },

        /** @returns {Promise<boolean>} true bila stream berhasil didapat */
        async start() {
            try {
                if (cam.stream) cam.stop();

                const constraints = {
                    video: { facingMode: cam.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                };

                cam.stream = await navigator.mediaDevices.getUserMedia(constraints);
                videoEl.srcObject = cam.stream;
                videoEl.style.backgroundColor = '';
                cam.applyMirror();
                return true;
            } catch (err) {
                console.error('Camera error:', err);
                // Feedback visual untuk testing tanpa kamera (perilaku lama)
                videoEl.style.backgroundColor = '#FF2A7A';
                return false;
            }
        },

        stop() {
            if (cam.stream) {
                cam.stream.getTracks().forEach(track => track.stop());
                cam.stream = null;
            }
        },

        applyMirror() {
            videoEl.style.transform = cam.shouldMirror ? 'scaleX(-1)' : 'scaleX(1)';
        },

        toggleMirror() {
            cam.isMirrored = !cam.isMirrored;
            cam.applyMirror();
        },

        /** Ganti depan/belakang. Mirror otomatis mati untuk kamera belakang. */
        switch() {
            cam.facingMode = cam.facingMode === 'user' ? 'environment' : 'user';
            cam.isMirrored = cam.facingMode === 'user';
            return cam.start();
        },

        /** Kamera siap diambil gambarnya (dipakai untuk rekaman GIF). */
        isReady() {
            return !!cam.stream && !!videoEl.videoWidth && videoEl.readyState >= 2;
        },

        /** Gambar frame video saat ini ke canvas (dengan mirror bila aktif). */
        drawTo(ctx, w, h) {
            ctx.save();
            if (cam.shouldMirror) {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(videoEl, 0, 0, w, h);
            ctx.restore();
        }
    };

    return cam;
}
