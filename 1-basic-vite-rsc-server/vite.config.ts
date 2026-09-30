import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';

export default defineConfig({
    plugins: [
        react(),
        rsc({
            entries: {
                rsc:'./framework/entry.rsc.tsx',
                ssr: './framework/entry.ssr.tsx',
                client: './framework/entry.client.tsx'
            }
        })
    ],
    build: {
        minify: false
    }
})