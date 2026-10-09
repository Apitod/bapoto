# BAPOTO.JO — Next-Gen Web Photobooth

Aplikasi photobooth modern berbasis web: pembayaran QRIS (konfirmasi manual), Photo Strip (PNG) & Animated GIF, 8 frame eksisting, Canvas rendering, distribusi foto otomatis via QR Code & Cloud Storage (Supabase Free Tier), serta Dashboard Admin terpisah untuk operator cetak foto.

Lihat juga perencanaan jangka panjang pada [Context/BAPOTO_JO_PROJECT_ROADMAP.md](Context/BAPOTO_JO_PROJECT_ROADMAP.md).

---

## 🚀 Fitur Utama

- **Kiosk Photobooth (`/index.html`):**
  - Alur ramah layar sentuh (tablet/komputer photobooth).
  - Tampilan QRIS manual dengan konfirmasi tombol.
  - Pilihan format: Photo Strip (statis PNG) & Animated GIF (rekaman 7 detik).
  - 8 konfigurasi frame dengan slot persegi (`rect`) & elips (`ellipse`).
  - Akses kamera, hitung mundur 3 detik, flash, efek suara shutter, mirror, switch kamera depan/belakang.
  - 8 filter visual Canvas.
  - **Auto QR Code Generation:** Membuat sesi unik dan token acak, mengunggah ke bucket storage, dan menampilkan QR Code untuk dipindai oleh pelanggan.
  - **Selesai / Auto-Reset Session:** Tombol reset sesi baru dengan hitung mundur otomatis 60 detik untuk menjaga privasi pelanggan.
  - Unduh cadangan lokal di perangkat kiosk bila diperlukan.

- **Portal Download Pelanggan (`/download.html`):**
  - Desain mobile-friendly untuk dibuka di HP pelanggan setelah scan QR Code.
  - Memvalidasi token acak berkriptografi aman tanpa mengharuskan pelanggan membuat akun / memasukkan email.
  - Mengunduh langsung ke galeri HP via signed URL berumur pendek.
  - Mendukung Web Share API untuk langsung membagikan foto.
  - Informasi masa retensi foto (24 jam).

- **Admin Dashboard Operator (`/admin.html`):**
  - Terproteksi login Supabase Auth.
  - Pemantauan antrean sesi foto secara **Real-time** tanpa perlu reload halaman.
  - Status cetak foto: `Belum Dicetak` (kuning) dan `Sudah Dicetak` (hijau).
  - Pratinjau hasil foto beresolusi tinggi.
  - Tombol **CETAK** yang membuka dialog browser `window.print()` dengan layout cetak terisolasi.
  - Tombol pembersihan sesi kedaluwarsa (retensi 24 jam).

---

## 🛠️ Kebutuhan & Menjalankan

- Node.js ≥ 18
- Browser modern dengan dukungan `getUserMedia` (Chrome / Edge / Safari)

```bash
# 1. Install dependensi
npm install

# 2. Jalankan dev server lokal
npm run dev       # Buka http://localhost:5173

# 3. Build production
npm run build     # Output multi-page ke dist/

# 4. Preview hasil build production
npm run preview   # Buka http://localhost:4173
```

> **Catatan Kamera:** Browser hanya mengizinkan akses kamera (`getUserMedia`) melalui **`localhost`** atau protokol **HTTPS**. Jika menguji dari perangkat tablet via IP LAN (mis. `192.168.x.x`), gunakan tunneling HTTPS (seperti ngrok/Cloudflare Tunnel) atau deploy ke Netlify.

---

## ☁️ Pengaturan Supabase (Free Tier)

Aplikasi telah dilengkapi fallback lokal/offline jika Supabase belum dihubungkan. Untuk mengaktifkan cloud storage, QR download, dan dashboard admin:

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Buka menu **SQL Editor** di Supabase, lalu jalankan script yang ada di [supabase/schema.sql](supabase/schema.sql). Script ini akan membuat:
   - Tabel `sessions` dan `frames`
   - Kebijakan keamanan **Row Level Security (RLS)**
   - Bucket Storage `session-results` (private) & `frames` (public)
   - Fungsi pembersihan otomatis `cleanup_expired_sessions()`
3. Buat akun admin di **Authentication > Users** (mis. `admin@bapoto.jo`).
4. Salin URL dan Anon Key proyek Supabase Anda ke file `.env`:
   ```bash
   cp .env.example .env
   ```
   Isi file `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
   *(Peringatan: JANGAN pernah memasukkan `service_role` key ke dalam frontend).*

---

## 📦 Struktur Folder

```text
bapotojo 2.0/
├── index.html                  # Halaman utama Photobooth Kiosk
├── download.html               # Halaman unduh customer (Mobile Scan QR)
├── admin.html                  # Halaman dashboard admin operator
├── netlify.toml                # Konfigurasi deploy Netlify
├── package.json
├── vite.config.js              # Multi-page build Vite
├── tailwind.config.js          # Neo-Brutalist design tokens
├── supabase/
│   └── schema.sql              # Skema SQL, RLS, Storage & RPC
├── public/                     # Aset publik statis
│   ├── assets/
│   │   └── qris-bapotojo.jpeg  # Gambar QRIS BAPOTO.JO
│   └── frames/
│       ├── frame1.png ... frame8.png
├── src/
│   ├── main.js                 # Entry kiosk & navigasi step 1–6
│   ├── download.js             # Controller halaman download HP
│   ├── admin.js                # Controller admin dashboard & cetak
│   ├── styles/
│   │   └── main.css            # Tailwind + CSS Neo-Brutalist
│   ├── config/
│   │   ├── frames.js           # Database 8 frame eksisting & slot coordinates
│   │   ├── filters.js          # 8 preset filter Canvas
│   │   └── capture.js          # Konstanta capture, kualitas & GIF
│   ├── core/
│   │   ├── camera.js           # getUserMedia, mirror, switch camera
│   │   ├── canvasRenderer.js   # drawImageCover, clipping rect/ellipse
│   │   ├── gifRenderer.js      # Perekaman frame & gifshot bundling
│   │   ├── imageLoader.js      # Image loader & caching
│   │   └── audio.js            # Efek suara shutter Web Audio
│   ├── booth/
│   │   ├── state.js            # Central booth state
│   │   ├── capture.js          # Countdown & capture controller
│   │   ├── result.js           # Render final, upload Supabase & QR controller
│   │   ├── frameCatalog.js     # Render grid 8 frame
│   │   └── filterPicker.js     # Render swatch filter
│   ├── services/
│   │   ├── supabase.js         # Supabase client initialization (Anon key)
│   │   └── sessionService.js   # Upload, token crypto, QR generator, DB query
│   ├── ui/
│   │   └── toast.js            # Notifikasi toast global
│   └── utils/
│       ├── download.js         # Helper trigger file download
│       └── html.js             # Helper sanitasi string HTML
└── legacy/
    └── index.original.html     # Backup single-file asli sebelum refactoring
```

---

## 🌐 Deploy ke Netlify

1. Hubungkan repository ke Netlify.
2. Pengaturan build di `netlify.toml` otomatis mendeteksi:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Masukkan Environment Variables di Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! Aplikasi siap digunakan secara live.
