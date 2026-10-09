import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    publicDir: 'public',
    server: {
        host: true // agar bisa diakses dari tablet/HP di jaringan lokal
    },
    build: {
        outDir: 'dist',
        target: 'es2019',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                download: resolve(__dirname, 'download.html'),
                admin: resolve(__dirname, 'admin.html')
            }
        }
    }
});
