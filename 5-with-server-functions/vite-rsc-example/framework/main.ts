console.log("placeholder");

import { createServer, RunnableDevEnvironment } from 'vite';
import type { Express } from 'express';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';

export async function createDevServer(app: Express) {

    const root = process.cwd();

    const require = createRequire(resolve(root, "package.json"));

    const vite = await createServer({
        root: process.cwd(),
        server: { middlewareMode: true },
        configFile: false,
        plugins: [,
            react(),
            rsc({
                entries: {
                    rsc: require.resolve('vite-rsc-example/entry.rsc'),
                    ssr: require.resolve('vite-rsc-example/entry.ssr'),
                    client: require.resolve('vite-rsc-example/entry.client')
                }
            })
        ],
    });


    app.use(vite.middlewares);

    const rscEnv = vite.environments.rsc as RunnableDevEnvironment;

    // Use the runner of the RSC environment to import the RSC entrypoint
    const handleRequest = (await rscEnv.runner.import(require.resolve('vite-rsc-example/entry.rsc'))).default;

    return handleRequest;
}

export async function getRequestHandler(app: Express) {
    const handleRequest = (process.env.NODE_ENV == 'development') ? await createDevServer(app) : (await import(resolve(process.cwd(), 'dist/rsc/index'))).default;
    return handleRequest;
}
