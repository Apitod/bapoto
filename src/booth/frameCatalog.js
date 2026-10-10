/** Render katalog frame (Step 3). Markup identik dengan versi lama. */
import { escapeHtml } from '../utils/html.js';

// Fallback lokal pengganti placehold.co (tidak butuh internet).
const FRAME_FALLBACK_SRC = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
    '<rect width="400" height="600" fill="#F4F4F0"/>' +
    '<text x="200" y="300" font-family="sans-serif" font-size="28" font-weight="700" fill="#111111" text-anchor="middle">Frame Preview</text>' +
    '</svg>'
);

/**
 * @param {HTMLElement} container
 * @param {object[]} frames
 * @param {(frame: object) => void} onSelect
 */
export function renderFrameCatalog(container, frames, onSelect) {
    container.innerHTML = '';

    frames.forEach(frame => {
        const card = document.createElement('div');
        card.className = 'card-brutal frame-card-hover bg-white p-3 flex flex-col group cursor-pointer h-full';
        card.dataset.frameId = frame.id;
        card.onclick = () => onSelect(frame);

        const name = escapeHtml(frame.name);
        card.innerHTML = `
            <div class="w-full bg-gray-100 border-brutal aspect-[2/3] flex items-center justify-center overflow-hidden mb-4 relative">
                <img src="${escapeHtml(frame.previewUrl)}" alt="${name}" crossorigin="anonymous" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                <div class="absolute top-2 right-2 bg-brutalYellow border-2 border-brutalDark px-2 py-1 text-xs font-black shadow-neo-hover">
                    ${Number(frame.poseCount)} POSE
                </div>
            </div>
            <div class="mt-auto">
                <h3 class="font-black text-lg uppercase truncate mb-3">${name}</h3>
                <button class="btn-brutal bg-brutalDark text-white w-full py-2 font-bold text-sm pointer-events-none">PILIH FRAME</button>
            </div>
        `;

        const img = card.querySelector('img');
        img.addEventListener('error', () => {
            img.onerror = null;
            if (img.src !== FRAME_FALLBACK_SRC) img.src = FRAME_FALLBACK_SRC;
        }, { once: true });

        container.appendChild(card);
    });
}
