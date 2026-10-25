# Stage 4 - Adding a dev server

So it's all working in production, but obviously one of the advantages of using Vite for development is that it provides a dev server with Hot Module Reloading. So the next stage was to get it to work in dev mode.

First thing I tried was the well-known `vite-express` package, which allows you to inject the Vite dev server into Express as middleware. However I encountered a good number of hard-to-diagnose issues that way, so decided to go back to first principles and implement a standalone Vite dev server as middleware.

This was easy to get started:

```typescript
export async function createDevServer(app: Express) {

    const vite = await createServer({
        root: process.cwd(),
        server: { middlewareMode: true }
    });

    app.use(vite.middlewares);

    return vite;
}
```

You just need to call Vite's `createServer` function, specify the project root and specify also that it's running in middleware mode. Then you add the middlewares of the Vite server to Express, as Express middleware.

The difficulty came in attempting to load the RSC entry point. The issue, once again, is that we need to run this within the RSC environment, which is not the default. What has to be done is to obtain the RSC environment as a `RunnableDevEnvironment` from the Vite dev server and then obtain a *module runner* to import the given module to run within that environment; see the [Vite docs](https://vite.dev/guide/api-environment-frameworks). The RSC entrypoint is thus imported using the module runner. Here is the revised `createDevServer()` which does this; note that this is exported from the main library file `main.ts`, i.e. Vite's `build.lib.entry` setting. (As you might be able to guess we need to handle our framework as a Vite library project).

```typescript
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
```

Note how we return the imported `handleRequest` function, so we can then call it from our Express route handler.
This is one of the main issues with using `vite-express` for this use case. `vite-express` appears to create the Vite dev server at the same time as it starts listening on its port, so there is no opportunity for us to import the RSC entrypoint as above, and call it in the appropriate route handler.

### Externalisation

The other issue I encountered was to do with the packages the framework is dependent on, specifically the server-side, inbuilt Node packages such as `path`. I wanted to wrap the code which selects to call `handleRequest()` in either dev or production mode in the framework, so that the consuming Express app didn't have to concern itself with this. So, I added the function below to the framework to handle both dev and production mode. It returns an appropriate `handleRequest()` function, and starts the dev server if it needs to by calling `createDevServer()`. In dev mode the function will be obtained via the module runner, as stated above, while in production, the intention was to import it from the prebuilt RSC bundle.

```typescript
export async function getRequestHandler(app: Express) {
    const handleRequest = (process.env.NODE_ENV == 'development') ? await createDevServer(app) : (await import(resolve(process.cwd(),'dist/rsc/index'))).default;
    return handleRequest;
}
```
On building and running however it errored with a message which suggested it was unable to find what looked like browser-based polyfills for Node functions.

This turned out to be because it was attempting to bundle Node packages such as `node:path` and others when the framework is built, 
with warnings such as the below.


```
[plugin rolldown:vite-resolve] Module "node:path" has been externalized for browser compatibility, imported by 
".../dist/shared/create-bundler-option-YGKfBl_D.mjs". 
See https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility for more details.
```
The [Vite docs referred to in the warning](https://vite.dev/guide/troubleshooting.html#module-externalized-for-browser-compatibility) gives this quote:

>This is because Vite does not automatically polyfill Node.js modules.
>We recommend avoiding Node.js modules for browser code to reduce the bundle size, although you can add polyfills manually. If the module is imported from a third-party library (that's meant to be used in the browser), it's advised to report the issue to the respective library.

Essentially, the bundler is trying to process `node:path` and potentially polyfill it for a browser environment (the framework bundler does not know that this code will be server-only). So the `node:path` (and other Node) imports are processed rather than kept intact, and lead to errors at runtime in the consuming app due to the lack of actual polyfills for the Node functions (the Node imports are processed by the bundler, but polyfills are not produced).

What we really want instead is for the imports of Node packages to be left intact (unprocessed by the framework bundler) to be processed by the consuming app. Thankfully we can do this by means of Rolldown (Vite's bundler) *externalisation*. We specify an array of packages to externalise in the `rolldownOptions.external` option. All of these packages will not be processed as part of the bundling process, with `import` statements left intact for the consumer app's bundling process (or execution, for Node) to deal with.

In addition to Node packages, some larger client-side packages were also externalised to cut down on bundle size, such as React. The full list was as follows, Vite and Express also being used by the above code:

```javascript
rolldownOptions: {
    external: ['react', 'react-dom', 'vite', 'express', 'node:path']
}
```

Finally, the consuming Express server looked like this. Note how we call `createDevServer()` as follows - this code works in both dev and production mode. We just need to set `NODE_ENV` to either `production` or `development` and all is good!

```typescript
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createRequest, sendResponse } from '@remix-run/node-fetch-server';

import { getRequestHandler } from 'vite-rsc-example';


const app = express();

app.get(/assets\/.*$/, express.static('dist/client'));

app.get('/api', (req, res) => {

    res.json({ api: true });
});

const handleRequest = await getRequestHandler(app); 

app.use('/', async (req: ExpressRequest, res: ExpressResponse) => {
    const request = createRequest(req, res, { host: process.env.HOST });
    const response = await handleRequest(request);
    return sendResponse(res, response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}.`)
});
```

The consuming app is thus simple, with all complexity wrapped inside the framework package.

After completing the dev server stage, it now feels like we're getting towards a genuinely usable package. The only feature I want to add now is Server Functions, which I think will be relatively straightforward as examples exist in the official `vite-rsc-plugin` docs. These docs will follow...

