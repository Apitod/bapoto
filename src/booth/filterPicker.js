/** Render pilihan filter (Step 5). Markup identik dengan versi lama. */
import { FILTERS } from '../config/filters.js';

function swatchColor(id) {
    // Ikon visual simulasi untuk filter
    let filterColor = '#ccc';
    if (id.includes('bw')) filterColor = '#444';
    if (id.includes('warm') || id.includes('vintage')) filterColor = '#d97706';
    if (id.includes('cool')) filterColor = '#0284c7';
    if (id.includes('pink') || id.includes('pop')) filterColor = '#FF2A7A';
    return filterColor;
}

/**
 * @param {HTMLElement} container
 * @param {string} selectedId
 * @param {(filterId: string) => void} onSelect
 */
export function renderFilters(container, selectedId, onSelect) {
    container.innerHTML = '';

    FILTERS.forEach(f => {
        const isSelected = selectedId === f.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.filterId = f.id;
        btn.className = `btn-brutal px-3 py-4 flex flex-col items-center justify-center gap-2 ${isSelected ? 'bg-brutalDark text-white' : 'bg-white text-brutalDark'}`;
        btn.onclick = () => onSelect(f.id);

        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full border-2 border-current" style="background-color: ${swatchColor(f.id)}; filter: ${f.css !== 'none' ? f.css : ''}"></div>
            <span class="font-bold text-xs uppercase text-center">${f.name}</span>
        `;
        container.appendChild(btn);
    });
}
