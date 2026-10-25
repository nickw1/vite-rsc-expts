import { defineConfig, esmExternalRequirePlugin } from 'vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { resolve } from 'path';


console.log(`In config, cwd is ${process.cwd()} dirname ${import.meta.dirname}`);

export default defineConfig({
    plugins: [
        react(),
        rsc({
            entries: {
                rsc: resolve(import.meta.dirname, 'node_modules/vite-rsc-example/framework/entry.rsc.tsx'),
                ssr: resolve(import.meta.dirname, 'node_modules/vite-rsc-example/framework/entry.ssr.tsx'),
                client: resolve(import.meta.dirname, 'node_modules/vite-rsc-example/framework/entry.client.tsx')
            }
        })
    ],
});