/**
 * Preset Layout Slot Foto untuk pembuatan Frame Baru oleh Admin.
 * Mengikuti konfigurasi proporsi yang sudah teruji pada frame eksisting BAPOTO.JO.
 */
export const LAYOUT_PRESETS = [
    {
        id: 'grid-4',
        name: '4 Pose — Grid 2x2 (Persegi)',
        poseCount: 4,
        gap: 0,
        aspectRatio: { width: 1204, height: 1795 },
        slots: [
            { x: 6.14, y: 24.70, w: 39.50, h: 22.60, shape: 'rect' },
            { x: 53.90, y: 24.70, w: 39.70, h: 22.60, shape: 'rect' },
            { x: 6.14, y: 52.40, w: 39.50, h: 22.60, shape: 'rect' },
            { x: 54.40, y: 52.40, w: 39.90, h: 22.62, shape: 'rect' }
        ]
    },
    {
        id: 'classic-strip-6',
        name: '6 Pose — Strip Klasik 2 Kolom (Gap 4px)',
        poseCount: 6,
        gap: 4,
        aspectRatio: { width: 1204, height: 1795 },
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
        id: 'combo-oval-rect-5',
        name: '5 Pose — Kombinasi Elips & Persegi',
        poseCount: 5,
        gap: 0,
        aspectRatio: { width: 1205, height: 1795 },
        slots: [
            { x: 6.06, y: 13.10, w: 39.30, h: 21.23, shape: 'rect' },
            { x: 60.00, y: 16.70, w: 30.00, h: 25.00, shape: 'ellipse' },
            { x: 6.06, y: 39.33, w: 39.40, h: 21.30, shape: 'rect' },
            { x: 60.00, y: 58.74, w: 30.00, h: 25.00, shape: 'ellipse' },
            { x: 6.69, y: 65.74, w: 39.40, h: 21.30, shape: 'rect' }
        ]
    },
    {
        id: 'retro-combo-6',
        name: '6 Pose — Retro (Kiri 3 Elips, Kanan 3 Persegi)',
        poseCount: 6,
        gap: 0,
        aspectRatio: { width: 1204, height: 1795 },
        slots: [
            { x: 9.55, y: 10.65, w: 30.73, h: 28.13, shape: 'ellipse' },
            { x: 9.55, y: 40.84, w: 30.73, h: 28.13, shape: 'ellipse' },
            { x: 9.55, y: 70.10, w: 30.73, h: 28.13, shape: 'ellipse' },
            { x: 58.72, y: 13.48, w: 34.22, h: 22.40, shape: 'rect' },
            { x: 58.72, y: 43.12, w: 34.22, h: 22.40, shape: 'rect' },
            { x: 58.72, y: 72.92, w: 34.22, h: 22.40, shape: 'rect' }
        ]
    },
    {
        id: 'staggered-6',
        name: '6 Pose — Selang-Seling Kiri Kanan',
        poseCount: 6,
        gap: 0,
        aspectRatio: { width: 1204, height: 1795 },
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
        id: 'grid-8',
        name: '8 Pose — Grid Rapat 4 Baris x 2 Kolom',
        poseCount: 8,
        gap: 0,
        aspectRatio: { width: 1205, height: 1795 },
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
    }
];
