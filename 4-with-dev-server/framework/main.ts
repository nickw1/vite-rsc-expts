console.log("placeholder");

import { createServer, RunnableDevEnvironment } from 'vite';
import type { Express } from 'express';
import { resolve } from 'node:path';

export async function createDevServer(app: Express) {

    const vite = await createServer({
        root: process.cwd(),
        server: { middlewareMode: true }
    });

    app.use(vite.middlewares);

    const rscEnv = vite.environments.rsc as RunnableDevEnvironment;

     // Use the runner of the RSC environment to import the RSC entrypoint
    const handleRequest = (await rscEnv.runner.import('./node_modules/vite-rsc-example/framework/entry.rsc')).default;

    return handleRequest;
}

export async function getRequestHandler(app: Express) {
    const handleRequest = (process.env.NODE_ENV == 'development') ? await createDevServer(app) : (await import(resolve(process.cwd(),'dist/rsc/index'))).default;
    return handleRequest;
}
