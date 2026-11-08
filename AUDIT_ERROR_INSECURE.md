# Audit: "Gagal: The operation is insecure." — BAPOTO.JO

Tanggal audit: 2026-11-08 · Repo: `Apitod/bapoto` @ `2df8471`
Build lokal: `npm install && npm run build` → **sukses** (129 paket, dist 3.3s). Jadi bukan masalah build.

Bukti klien: tablet, halaman booth (tab ADMIN), toast `Gagal: The operation is insecure.`,
plus keluhan "tidak bisa login" dan "tiap mau download muncul notif itu".

---

## 1. Apa arti pesan itu

`The operation is insecure.` = **DOMException `SecurityError` versi WebKit (Safari/iPad) & Gecko (Firefox)**.
Chrome tidak memakai kalimat ini (Chrome: `Tainted canvases may not be exported` / bug storage beda).
Artinya **bukan bug logika aplikasi**, tapi browser menolak operasi karena:

| Pemicu | Efek di aplikasi ini |
|---|---|
| Origin tidak aman (buka via `http://`, bukan `https://` / `localhost`) | kamera mati, `crypto.randomUUID` ditolak, clipboard mati |
| Penyimpanan (cookie/localStorage) diblokir: mode privat, "Block All Cookies", WebView in-app (IG/WA), iframe `sandbox` tanpa `allow-same-origin` | **login gagal** (Supabase simpan sesi ke localStorage) |
| Canvas ter-taint (gambar cross-origin tanpa CORS digambar ke canvas) | **export/unduh/QR gagal** |

Kode sudah punya pengaman `if (window.isSecureContext === false) { console.warn(...) }` di
`src/main.js:18` dan `src/download.js:10` → tim sudah tahu risiko ini, tapi **hanya warning di console**,
tidak ada degradasi yang terlihat user.

---

## 2. Temuan kode (terverifikasi baca kode)

### T1 — Login tidak punya fallback storage (PALING COCOK untuk "tidak bisa login")
`src/services/supabase.js:26-32`
```js
createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true }   // default: localStorage
});
```
`src/admin.js:1612` → `supabase.auth.signInWithPassword()`.
Kalau localStorage diblokir, `setItem` melempar `SecurityError: The operation is insecure.` →
login **selalu** gagal, pesan mentah diteruskan ke toast (`admin.js:1617`).
Supabase mendukung `storage` adapter kustom → bisa jatuh ke memori (`Map`).

### T2 — Toast meneruskan pesan mentah bahasa Inggris
`src/booth/result.js:280` → `alertToast(\`Gagal: ${err.message}\`)`.
Ini persis bentuk notif di screenshot (prefix `Gagal: `). Jalur lain: `admin.js:1421`, `admin.js:1512`, `admin.js:1644`.
Helper penerjemah sudah ada (`src/utils/canvasExport.js:3-14`) tapi **tidak dipakai di semua jalur**.

### T3 — Export canvas tanpa pembungkus (bocor jadi SecurityError mentah)
- `src/booth/result.js:220` → `canvas.toBlob(...)` (foto pose satuan)
- `src/core/gifRenderer.js:24` → `canvas.toDataURL('image/jpeg', 0.75)`
- `src/admin.js:1382` → `exportCanvas.toBlob(...)` (simpan frame)
Ketiganya tidak lewat `canvasToBlob()`/`canvasToDataURL()`, jadi kalau canvas ter-taint,
error mentah naik ke toast.

### T4 — Unduh memakai `data:` URL berukuran besar
`src/utils/download.js:2-9` + `src/booth/result.js:111-122`.
Strip 1204×1795 PNG ≈ 2–5 MB dijadikan `data:` URL. Safari/iPad sering mengabaikan
`<a download href="data:...">` untuk file besar, Firefox punya batas panjang URL.
Rawan "tombol unduh diklik tapi tidak terjadi apa-apa / error".
Aman: `canvas.toBlob` → `URL.createObjectURL`.

### T5 — Sumber taint yang mungkin: overlay frame
`src/core/canvasRenderer.js:96` menggambar `frame.previewUrl`.
`src/core/imageLoader.js:25-38` mencoba `fetch` CORS → blob URL (aman), lalu fallback
`img.crossOrigin='anonymous'`. Kalau server frame tidak mengirim `Access-Control-Allow-Origin`,
fallback itu gagal load (bukan taint) — tapi kalau ada jalur lain menggambar gambar
cross-origin tanpa `crossOrigin`, canvas langsung ter-taint dan **semua** export mati.
Perlu dicek: `frame.previewUrl` yang dikirim database (Supabase storage vs URL luar).

### T6 — Render frame admin rawan
`src/admin.js:1276-1277` set `img.crossOrigin='anonymous'` untuk preview; kalau CORS ditolak,
`renderFramePreview()` + `toBlob` bisa berujung error mentah (T3).

---

## 3. Yang perlu dikonfirmasi ke klien (cepat, 1 menit)

Buka console di tablet klien, tempel:

```js
(() => {
  const t = (f) => { try { return f() } catch (e) { return e.name + ': ' + e.message } };
  console.log({
    url: location.href,
    secureContext: window.isSecureContext,
    protocol: location.protocol,
    ua: navigator.userAgent,
    localStorage: t(() => { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return 'OK' }),
    sessionStorage: t(() => { sessionStorage.setItem('_t', '1'); sessionStorage.removeItem('_t'); return 'OK' }),
    canvasExport: t(() => { const c = document.createElement('canvas'); c.width = 2; c.height = 2; return c.toDataURL().slice(0, 22) }),
    randomUUID: t(() => crypto.randomUUID()),
    mediaDevices: !!navigator.mediaDevices
  });
})()
```

Interpretasi:
- `protocol: "http:"` → **akar masalah = situs tidak HTTPS.** Wajib SSL.
- `secureContext: false` → sama, kamera & export dibatasi browser.
- `localStorage: SecurityError...` → **akar masalah login** (T1). Blokir cookie dimatikan / keluar dari mode privat / buka di browser biasa, bukan WebView IG/WA.
- `canvasExport: SecurityError...` → taint aktif, cari gambar cross-origin (T5/T6).

---

## 4. Rekomendasi perbaikan (urut prioritas, diff kecil)

1. **Paksa HTTPS** (Netlify/Vercel: aktifkan SSL + redirect `http → https`). Ini menghapus mayoritas kasus.
2. **Storage adapter Supabase** dengan fallback memori (`supabase.js`) → login tetap jalan walau storage diblokir.
3. **Bungkus semua export** dengan `canvasToBlob`/`canvasToDataURL` (T3) + toast pakai pesan hasil `toCanvasExportError()` (T2).
4. **Unduh lewat blob URL**, bukan `data:` URL (T4).
5. **Banner UI** kalau `isSecureContext === false` atau storage gagal, bukan cuma `console.warn`.
6. Audit `frame.previewUrl` di database: pastikan semua lewat Supabase storage (CORS `*`) atau path lokal.

---

## 5. Bukti kedua: "Gagal login: Failed to fetch" (bapoto.vercel.app/admin)

Ini **bug berbeda**, bukan SecurityError. Dicek langsung ke deployment live:

- Bundle live memuat `VITE_SUPABASE_URL = https://plycpimieyouteywwvre.supabase.co`
  dan `sb_publishable_QpWRDSjCmi_HmVLKSmfUYA_adpHqRYe` — env ter-bake, `isConfigured = true`.
- `dig plycpimieyouteywwvre.supabase.co @1.1.1.1` → **NXDOMAIN** dari nameserver
  authoritative Cloudflare (`christina.ns.cloudflare.com`). Kontrol `supabase.co` resolve normal.
- `curl https://plycpimieyouteywwvre.supabase.co/auth/v1/health` → gagal konek (000, no DNS).

Artinya host Supabase-nya **tidak ada**: project dihapus, di-pause lalu dihapus, atau ref di
env Vercel salah ketik. Karena DNS mati, semua `fetch` ke Supabase gagal → login
`signInWithPassword` → `TypeError: Failed to fetch` → toast `Gagal login: Failed to fetch`.
Gejala turunannya: frame cloud tidak termuat (fallback lokal), sesi tidak tersimpan, QR/upload mati.

Bukan bisa diperbaiki dari kode. Perlu salah satu:
1. Cek dashboard Supabase: apakah project `plycpimieyouteywwvre` masih ada.
2. Kalau ada → ref di env Vercel salah, ganti di Project Settings → Environment Variables, redeploy.
3. Kalau tidak ada → buat project baru, jalankan `supabase/schema.sql` (+ `fix_frames_storage_rls.sql`,
   `fix_session_storage_rls.sql`), `npm run seed`-frame, lalu set ulang `VITE_SUPABASE_URL` +
   anon/publishable key di Vercel.

Catatan tambahan: `/ac` → 404 (rute yang ada: `/admin`, `/download`; `/*.html` 308 redirect).

## 6. Dua masalah terpisah — jangan dicampur

| Gejala | Bukti | Akar |
|---|---|---|
| `Gagal: The operation is insecure.` (booth tablet) | screenshot 1 | konteks browser: HTTP / storage diblokir / canvas taint |
| `Gagal login: Failed to fetch` (admin) | screenshot 2 + DNS NXDOMAIN | Supabase project/ref mati |

## 7. Status

**Supabase (dicek ulang setelah project di-unpause) — HIDUP.**

- `dig plycpimieyouteywwvre.supabase.co` → `104.18.38.10`, `172.64.149.246` (sebelumnya NXDOMAIN)
- `/auth/v1/health` + apikey → `200 {"name":"GoTrue","version":"v2.197.0"}`
- `POST /auth/v1/token` (kredensial dummy) → `400 invalid_credentials` + header
  `access-control-allow-origin: https://bapoto.vercel.app` → jalur login normal, CORS benar
- `/rest/v1/frames` → `200`, 3 frame tersimpan; `/rest/v1/sessions` → `200`
- **Yang masih kurang:** bucket `session-results` → `NoSuchBucket`. Bucket `frames` ada.
  Jalankan `supabase/fix_session_storage_rls.sql` di SQL Editor, kalau tidak QR/upload sesi tetap gagal.

**Patch kode (belum di-commit):** 6 file, +46/−15.

| File | Perubahan |
|---|---|
| `src/services/supabase.js` | adapter storage auth: probe `localStorage`, fallback memori bila `SecurityError` |
| `src/booth/result.js` | unduh strip lewat blob URL (bukan `data:` URL), `toBlob` pose satuan dibungkus, toast pakai `toCanvasExportError()` |
| `src/core/gifRenderer.js` | `toDataURL` komposit GIF dibungkus |
| `src/admin.js` | `toBlob` simpan frame dibungkus + 2 toast error dipetakan |
| `src/utils/canvasExport.js` | `canvasToDataURL`/`canvasToBlob` terima `quality` |
| `src/main.js` | banner toast bila `isSecureContext === false` |

Verifikasi:
- `npm test` → 7/7 pass. `npm run build` → sukses.
- Uji nyata di Chrome, `localStorage` dipaksa melempar `SecurityError: The operation is insecure.`:
  login tetap sampai ke server → toast `Gagal login: Invalid login credentials`
  (bukan `SecurityError`). Fallback storage terbukti jalan.
- Jalur unduh blob belum diuji end-to-end: sandbox tidak punya kamera (`NotFoundError`).
  Perlu uji manual di kiosk: jepret → UNDUH LOKAL.

**Belum disentuh:** commit/push, deploy, SQL bucket.
