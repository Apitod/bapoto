/**
 * BAPOTO.JO — Print Utility
 * 
 * Modul terisolasi untuk mencetak foto strip / hasil photobooth ke printer fisik (seperti Epson L210).
 * Menghilangkan masalah halaman kosong / blank page dengan memastikan:
 * 1. Gambar telah selesai di-load & di-decode ke memori browser sebelum dialog print muncul.
 * 2. Menggunakan iframe terisolasi berukuran penuh (100vw x 100vh) yang transparan sehingga engine Chromium
 *    dapat mengalkulasi layout cetak secara akurat tanpa terganggu DOM utama dashboard/booth.
 * 3. Mengatur CSS @page { size: auto; margin: 0; } untuk menghilangkan header/footer URL browser
 *    serta margin default browser yang merusak ukuran cetak kertas foto.
 * 4. Menyediakan fallback ke #print-area pada document utama jika iframe tidak diizinkan.
 */

/**
 * Preload dan decode gambar sebelum dikirim ke dialog printer.
 * @param {string} src - URL gambar (Data URL, Blob URL, atau HTTP/HTTPS URL)
 * @returns {Promise<HTMLImageElement>}
 */
export function preloadImage(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            return reject(new Error('URL gambar tidak tersedia untuk dicetak.'));
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = async () => {
            if ('decode' in img) {
                try {
                    await img.decode();
                } catch (_) {
                    // Non-fatal, onload sudah terverifikasi
                }
            }
            resolve(img);
        };

        img.onerror = () => {
            // Coba fallback tanpa crossOrigin jika CORS ditolak oleh storage CDN
            const fallbackImg = new Image();
            fallbackImg.onload = async () => {
                if ('decode' in fallbackImg) {
                    try {
                        await fallbackImg.decode();
                    } catch (_) {}
                }
                resolve(fallbackImg);
            };
            fallbackImg.onerror = () => reject(new Error('Gagal memuat gambar foto untuk dicetak.'));
            fallbackImg.src = src;
        };

        img.src = src;
    });
}

/**
 * Mencetak foto strip secara presisi dan bersih.
 * @param {string} imageUrl - URL gambar foto strip
 * @param {object} [options]
 * @param {string} [options.title='BAPOTO.JO — Cetak Foto']
 * @returns {Promise<boolean>}
 */
export async function printPhoto(imageUrl, options = {}) {
    const { title = 'BAPOTO.JO — Cetak Foto' } = options;

    if (!imageUrl) {
        throw new Error('Tidak ada gambar foto yang dapat dicetak.');
    }

    // 1. Pastikan gambar sudah berada di memori browser
    await preloadImage(imageUrl);

    return new Promise((resolve) => {
        // Hapus frame lama jika masih tertinggal
        const existingFrame = document.getElementById('bapoto-print-frame');
        if (existingFrame && existingFrame.parentNode) {
            existingFrame.parentNode.removeChild(existingFrame);
        }

        // Buat iframe terisolasi dengan viewport penuh (bukan 0x0 agar Chrome tidak menganggap blank)
        const iframe = document.createElement('iframe');
        iframe.id = 'bapoto-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.border = 'none';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';
        iframe.setAttribute('aria-hidden', 'true');

        document.body.appendChild(iframe);

        let isHandled = false;

        const cleanup = () => {
            if (isHandled) return;
            isHandled = true;
            setTimeout(() => {
                if (iframe && iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }, 1000);
        };

        try {
            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <style>
                        @page {
                            size: auto;
                            margin: 0mm;
                        }
                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                        }
                        html, body {
                            width: 100%;
                            height: 100%;
                            background: #ffffff !important;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-container {
                            width: 100vw;
                            height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 0;
                            margin: 0;
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }
                        img {
                            max-width: 100%;
                            max-height: 100%;
                            width: auto;
                            height: auto;
                            object-fit: contain;
                            display: block;
                            margin: auto;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <img id="print-target" src="${imageUrl}" alt="Print Out" />
                    </div>
                </body>
                </html>
            `);
            iframeDoc.close();

            const printImg = iframeDoc.getElementById('print-target');

            const triggerPrint = () => {
                setTimeout(() => {
                    try {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        cleanup();
                        resolve(true);
                    } catch (err) {
                        console.warn('Iframe print gagal, beralih ke direct print fallback:', err);
                        cleanup();
                        directPrintFallback(imageUrl).then(resolve);
                    }
                }, 200);
            };

            if (iframe.contentWindow) {
                iframe.contentWindow.onafterprint = () => {
                    cleanup();
                };
            }

            if (printImg && printImg.complete && printImg.naturalWidth > 0) {
                triggerPrint();
            } else if (printImg) {
                printImg.onload = triggerPrint;
                printImg.onerror = () => {
                    cleanup();
                    directPrintFallback(imageUrl).then(resolve);
                };
            } else {
                triggerPrint();
            }

            // Fallback timeout cleanup jika print dialog di-cancel tanpa event onafterprint
            setTimeout(cleanup, 60000);

        } catch (error) {
            console.warn('Iframe setup exception, beralih ke direct fallback:', error);
            cleanup();
            directPrintFallback(imageUrl).then(resolve);
        }
    });
}

/**
 * Fallback langsung via window.print() dengan memanfaatkan elemen #print-area pada main window.
 */
function directPrintFallback(imageUrl) {
    return new Promise((resolve) => {
        let printArea = document.getElementById('print-area');
        if (!printArea) {
            printArea = document.createElement('div');
            printArea.id = 'print-area';
            document.body.appendChild(printArea);
        }

        let printImage = document.getElementById('print-image');
        if (!printImage) {
            printImage = document.createElement('img');
            printImage.id = 'print-image';
            printImage.alt = 'Print Out';
            printArea.appendChild(printImage);
        }

        printImage.src = imageUrl;
        printArea.style.display = 'flex';
        printArea.classList.remove('hidden');

        const doPrint = () => {
            setTimeout(() => {
                window.focus();
                window.print();
                resolve(true);
            }, 150);
        };

        const onFinished = () => {
            printArea.style.display = 'none';
            printArea.classList.add('hidden');
            window.removeEventListener('afterprint', onFinished);
        };
        window.addEventListener('afterprint', onFinished);

        if (printImage.complete && printImage.naturalWidth > 0) {
            doPrint();
        } else {
            printImage.onload = doPrint;
            printImage.onerror = () => {
                onFinished();
                resolve(false);
            };
        }

        setTimeout(onFinished, 60000);
    });
}
