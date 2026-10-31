import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';


console.log(`In config, cwd is ${process.cwd()} dirname ${import.meta.dirname}`);

export default defineConfig({
    plugins: [
        react()
    ],
    build: {
        lib: {
            entry: resolve(import.meta.dirname, 'framework/main.ts'),
            name: 'vite-rsc-example',
            fileName: format => `vite-rsc-example.${format}.js`,
            formats: ["es"]
        },

        minify: false,
        rolldownOptions: {
            external: ['react', 'react-dom', 'vite', 'express', 'path', 'node:path']
        }
    },
});