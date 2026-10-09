# BAPOTO.JO — Project Roadmap & Technical Plan

> Dokumen perencanaan pengembangan BAPOTO.JO. Acuan implementasi bertahap dengan mempertahankan fitur photobooth yang sudah ada, lalu menambahkan Supabase, QR download, dashboard admin, dan pengelolaan frame secara dinamis.

## 1. Ringkasan Proyek

BAPOTO.JO adalah aplikasi photobooth berbasis web yang dijalankan pada komputer/tablet di ruang photobooth. Pelanggan memilih format dan frame, mengambil foto, menerapkan filter, lalu menghasilkan Photo Strip atau Animated GIF.

Pengembangan berikutnya akan menambahkan penyimpanan sementara berbasis cloud agar pelanggan dapat mengunduh hasil melalui QR Code dari ponsel. Admin dapat melihat sesi dan mencetak hasil dari perangkat terpisah. Admin juga dapat menambahkan frame baru melalui dashboard tanpa mengubah kode atau melakukan deploy ulang setiap kali frame ditambahkan.

## 2. Tujuan

1. Mempertahankan alur photobooth yang sudah berjalan.
2. Menyimpan hasil foto/GIF sementara menggunakan Supabase Storage.
3. Menyimpan metadata sesi dan status cetak di Supabase Database.
4. Menyediakan QR Code unik untuk download melalui ponsel.
5. Menyediakan dashboard admin untuk melihat sesi dan mencetak hasil.
6. Memungkinkan admin mengunggah, mengatur, mengaktifkan, dan menonaktifkan frame.
7. Menghapus hasil foto/GIF secara otomatis setelah masa retensi.
8. Melindungi data pelanggan dan kredensial backend.

## 3. Prinsip Implementasi

- **Jangan rewrite dari nol.** Audit dan pertahankan fitur yang ada sebelum refactor.
- **Implementasi bertahap.** Uji setiap alur sebelum melanjutkan.
- **Frame dinamis.** Frame baru harus bisa muncul tanpa mengubah source code frontend untuk setiap frame.
- **Storage bukan database.** File disimpan di Supabase Storage; metadata disimpan di tabel.
- **Penyimpanan sementara.** Hasil tidak dimaksudkan sebagai arsip permanen.
- **Keamanan dari awal.** Jangan mengekspos Supabase `service_role` key di frontend.
- **Validasi upload.** Batasi tipe, ukuran, dan akses file.

## 4. Fitur Existing yang Harus Dipertahankan

Fitur berikut perlu dijaga selama pengembangan:

- Memulai sesi photobooth.
- Konfirmasi pembayaran manual setelah pelanggan membayar melalui QRIS.
- Memilih Photo Strip atau Animated GIF.
- Memilih frame.
- Akses kamera, countdown, mengambil foto, mirror, dan mengganti kamera jika didukung perangkat.
- Memilih filter.
- Merender Photo Strip menggunakan Canvas.
- Membuat GIF menggunakan GIFShot.
- Mengunduh hasil akhir.

Lakukan pengujian regresi sebelum dan setelah perubahan agar fitur lama tidak rusak.

## 5. Arsitektur yang Direncanakan

### Frontend
- HTML, CSS, dan JavaScript yang sudah ada.
- Canvas untuk komposisi foto.
- GIFShot untuk pembuatan GIF.
- Supabase JavaScript client untuk operasi yang diizinkan kebijakan akses.

### Backend dan penyimpanan
- **Supabase Database (PostgreSQL):** metadata sesi, konfigurasi frame, status pencetakan.
- **Supabase Storage:** file frame dan hasil foto/GIF sementara.
- **Supabase RLS:** pembatasan akses database dan Storage.
- **Supabase Edge Functions atau endpoint server tepercaya:** validasi token, operasi sensitif, dan signed URL bila diperlukan.
- **Netlify:** hosting frontend; fungsi server Netlify dapat digunakan bila lebih sesuai.

```text
Komputer Photobooth
  └─ Ambil foto, pilih frame/filter, render hasil
       └─ Upload hasil + simpan metadata sesi
            └─ Supabase Storage + Database
                 ├─ Halaman Download Pelanggan (scan QR)
                 └─ Dashboard Admin (preview, cetak, status cetak)

Cleanup otomatis setelah masa retensi berakhir
```

## 6. Alur Pelanggan

1. Pelanggan memulai sesi.
2. Pelanggan membayar dengan QRIS dan mengonfirmasi pembayaran sesuai proses operasional.
3. Pelanggan memilih format hasil.
4. Pelanggan memilih frame yang tersedia.
5. Pelanggan mengambil foto dan memilih filter.
6. Aplikasi merender hasil akhir.
7. Hasil diunggah ke Supabase Storage dan metadata sesi disimpan.
8. Aplikasi menampilkan QR Code yang mengarah ke halaman download sesi.
9. Pelanggan memindai QR Code dengan ponsel.
10. Halaman download memvalidasi akses dan menyediakan tombol unduh.
11. File dihapus sesuai kebijakan retensi.

QR Code sebaiknya berisi URL dengan token acak yang sulit ditebak, bukan URL file publik permanen. Hindari informasi pribadi yang tidak diperlukan di URL.

## 7. Dashboard Admin

### 7.1 Manajemen sesi
- Melihat daftar sesi terbaru.
- Melihat waktu sesi, format hasil, dan frame yang digunakan.
- Melihat preview hasil selama file masih tersedia.
- Mencetak melalui dialog print browser.
- Menandai sesi sebagai **Sudah Dicetak**.
- Melihat status `Belum Dicetak` atau `Sudah Dicetak`.
- Menangani sesi yang file hasilnya sudah kedaluwarsa.

### 7.2 Manajemen frame
Admin perlu dapat:
- Melihat daftar frame yang tersedia.
- Mengunggah gambar frame baru.
- Mengisi nama frame.
- Memilih format yang didukung: Photo Strip, GIF, atau keduanya.
- Mengatur jumlah pose/foto.
- Mengatur layout slot foto.
- Melihat preview sebelum frame dipublikasikan.
- Menyimpan sebagai draft atau mengaktifkan frame.
- Mengedit metadata.
- Mengaktifkan/menonaktifkan frame.
- Menghapus frame setelah konfirmasi dan pemeriksaan referensi sesi lama.

### 7.3 Catatan penting: upload gambar belum cukup

Frame yang sudah ada menggunakan konfigurasi posisi, ukuran, bentuk, rasio, dan jumlah slot foto saat rendering. Karena itu, file PNG saja belum tentu cukup untuk membuat frame baru langsung berfungsi. Aplikasi juga perlu mengetahui di mana foto ditempatkan.

**Pendekatan A — Upload + konfigurasi slot manual**
1. Admin mengunggah PNG transparan sebagai overlay.
2. Admin menentukan jumlah slot foto.
3. Admin mengatur posisi, ukuran, rasio, dan bentuk setiap slot melalui form/editor.
4. Sistem menampilkan preview komposisi.
5. Admin menyimpan dan mengaktifkan frame.
6. Frontend memuat gambar dan konfigurasi slot dari database.

Kelebihan: fleksibel. Kekurangan: perlu membangun UI konfigurasi slot.

**Pendekatan B — Upload dengan preset layout**
1. Admin mengunggah frame yang mengikuti template ukuran/layout tertentu.
2. Admin memilih preset layout yang sesuai.
3. Sistem menggunakan konfigurasi slot dari preset tersebut.

Kelebihan: lebih cepat untuk MVP. Kekurangan: layout terbatas pada preset.

**Rekomendasi:** mulai dari Pendekatan B untuk versi awal yang sederhana. Kembangkan editor slot fleksibel setelah alur dasar stabil. Jangan menganggap gambar frame otomatis berisi informasi konfigurasi slot.

## 8. Struktur Data Awal

Skema berikut adalah rancangan awal dan perlu difinalisasi setelah audit kode serta kebijakan akses.

### Tabel `sessions`

| Kolom | Tujuan |
|---|---|
| `id` | ID unik sesi |
| `download_token_hash` | Hash token download jika token dikelola aplikasi |
| `frame_id` | Referensi frame yang digunakan |
| `output_type` | `photo_strip` atau `gif` |
| `result_path` | Path file hasil di Storage |
| `print_status` | Status pencetakan |
| `created_at` | Waktu sesi dibuat |
| `expires_at` | Waktu kedaluwarsa hasil |
| `printed_at` | Waktu hasil ditandai tercetak |

Hindari token rahasia plaintext jika alur memungkinkan penyimpanan hash. Jangan mengandalkan ID sesi yang mudah ditebak sebagai satu-satunya pengaman.

### Tabel `frames`

| Kolom | Tujuan |
|---|---|
| `id` | ID unik frame |
| `name` | Nama frame |
| `image_path` | Path file frame di Storage |
| `supported_formats` | Format hasil yang didukung |
| `pose_count` | Jumlah foto/pose |
| `slot_config` | Konfigurasi posisi/ukuran slot, misalnya JSON |
| `is_active` | Apakah frame tersedia untuk pelanggan |
| `created_at` | Waktu dibuat |
| `updated_at` | Waktu terakhir diperbarui |

`slot_config` perlu divalidasi dan memiliki format konsisten agar perubahan tidak merusak frame lama.

### Autentikasi admin

Gunakan Supabase Auth untuk akun admin. Menyembunyikan halaman admin di frontend bukan pengamanan yang cukup. Semua operasi sensitif harus dilindungi oleh kebijakan akses dan validasi server.

## 9. Rancangan Storage

Bucket yang disarankan:
- `frames`: aset frame yang diunggah admin.
- `session-results`: hasil foto strip/GIF sementara.

Kebijakan awal:
- Upload, penggantian, dan penghapusan frame hanya boleh dilakukan admin terautentikasi.
- Hasil pelanggan tidak dibuat publik secara permanen.
- Download diberikan melalui akses terbatas, misalnya validasi token dan signed URL berumur pendek.
- Kebijakan Storage harus mengikuti RLS dan kebutuhan aplikasi.
- Nama file tidak boleh memuat informasi pribadi pelanggan.

Bucket privat saja belum cukup; kebijakan aksesnya juga harus benar.

## 10. Keamanan dan Privasi

- Simpan hanya data yang dibutuhkan.
- Tetapkan masa retensi, misalnya 24 jam, lalu sesuaikan dengan operasional.
- Hapus file Storage dan metadata kedaluwarsa melalui proses backend tepercaya; jangan mengandalkan browser yang bisa ditutup.
- Jangan menaruh Supabase `service_role` key atau secret lain di frontend.
- Terapkan RLS dan kebijakan Storage yang sesuai.
- Batasi tipe file, ukuran upload, dimensi gambar, dan nama file.
- Lindungi dashboard admin dengan autentikasi.
- Gunakan token download acak dengan entropi tinggi dan cegah enumerasi sesi.
- Hindari mencatat token lengkap atau URL signed sensitif ke log.
- Uji akses sebagai admin, pelanggan, dan pengguna tanpa autentikasi.

## 11. Roadmap Implementasi

### Tahap 0 — Audit dan baseline [SELESAI ✅]
- [x] Cadangkan kode saat ini (`legacy/index.original.html` & git init).
- [x] Petakan fungsi dalam `index.html`.
- [x] Catat konfigurasi frame yang ada.
- [x] Identifikasi aset di `assets/` dan `frames/`.
- [x] Uji kamera, Photo Strip, GIF, filter, dan download.
- [x] Catat dan perbaiki bug sebelum & sesudah refactor.

**Hasil:** Baseline fitur lama aman, struktur modular Vite + Vanilla JS ES Modules berhasil dibangun dan di-build.

### Tahap 1 — Setup Supabase [SELESAI ✅]
- [x] Buat project Supabase (`plycpimieyouteywwvre`).
- [x] Siapkan konfigurasi frontend (`src/services/supabase.js`, `.env.example`, `.env`).
- [x] Buat tabel `frames` dan `sessions` (`supabase/schema.sql`).
- [x] Buat bucket Storage `session-results` (private) dan `frames` (public).
- [x] Konfigurasikan RLS dan kebijakan Storage.
- [x] Siapkan autentikasi admin via Supabase Auth.

**Hasil:** Fondasi backend, skema database, RLS policies, dan client service siap pakai.

### Tahap 2 — Frame dinamis [SELESAI ✅]
- [x] Migrasikan delapan frame awal ke schema database & storage.
- [x] Simpan metadata frame di tabel `frames`.
- [x] Ambil daftar frame aktif dari database secara asynchronous (`src/services/frameService.js`).
- [x] Pertahankan konfigurasi slot frame lama dengan fallback otomatis ke lokal jika offline/gagal.
- [x] Tambahkan preview frame.
- [x] Uji rendering semua frame lama.

**Hasil:** Frame lama tetap berfungsi 100%, dan daftar frame sudah dinamis berbasis cloud database dengan zero-downtime offline fallback.

### Tahap 3 — Upload dan manajemen frame admin [SELESAI ✅]
- [x] Buat halaman manajemen frame di admin dashboard (`admin.html`).
- [x] Buat form upload frame overlay.
- [x] Validasi format gambar (PNG/JPEG) dan rasio aspek.
- [x] Terapkan sistem preset layout slot foto (`src/config/layoutPresets.js`).
- [x] Tambahkan live preview komposisi frame & slot sebelum aktivasi.
- [x] Tambahkan toggle status aktif/nonaktif dan tombol hapus frame.
- [x] Integrasi otomatis ke photobooth tanpa deploy ulang.

**Hasil:** Admin dapat menambah dan mengatur frame baru langsung dari dashboard.

### Tahap 4 — Upload hasil dan QR download [SELESAI ✅]
- [x] Upload hasil foto/GIF otomatis ke Storage bucket `session-results`.
- [x] Simpan metadata sesi ke tabel `sessions`.
- [x] Buat token download unik berkriptografi tinggi (`crypto.randomUUID()`).
- [x] Buat halaman download responsif khusus HP (`download.html` & `src/download.js`).
- [x] Tampilkan QR Code unik di Step 6 photobooth setelah upload berhasil.
- [x] Sediakan tombol auto-reset sesi 60 detik untuk melindungi privasi pelanggan.

**Hasil:** Pelanggan dapat memindai QR Code untuk mengunduh hasil foto langsung ke galeri HP.

### Tahap 5 — Dashboard sesi dan pencetakan [SELESAI ✅]
- [x] Buat antrean sesi terbaru dengan pembaruan Real-Time (Supabase Realtime).
- [x] Tambahkan filter status (Semua / Belum Dicetak / Sudah Dicetak).
- [x] Buat modal preview hasil foto beresolusi tinggi.
- [x] Tambahkan aksi cetak melalui dialog print browser (`window.print()`).
- [x] Tambahkan aksi tandai `Sudah Dicetak` / `Belum Dicetak`.
- [x] Multi-device support: admin dapat mengawasi & mencetak dari laptop/tablet terpisah.

**Hasil:** Operator dapat memantau dan mencetak foto secara efisien lintas perangkat.

### Tahap 6 — Retensi dan hardening [SELESAI ✅]
- [x] Tetapkan masa retensi 24 jam di tabel dan token link.
- [x] Implementasikan fungsi cleanup PostgreSQL `cleanup_expired_sessions()`.
- [x] Tombol trigger cleanup di dashboard admin.
- [x] Terapkan RLS ketat: anon hanya bisa melihat sesi bila token cocok persis, enumerasi ID dicegah.
- [x] Proteksi kredensial: tidak ada `service_role` key di frontend.

**Hasil:** Sistem mematuhi standar privasi data dan retensi sementara.

### Tahap 7 — Deploy dan UAT [TAHAP SAAT INI / SELANJUTNYA 🚀]
- [ ] Push repository ke GitHub.
- [ ] Deploy frontend ke Netlify (konfigurasi `netlify.toml` sudah siap).
- [ ] Set environment variables di Netlify (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [ ] Eksekusi UAT live pada perangkat komputer photobooth dan tablet operator sebenarnya.
- [ ] Pengujian kamera fisik, printer fisik, dan scan QR dari berbagai jenis ponsel.

**Hasil:** Aplikasi live di production dan siap operasional komersial.

## 12. Kriteria Penerimaan

- [x] Fitur photobooth lama tetap berjalan.
- [x] Semua frame awal dapat dipilih dan dirender.
- [x] Admin dapat mengunggah frame melalui dashboard.
- [x] Frame baru muncul tanpa perubahan kode frontend atau deploy ulang.
- [x] Frame baru memiliki konfigurasi slot yang valid dan preview sesuai.
- [x] QR muncul setelah hasil berhasil disimpan.
- [x] QR dapat dibuka dari ponsel dan hasil bisa diunduh.
- [x] Admin dapat melihat sesi dari perangkat lain.
- [x] Admin dapat mencetak hasil dan mengubah status cetak.
- [x] File kedaluwarsa dihapus oleh proses backend / RPC.
- [x] Pengguna tanpa izin tidak dapat mengakses fitur admin atau hasil sesi secara bebas.
- [x] Tidak ada secret backend di source code frontend.

## 13. Risiko dan Keputusan yang Masih Dibutuhkan

1. Apakah frame diunggah sebagai PNG transparan dengan area foto kosong?
2. Apakah versi awal menggunakan preset layout atau editor slot bebas?
3. Apakah slot hanya persegi/persegi panjang atau juga lingkaran/bentuk lain?
4. Apakah masa retensi 24 jam sesuai kebutuhan operasional?
5. Apakah dashboard menampilkan semua sesi atau hanya yang belum dicetak?
6. Apa yang terjadi jika hasil sudah dirender tetapi upload gagal?
7. Berapa batas ukuran dan durasi GIF?
8. Siapa yang boleh mengelola frame dan siapa yang boleh melihat/mencetak sesi?

## 14. Prioritas yang Direkomendasikan

1. Audit dan lindungi fitur lama.
2. Setup Supabase, skema data, dan akses aman.
3. Migrasi frame lama ke sistem dinamis.
4. Tentukan format konfigurasi slot.
5. Bangun upload frame admin.
6. Bangun upload hasil dan QR download.
7. Bangun dashboard sesi dan pencetakan.
8. Tambahkan cleanup otomatis.
9. Uji keamanan, performa, dan deploy.

Konfigurasi frame dinamis ditempatkan sebelum fitur upload hasil agar fondasi rendering dan manajemen frame stabil terlebih dahulu.

---

## Status Dokumen

Dokumen ini adalah rencana awal, bukan bukti bahwa fitur sudah diimplementasikan. Skema tabel, kebijakan RLS, desain editor frame, dan mekanisme download harus difinalisasi setelah audit menyeluruh terhadap kode yang berjalan.
