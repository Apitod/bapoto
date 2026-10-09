/**
 * Script upload frame 14-19 ke Supabase via REST API (tanpa WebSocket).
 * Jalankan: node scripts/seed-frames.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SUPABASE_URL = 'https://plycpimieyouteywwvre.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QpWRDSjCmi_HmVLKSmfUYA_adpHqRYe';

const FRAMES_TO_SEED = [
    {
        id: 'feb-frame-1',
        name: 'FEB Frame 1',
        file: '14.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        isActive: true,
        slots: [
            { x: 3.0,  y: 6.0,  w: 33.5, h: 26.5, shape: 'rect' },
            { x: 3.0,  y: 36.0, w: 33.5, h: 26.5, shape: 'rect' },
            { x: 3.0,  y: 65.5, w: 33.5, h: 22.0, shape: 'rect' },
            { x: 53.5, y: 4.5,  w: 43.0, h: 26.5, shape: 'rect' },
            { x: 53.5, y: 35.0, w: 43.0, h: 26.5, shape: 'rect' },
            { x: 53.5, y: 64.5, w: 43.0, h: 23.5, shape: 'rect' }
        ]
    },
    {
        id: 'feb-frame-2',
        name: 'FEB Frame 2',
        file: '15.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        isActive: true,
        slots: [
            { x: 3.5,  y: 22.0, w: 33.5, h: 22.5, shape: 'rect' },
            { x: 3.5,  y: 47.0, w: 33.5, h: 22.5, shape: 'rect' },
            { x: 3.5,  y: 72.0, w: 33.5, h: 19.5, shape: 'rect' },
            { x: 53.5, y: 22.0, w: 43.0, h: 22.5, shape: 'rect' },
            { x: 53.5, y: 47.0, w: 43.0, h: 22.5, shape: 'rect' },
            { x: 53.5, y: 72.0, w: 43.0, h: 19.5, shape: 'rect' }
        ]
    },
    {
        id: 'feb-frame-3',
        name: 'FEB Frame 3',
        file: '16.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        isActive: true,
        slots: [
            { x: 3.0,  y: 5.0,  w: 33.5, h: 27.0, shape: 'rect' },
            { x: 3.0,  y: 35.5, w: 33.5, h: 27.0, shape: 'rect' },
            { x: 3.0,  y: 65.5, w: 33.5, h: 27.0, shape: 'rect' },
            { x: 53.5, y: 3.5,  w: 43.5, h: 22.0, shape: 'rect' },
            { x: 53.5, y: 33.0, w: 43.5, h: 27.5, shape: 'rect' },
            { x: 53.5, y: 62.5, w: 43.5, h: 27.5, shape: 'rect' }
        ]
    },
    {
        id: 'feb-frame-4',
        name: 'FEB Frame 4',
        file: '17.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        isActive: true,
        slots: [
            { x: 2.5,  y: 22.5, w: 31.5, h: 21.0, shape: 'rect' },
            { x: 2.5,  y: 45.5, w: 31.5, h: 22.0, shape: 'rect' },
            { x: 2.5,  y: 69.5, w: 31.5, h: 22.0, shape: 'rect' },
            { x: 43.0, y: 22.5, w: 55.0, h: 21.0, shape: 'rect' },
            { x: 43.0, y: 45.5, w: 55.0, h: 22.0, shape: 'rect' },
            { x: 43.0, y: 69.5, w: 55.0, h: 22.0, shape: 'rect' }
        ]
    },
    {
        id: 'feb-frame-5',
        name: 'FEB Frame 5',
        file: '18.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 8,
        gap: 0,
        isActive: true,
        slots: [
            { x: 4.5,  y: 22.5, w: 27.5, h: 16.5, shape: 'rect' },
            { x: 4.5,  y: 40.5, w: 27.5, h: 15.5, shape: 'rect' },
            { x: 4.5,  y: 57.5, w: 27.5, h: 15.5, shape: 'rect' },
            { x: 4.5,  y: 74.0, w: 27.5, h: 8.0,  shape: 'rect' },
            { x: 54.0, y: 22.5, w: 43.0, h: 16.5, shape: 'rect' },
            { x: 54.0, y: 40.5, w: 43.0, h: 15.5, shape: 'rect' },
            { x: 54.0, y: 57.5, w: 43.0, h: 15.5, shape: 'rect' },
            { x: 54.0, y: 74.0, w: 43.0, h: 8.0,  shape: 'rect' }
        ]
    },
    {
        id: 'feb-frame-6',
        name: 'FEB Frame 6',
        file: '19.png',
        aspectRatio: { width: 1204, height: 1795 },
        poseCount: 6,
        gap: 0,
        isActive: true,
        slots: [
            { x: 2.0,  y: 2.5,  w: 41.0, h: 27.5, shape: 'ellipse' },
            { x: 2.0,  y: 34.5, w: 41.0, h: 27.5, shape: 'ellipse' },
            { x: 2.0,  y: 66.5, w: 41.0, h: 27.5, shape: 'ellipse' },
            { x: 52.0, y: 4.5,  w: 46.0, h: 27.0, shape: 'rect' },
            { x: 52.0, y: 35.0, w: 46.0, h: 26.5, shape: 'rect' },
            { x: 52.0, y: 64.5, w: 46.0, h: 26.5, shape: 'rect' }
        ]
    }
];

async function uploadToStorage(id, fileBuffer) {
    const storagePath = `${id}.png`;
    const url = `${SUPABASE_URL}/storage/v1/object/frames/${storagePath}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'image/png',
            'x-upsert': 'true'
        },
        body: fileBuffer
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Storage upload failed [${res.status}]: ${body}`);
    }

    // Public URL format
    return `${SUPABASE_URL}/storage/v1/object/public/frames/${storagePath}`;
}

async function upsertDatabase(frame, publicUrl) {
    const url = `${SUPABASE_URL}/rest/v1/frames`;

    const record = {
        id: frame.id,
        name: frame.name,
        preview_url: publicUrl,
        aspect_ratio: frame.aspectRatio,
        pose_count: frame.poseCount,
        gap: frame.gap,
        slots: frame.slots,
        is_active: frame.isActive
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(record)
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`DB insert failed [${res.status}]: ${body}`);
    }
}

async function seedFrames() {
    console.log('🚀 Mulai upload frames ke Supabase...\n');

    for (const frame of FRAMES_TO_SEED) {
        process.stdout.write(`📤 ${frame.name} (${frame.file})... `);

        try {
            const imagePath = resolve(ROOT, 'frames', frame.file);
            const imageBuffer = readFileSync(imagePath);

            const publicUrl = await uploadToStorage(frame.id, imageBuffer);
            process.stdout.write(`storage ✓  `);

            await upsertDatabase(frame, publicUrl);
            console.log(`db ✓`);

        } catch (err) {
            console.log(`\n   ❌ ${err.message}`);
        }
    }

    console.log('\n✨ Selesai! Refresh admin dashboard untuk melihat frame baru.');
}

seedFrames();
