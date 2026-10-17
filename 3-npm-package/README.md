# Stage 3 - Creating an installable package

Having integrated the Vite RSC plugin with Express successfully in a single application, the next stage was to create an installable NPM package which could be used with other applications.

This proved to be quite a challenge due to a few misunderstandings along the way but it's now working, complete with filesystem-based router - at least in production mode. Dev server will come next!

The name I have used for the package, for now, is `vite-rsc-example`.

## The binary package script

Many NPM packages come with a default binary script, executable with the `npx` (NPM Execute) tool. I'd want users of the package be able to build and run it using its own script (e.g `npx vite-rsc-example`), rather than resort to directly use Vite, so the first stage was to develop a binary to orchestrate the build process. 

The first thing to do is to specify this in `package.json` with the `bin` option, e.g.:

```json 
"bin": "framework/app.js",
```

We also need to specify our RSC/SSR entrypoints in the `package.json` as package exports, so that they can be imported from elsewhere:

```json
 "exports": {
    "./entry.rsc": "./framework/entry.rsc.tsx",
    "./entry.ssr": "./framework/entry.ssr.tsx",
    "./entry.client": "./framework/entry.client.tsx",
    "./types": "./framework/types/index.ts"
}
```

and then we need to write the specified script, `framework/app.js`. This needs to be plain JavaScript as `npm` cannot process TypeScript. As we are using Vite to build, the script needs to orchestrate Vite to build our package and thus needs to include the Vite config that we would otherwise use directly with Vite. Here is the script:

```javascript
#!/usr/bin/env node
import { resolve } from 'node:path';
import { createBuilder } from "vite";
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { createRequire } from 'node:module';

const require = createRequire(resolve(cwd, 'package.json'));
const ssrFile = require.resolve('vite-rsc-example/entry.ssr');
const rscFile = require.resolve('vite-rsc-example/entry.rsc');
const clientFile = require.resolve('vite-rsc-example/entry.client');

const cwd = process.cwd();

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
```

Note how, in shell-script style we need to specify the executor with the "shebang" (`#!`) followed by the executable which processes the script.

The first thing we do is resolve the package exports for the RSC, SSR and clients entrypoints, to avoid having to specify absolute file paths for these. We do this using the `require.resolve()` API, which resolves a package export entrypoint into a full path. This is based on previous CommonJS standards (i.e. `require`) so the first thing we need to do is to create a require object using the `createRequire()` function, passing in the path of the library's `package.json`.

Next, we actually orchestrate the Vite build. To do this we need to take Vite's `createBuilder()` function. This takes the same options as a Vite config, so you can see for example an array of `plugins` (the React and RSC plugins), a `build` option (minification turned off now, which helps debugging) and also a `root` to specify the root of the build (the current working directory, as this will be executed in the consuming app's root directory).

This is quite straightforward - we can then perform `npx vite-rsc-example` to build our package. In fact, only the unbundled copies of the `framework` directory (containing the three entrypoints and the `app.js` above) actually need to be included in the package (via the `files` property of `package.json`) - no bundles needed. But originally I thought otherwise, building bundles from the RSC, SSR and client entrypoints and distributing these in the presumption that they could be imported by the consumer. This was where the fun began...

## Attempting to build bundles of the entrypoints within the package

I originally assumed (not having dived into this before) that, in the consuming app, you could do something like:

```typescript
import handleRequest from 'vite-rsc-example/rsc/dist/index.js';
```

... in other words, import the exported `handleRequest()` function from a built bundle of the RSC entrypoint. In fact, this is precisely what I did when creating a single project with the Express server in the same project as the RSC code.

However this did not work, and the error messages were not so helpful.

After some scratching around it became apparent as to the reason why. From my understanding (and please correct me if I'm wrong by opening an issue): Vite/RSC-based applications contain *three entirely separate module graphs for each environment*, one for client, one for SSR, and one for RSC, and this is done because the rules for processing modules for the three environments are different. See for example [this Vite GitHub discussion](https://github.com/vitejs/vite/discussions/12715). From that discussion:


>When coupled with SSR, RSC requires three module graphs: Two on the server (RSC and SSR), one on the client. Sharing a single module graph between SSR and RSC is challenging because they require separate resolution and transformation rules: For RSC, resolution must respect the react-server export condition and client boundary modules ("use client") have to be transformed into client references.

This is why we need to use `import.meta.viteRsc.import()` statements to import code from a different environment, e.g. SSR code from the RSC entrypoint, or client code from the SSR entrypoint. We cannot use ordinary dynamic `import()` calls, as we need to switch from one environment to another. These special imports, again from my understanding, are basically directives for the Vite build to process (to ensure each environment is bundled correctly), not ordinary function calls. The problem with building a bundle within our framework NPM package is that these special environment-switching imports are processed and thus removed from the bundle produced by the build process, and then exported by the package. So any consumer of the bundle, such as a consumer app, will not load the correct environment when code switches from one to another, e.g. RSC to SSR. However, if the bundles are built *locally within the consumer app* using Vite, the correct environment switching will take place.

Once this was figured out, I could get the music database `App` from the previous stages working, via server code such as:

```typescript
import express, {  Request as ExpressRequest,  Response as ExpressResponse } from 'express';
import { createRequest, sendResponse } from '@remix-run/node-fetch-server';
import handleRequest from './dist/rsc/index'; 

const app = express();

app.get(/assets\/.*$/, express.static('dist/client'));

app.get('/api', (req, res) => {
    res.json({ api: true });
});

app.use('/', async(req: ExpressRequest, res: ExpressResponse) => {
   const request = createRequest(req, res, { host: process.env.HOST });
   const response = await handleRequest(request);
   return sendResponse(res, response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}.`)
});
```

Note that the RSC entrypoint's `handleRequest()` is imported from a *locally built bundle*, not a bundle imported from the framework package. The build is executed simply using `npx vite-rsc-example`, which as we have seen orchestrates the build using `app.js` within the package.


## Filesystem router

Having got an NPM package working successfully (at least for production build) the next thing I looked at was filesystem routing. Originally I tried to do this manually (with limited success) but then came across Vite's `import.meta.glob()`. This processing instruction is extremely useful as it automagically creates a map of routes to components, making it very easy to create a router out-of-the-box. This is done, as you might expect, in the RSC entrypoint:

```typescript
const glob = import.meta.glob('/src/**/*.{js,jsx,ts,tsx}');
const componentRoutes: { [path: string]: ComponentType<AppProps> } = {};
for (const [path, loadModule] of Object.entries(glob)) {
    const cleanedPath = path.replace(/^\/src|(index)?\.(jsx|tsx|js|ts)$/g, "").toLowerCase();
    componentRoutes[cleanedPath] = ((await loadModule() as any).default) as ComponentType<AppProps>;
}
```

The above `import.meta.glob()` matches any file ending in `.js`, `.jsx`, `.ts` or `.tsx` within the `src` directory or any subdirectories of `src` and returns a map-like object with paths to those files (relative to the project root) as the keys, and *functions to load the corresponding components as modules* (not actual components) as the values. In the `for` loop we then loop through each key/value pair and process the keys to produce clean paths. The `/src` is removed from the path, as is the final extension and any `index` that might be present in the path immediately before the final extension, so that `index.*` components are loaded by default from a given path. We add this cleaned-up path to a new map-like object, and set the corresponding value to be the actual component, by loading the dynamic module using the provided function.

It's then easy to create a router from the `componentRoutes` map-like object:

```tsx
const path = new URL(request.url).pathname;

const App = componentRoutes[path] ?? componentRoutes[`${path}/`] ?? null;

// Convert RSC JSX to RSC payload
let rscStream = ReactServer.renderToReadableStream(
    App === null ? <h1>Cannot find component for path {path}</h1> : <App url={request.url} />
);
```

We obtain the path from the URL using the URL object's `pathname` and use it to index `componentRoutes`. If the path on its own fails, we try again with a trailing slash added, before giving up and setting our `App` component to `null`. Then, we create the RSC payload using either the resolved component, or a default JSX error message.

This all now works. Tested with a default `index.tsx` RSC directly in `src`; a client component (our `Counter`), and a component within a subdirectory of `src`.

## Proof-of-concept source

The POC framework is in this directory `3-npm-package`. The consuming app is in `3a-use-3` and, as can be seen from the `package.json`, uses the built NPM package containing the framework.

## What's next?

So a proof-of-concept framework which provides RSCs, a file-system based router, and Express integration has been produced which works in production mode (build and run). However, it's a little rough round the edges and needs cleaning up (importing from a local `dist` directory in the consuming app seems messy for example, we really want the package to orchestrate this); it doesn't support Server Functions (a key requirement); and also doesn't work in dev mode yet (another key requirement). This latter requirement will be the next thing to be looked at.