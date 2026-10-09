/** Filter Canvas (CSS filter string). Dipindahkan apa adanya dari index.html lama. */
export const FILTERS = [
    { id: 'normal', name: 'Normal', css: 'none' },
    { id: 'bw-classic', name: 'BW Classic', css: 'grayscale(100%)' },
    { id: 'bw-noir', name: 'BW Noir', css: 'grayscale(100%) contrast(150%) brightness(90%)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(60%) contrast(110%) brightness(90%)' },
    { id: 'warm-glow', name: 'Warm Glow', css: 'saturate(150%) sepia(30%)' },
    { id: 'cool-breeze', name: 'Cool Breeze', css: 'hue-rotate(30deg) saturate(120%) brightness(110%)' },
    { id: 'dramatic', name: 'Dramatic', css: 'contrast(160%) saturate(120%)' },
    { id: 'retro-pop', name: 'Retro Pop', css: 'saturate(200%) contrast(130%)' }
];

/** Mengembalikan CSS filter untuk id tertentu, atau 'none' bila tidak ditemukan. */
export function getFilterCss(filterId) {
    const filterObj = FILTERS.find(f => f.id === filterId);
    return filterObj ? filterObj.css : 'none';
}
