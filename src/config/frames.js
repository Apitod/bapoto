/**
 * FRAME DATABASE
 * Dipindahkan apa adanya dari index.html lama (legacy/index.original.html).
 *
 * Setiap slot didefinisikan dalam persentase (0-100) terhadap ukuran frame
 * agar foto bisa digambar presisi di slot yang benar.
 *
 * `gap` (px, pada resolusi asli frame) menggantikan rantai if/else per-frame
 * di renderFinalPhotobooth lama. Nilainya identik: frame-1 = 4, lainnya = 0.
 * Slot diperluas `gap` px ke segala arah sebelum di-clip.
 *
 * JANGAN mengubah koordinat tanpa memverifikasi ulang hasil render.
 */
export const frameDatabase = [
    {
        id: 'frame-1',
        name: 'Classic Strip',
        previewUrl: '/frames/frame1.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 4,
        slots: [
            { x: 5.49, y: 3.18, w: 40.75, h: 24.01, shape: 'rect' },
            { x: 53.94, y: 3.18, w: 40.75, h: 24.01, shape: 'rect' },

            { x: 5.49, y: 31.12, w: 40.75, h: 24.01, shape: 'rect' },
            { x: 53.94, y: 31.12, w: 40.75, h: 24.01, shape: 'rect' },

            { x: 5.49, y: 58.77, w: 40.75, h: 24.01, shape: 'rect' },
            { x: 53.94, y: 58.77, w: 40.75, h: 24.01, shape: 'rect' }
        ]
    },
    {
        id: 'frame-2',
        name: 'Polka Retro',
        previewUrl: '/frames/frame2.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            // KIRI (Elips) - Digeser ke kanan sedikit dan agak turun
            { x: 9.55, y: 10.65, w: 30.73, h: 28.13, shape: 'ellipse' },
            { x: 9.55, y: 40.84, w: 30.73, h: 28.13, shape: 'ellipse' },
            { x: 9.55, y: 70.10, w: 30.73, h: 28.13, shape: 'ellipse' },

            // KANAN (Persegi) - Digeser lebih ke kanan dan mulai lebih bawah
            { x: 58.72, y: 13.48, w: 34.22, h: 22.40, shape: 'rect' },
            { x: 58.72, y: 43.12, w: 34.22, h: 22.40, shape: 'rect' },
            { x: 58.72, y: 72.92, w: 34.22, h: 22.40, shape: 'rect' }
        ]
    },
    {
        id: 'frame-3',
        name: 'Vintage Line',
        previewUrl: '/frames/frame3.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 5,
        gap: 0,
        slots: [
            { x: 9, y: 4.96, w: 34.50, h: 23.12, shape: 'rect' },
            { x: 56.23, y: 8.20, w: 37.54, h: 31.60, shape: 'ellipse' },
            { x: 9, y: 32.14, w: 34.88, h: 23.12, shape: 'rect' },
            { x: 56.23, y: 48.25, w: 37.54, h: 31.60, shape: 'ellipse' },
            { x: 9, y: 59.11, w: 34.88, h: 23.12, shape: 'rect' }
        ]
    },
    {
        id: 'frame-4',
        name: 'Pink Ribbon',
        previewUrl: '/frames/frame4.png',
        aspectRatio: { width: 1205, height: 1795 },
        poseCount: 5,
        gap: 0,
        slots: [
            { x: 6.06, y: 13.10, w: 39.30, h: 21.23, shape: 'rect' },
            { x: 60, y: 16.70, w: 30, h: 25, shape: 'ellipse' },
            { x: 6.06, y: 39.33, w: 39.40, h: 21.30, shape: 'rect' },
            { x: 60, y: 58.74, w: 30, h: 25, shape: 'ellipse' },
            { x: 6.69, y: 65.74, w: 39.40, h: 21.30, shape: 'rect' }
        ]
    },
    {
        id: 'frame-5',
        name: 'Sunday Morning',
        previewUrl: '/frames/frame5.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            { x: 7.14, y: 11.03, w: 36.21, h: 19.40, shape: 'rect' },
            { x: 57.14, y: 20.72, w: 36.21, h: 19.50, shape: 'rect' },
            { x: 7.14, y: 33.42, w: 36.21, h: 19.50, shape: 'rect' },
            { x: 57.14, y: 46.23, w: 36.21, h: 19.50, shape: 'rect' },
            { x: 7.14, y: 56.00, w: 36.21, h: 19.50, shape: 'rect' },
            { x: 57.14, y: 71.60, w: 36.21, h: 19.50, shape: 'rect' }
        ]
    },
    {
        id: 'frame-6',
        name: 'Script Grid',
        previewUrl: '/frames/frame6.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 4,
        gap: 0,
        slots: [
            { x: 6.14, y: 24.70, w: 39.50, h: 22.60, shape: 'rect' },
            { x: 53.90, y: 24.70, w: 39.70, h: 22.60, shape: 'rect' },
            { x: 6.14, y: 52.40, w: 39.50, h: 22.60, shape: 'rect' },
            { x: 54.40, y: 52.40, w: 39.90, h: 22.62, shape: 'rect' }
        ]
    },
    {
        id: 'frame-7',
        name: 'Brown Leopard',
        previewUrl: '/frames/frame7.png',
        aspectRatio: { width: 1205, height: 1795 },
        poseCount: 8,
        gap: 0,
        slots: [
            { x: 8.71, y: 5.80, w: 34.02, h: 18.94, shape: 'rect' },
            { x: 59.70, y: 7.07, w: 33.44, h: 18.21, shape: 'rect' },
            { x: 8.71, y: 26.01, w: 34.02, h: 18.94, shape: 'rect' },
            { x: 59.70, y: 27.07, w: 33.44, h: 18.21, shape: 'rect' },
            { x: 8.71, y: 46.23, w: 34.02, h: 18.94, shape: 'rect' },
            { x: 59.70, y: 46.60, w: 33.52, h: 18.21, shape: 'rect' },
            { x: 8.71, y: 66.50, w: 34.02, h: 18.94, shape: 'rect' },
            { x: 59.70, y: 66.40, w: 33.44, h: 18.40, shape: 'rect' }
        ]
    },
    {
        id: 'frame-8',
        name: 'Morning Miles',
        previewUrl: '/frames/frame8.png',
        aspectRatio: { width: 1205, height: 1795 },
        poseCount: 5,
        gap: 0,
        slots: [
            { x: 6.10, y: 4.20, w: 37.70, h: 25.34, shape: 'rect' },
            { x: 57.10, y: 12.31, w: 40.83, h: 34.32, shape: 'ellipse' },
            { x: 6.10, y: 32.31, w: 37.70, h: 25.34, shape: 'rect' },
            { x: 57.10, y: 51.50, w: 40.83, h: 34.32, shape: 'ellipse' },
            { x: 6.10, y: 60.50, w: 37.70, h: 25.29, shape: 'rect' }
        ]
    },
    {
        id: 'frame-14',
        name: 'FEB Gold Strip',
        previewUrl: '/frames/14.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            // Kolom Kiri
            { x: 3.0, y: 6.0,  w: 33.5, h: 26.5, shape: 'rect' },
            { x: 3.0, y: 36.0, w: 33.5, h: 26.5, shape: 'rect' },
            { x: 3.0, y: 65.5, w: 33.5, h: 22.0, shape: 'rect' },
            // Kolom Kanan
            { x: 53.5, y: 4.5,  w: 43.0, h: 26.5, shape: 'rect' },
            { x: 53.5, y: 35.0, w: 43.0, h: 26.5, shape: 'rect' },
            { x: 53.5, y: 64.5, w: 43.0, h: 23.5, shape: 'rect' }
        ]
    },
    {
        id: 'frame-15',
        name: 'FEB Red Classic',
        previewUrl: '/frames/15.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            // Kolom Kiri (header logo ~21% dari atas)
            { x: 3.5, y: 22.0, w: 33.5, h: 22.5, shape: 'rect' },
            { x: 3.5, y: 47.0, w: 33.5, h: 22.5, shape: 'rect' },
            { x: 3.5, y: 72.0, w: 33.5, h: 19.5, shape: 'rect' },
            // Kolom Kanan
            { x: 53.5, y: 22.0, w: 43.0, h: 22.5, shape: 'rect' },
            { x: 53.5, y: 47.0, w: 43.0, h: 22.5, shape: 'rect' },
            { x: 53.5, y: 72.0, w: 43.0, h: 19.5, shape: 'rect' }
        ]
    },
    {
        id: 'frame-16',
        name: 'FEB Lime Twist',
        previewUrl: '/frames/16.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            // Kolom Kiri (1 foto besar per row)
            { x: 3.0, y: 5.0,  w: 33.5, h: 27.0, shape: 'rect' },
            { x: 3.0, y: 35.5, w: 33.5, h: 27.0, shape: 'rect' },
            { x: 3.0, y: 65.5, w: 33.5, h: 27.0, shape: 'rect' },
            // Kolom Kanan (3 foto berbeda ukuran)
            { x: 53.5, y: 3.5,  w: 43.5, h: 22.0, shape: 'rect' },
            { x: 53.5, y: 33.0, w: 43.5, h: 27.5, shape: 'rect' },
            { x: 53.5, y: 62.5, w: 43.5, h: 27.5, shape: 'rect' }
        ]
    },
    {
        id: 'frame-17',
        name: 'FEB Ticket Stub',
        previewUrl: '/frames/17.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            // Kolom Kiri (area foto di tengah, header atas ~20%, barcode bawah ~15%)
            { x: 2.5, y: 22.5, w: 31.5, h: 21.0, shape: 'rect' },
            { x: 2.5, y: 45.5, w: 31.5, h: 22.0, shape: 'rect' },
            { x: 2.5, y: 69.5, w: 31.5, h: 22.0, shape: 'rect' },
            // Kolom Kanan
            { x: 43.0, y: 22.5, w: 55.0, h: 21.0, shape: 'rect' },
            { x: 43.0, y: 45.5, w: 55.0, h: 22.0, shape: 'rect' },
            { x: 43.0, y: 69.5, w: 55.0, h: 22.0, shape: 'rect' }
        ]
    },
    {
        id: 'frame-18',
        name: 'Dies Feb Stamp',
        previewUrl: '/frames/18.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 8,
        gap: 0,
        slots: [
            // Kolom Kiri - 4 foto (header "Dies Feb" ~22%, footer bintang ~18%)
            { x: 4.5, y: 22.5, w: 27.5, h: 16.5, shape: 'rect' },
            { x: 4.5, y: 40.5, w: 27.5, h: 15.5, shape: 'rect' },
            { x: 4.5, y: 57.5, w: 27.5, h: 15.5, shape: 'rect' },
            { x: 4.5, y: 74.0, w: 27.5, h: 8.0,  shape: 'rect' },
            // Kolom Kanan - 4 foto
            { x: 54.0, y: 22.5, w: 43.0, h: 16.5, shape: 'rect' },
            { x: 54.0, y: 40.5, w: 43.0, h: 15.5, shape: 'rect' },
            { x: 54.0, y: 57.5, w: 43.0, h: 15.5, shape: 'rect' },
            { x: 54.0, y: 74.0, w: 43.0, h: 8.0,  shape: 'rect' }
        ]
    },
    {
        id: 'frame-19',
        name: 'Black Heart Punk',
        previewUrl: '/frames/19.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        slots: [
            // Kolom Kiri - 3 hati (ellipse vertikal)
            { x: 2.0,  y: 2.5,  w: 41.0, h: 27.5, shape: 'ellipse' },
            { x: 2.0,  y: 34.5, w: 41.0, h: 27.5, shape: 'ellipse' },
            { x: 2.0,  y: 66.5, w: 41.0, h: 27.5, shape: 'ellipse' },
            // Kolom Kanan - 3 persegi (strip foto hitam)
            { x: 52.0, y: 4.5,  w: 46.0, h: 27.0, shape: 'rect' },
            { x: 52.0, y: 35.0, w: 46.0, h: 26.5, shape: 'rect' },
            { x: 52.0, y: 64.5, w: 46.0, h: 26.5, shape: 'rect' }
        ]
    }
];
