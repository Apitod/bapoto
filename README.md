# BAPOTO.JO — Web Photobooth

Photobooth berbasis browser: pembayaran QRIS (konfirmasi manual), Photo Strip (PNG) dan Animated GIF, 8 frame, filter, dan download.

> **Status:** Tahap 1 — refactor ke Vite + Vanilla JS (ES Modules). Belum ada backend, QR download, atau dashboard admin. Lihat [Context/BAPOTO_JO_PROJECT_ROADMAP.md](Context/BAPOTO_JO_PROJECT_ROADMAP.md).

## Kebutuhan

- Node.js ≥ 18 (sudah diuji dengan Node 18.19 / npm 9.2)
- Browser modern dengan `getUserMedia` (Chrome / Edge / Safari terbaru)

## Menjalankan

```bash
npm install
npm run dev       # dev server di http://localhost:5173
npm run build     # build production ke dist/
npm run preview   # sajikan dist/ di http://localhost:4173
```

> Kamera hanya bisa diakses di **`localhost`** atau **HTTPS**. Akses lewat IP LAN (mis. `http://192.168.x.x:5173` dari tablet) akan diblokir browser karena bukan HTTPS.

## Struktur

```text
index.html                 Markup kiosk (step 1–5)
public/
  assets/qris-bapotojo.jpeg
  frames/frame1..8.png     Overlay frame (disajikan apa adanya)
src/
  main.js                  Entry: navigasi step + event delegation
  styles/main.css          Tailwind + style neo-brutalist
  config/
    frames.js              8 frame: aspect ratio, slot (%), bentuk, gap
    filters.js             8 filter Canvas
    capture.js             Konstanta countdown / kualitas / GIF
  core/                    Logic tanpa ketergantungan UI
    camera.js              getUserMedia, mirror, switch kamera
    canvasRenderer.js      drawImageCover, clip rect/ellipse, Photo Strip
    gifRenderer.js         Komposisi frame + encode gifshot
    imageLoader.js         Loader gambar + cache
    audio.js               Suara shutter (Web Audio)
  booth/                   Controller UI kiosk
    state.js  capture.js  result.js  frameCatalog.js  filterPicker.js
  ui/toast.js
  utils/download.js  utils/html.js
legacy/index.original.html Versi single-file asli (referensi, tidak di-build)
```

## Deploy ke Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Belum ada environment variable yang dibutuhkan pada tahap ini.

## Checklist uji manual (regresi)

Jalankan `npm run build && npm run preview`, lalu:

1. Landing tampil dengan gaya neo-brutalist & font Space Grotesk.
2. START SESSION → QRIS tampil → KEMBALI kembali ke landing.
3. SAYA SUDAH BAYAR → PILIH FORMAT → KEMBALI kembali ke QRIS.
4. Photo Strip → 8 frame tampil dengan nama & jumlah pose yang benar.
5. Pilih frame → kamera menyala, counter `0/N`.
6. Mirror & switch kamera berfungsi (mirror otomatis mati di kamera belakang).
7. Ambil N foto (countdown 3-2-1, flash, suara) → otomatis ke FINALIZE.
8. Hasil sesuai slot (cek frame dengan slot elips: 2, 3, 4, 8).
9. Ganti filter → hasil di-render ulang.
10. SIMPAN → file `bapotojo_photobooth_<timestamp>.png` terunduh.
11. ULANG → pilih Animated GIF → rekam 7 detik → GIF ter-render → SIMPAN GIF.
12. Kembali ke HOME → kamera mati (lampu indikator kamera padam).
13. Matikan internet, reload → aplikasi tetap tampil normal (tidak ada CDN).
