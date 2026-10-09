import { defineConfig } from 'vite';

export default defineConfig({
    // Aset statis (QRIS & frame) disajikan dari /public apa adanya.
    publicDir: 'public',
    server: {
        host: true // agar bisa dites dari tablet/HP di jaringan lokal
    },
    build: {
        outDir: 'dist',
        target: 'es2019'
    }
});
