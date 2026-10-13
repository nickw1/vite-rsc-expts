#!/usr/bin/env node
import { resolve } from 'node:path';
import { createBuilder } from "vite";
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const cwd = process.cwd();
const tmpDir = './build/tmp';
await fs.mkdir(tmpDir, { recursive: true });
const require = createRequire(resolve(cwd, 'package.json'));
const ssrFile = require.resolve('vite-rsc-example/entry.ssr');
const rscFile = require.resolve('vite-rsc-example/entry.rsc');
const clientFile = require.resolve('vite-rsc-example/entry.client');




const builder = await createBuilder({
    root: cwd,

    plugins: [
        react(),
        rsc({
            entries: {
                rsc: rscFile, 
                ssr: ssrFile,
                client: clientFile
            }
        })
    ],
    build: {
        minify: false,
    }
});
await builder.buildApp();
await fs.rm(tmpDir, { recursive: true });
