const SECURITY_MESSAGE = 'Hasil foto tidak dapat diekspor karena pembatasan keamanan browser. Pastikan halaman dibuka lewat HTTPS atau localhost, lalu muat ulang halaman.';

export function toCanvasExportError(err) {
    const name = err && err.name;
    const message = err && typeof err.message === 'string' ? err.message : '';
    const isSecurity = name === 'SecurityError' || /insecure|tainted/i.test(message);
    if (isSecurity) {
        const wrapped = new Error(SECURITY_MESSAGE);
        wrapped.name = 'CanvasExportError';
        wrapped.cause = err;
        return wrapped;
    }
    return err instanceof Error ? err : new Error(String(err));
}

export function canvasToDataURL(canvas, type = 'image/png') {
    try {
        return canvas.toDataURL(type);
    } catch (err) {
        throw toCanvasExportError(err);
    }
}

export function canvasToBlob(canvas, type = 'image/png') {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Gagal menghasilkan file gambar.'));
            }, type);
        } catch (err) {
            reject(toCanvasExportError(err));
        }
    });
}
