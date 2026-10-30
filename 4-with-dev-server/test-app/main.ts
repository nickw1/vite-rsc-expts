console.log("placeholder");

import { createServer, RunnableDevEnvironment } from 'vite';
import type { Express } from 'express';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

export async function createDevServer(app: Express) {

    const vite = await createServer({
        root: process.cwd(),
        server: { middlewareMode: true },
        config: // TODO
    });

    app.use(vite.middlewares);

    const require = createRequire(resolve(process.cwd(), 'package.json'));
    const rscEntry = require.resolve('vite-rsc-example/entry.rsc');
    console.log(`rscEntry is : ${rscEntry}`);

    const rscEnv = vite.environments.rsc as RunnableDevEnvironment;

     // Use the runner of the RSC environment to import the RSC entrypoint
    const handleRequest = (await rscEnv.runner.import(rscEntry)).default;

    return handleRequest;
}

export async function getRequestHandler(app: Express) {
    const handleRequest = (process.env.NODE_ENV == 'development') ? await createDevServer(app) : (await import(resolve(process.cwd(),'dist/rsc/index'))).default;
    return handleRequest;
}
