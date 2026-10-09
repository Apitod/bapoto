/** State aplikasi photobooth (setara objek `state` di index.html lama). */
export const state = {
    currentStep: 1,
    selectedFrame: null,
    selectedFormat: 'photo', // 'photo' | 'gif'
    selectedFilter: 'normal',
    capturedPhotos: [],      // data URL JPEG per pose (Photo Strip)
    gifFrames: [],           // data URL JPEG per frame rekaman (GIF)
    gifUrl: null,            // data URL GIF hasil akhir
    recordId: 0,             // token pembatalan rekaman GIF
    renderToken: 0,          // token pembatalan render hasil
    renderTimer: null
};

/** Reset data tangkapan saat masuk ke layar kamera. */
export function resetCaptureData() {
    state.capturedPhotos = [];
    state.gifFrames = [];
    state.gifUrl = null;
    state.renderToken++;
}
