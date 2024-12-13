import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                pdfWorker: resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
            },
        },
    },
    optimizeDeps: {
        include: ['pdfjs-dist'],
    },
}); 