/** Unduh data URL / blob URL sebagai file lewat elemen <a download>. */
export function triggerDownload(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/** Nama file hasil (format lama dipertahankan). */
export function resultFilename(ext) {
    return `bapotojo_photobooth_${Date.now()}.${ext}`;
}
