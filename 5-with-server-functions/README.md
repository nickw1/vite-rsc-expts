# Stage 5 - Adding server functions

The last feature I really wanted to add was *server functions* (also known as *server actions*) - functions which reside server-side and are called in a seamless, RPC-like manner from client components without having to make API calls. Server functions work using the RSC payload format: the call is encoded in RSC payload, interpreted by the RSC entrypoint, and an RSC payload response is sent back which is then intercepted by code in the client entrypoint.

## Including Vite config in dev server startup, and the problem which arose

Before moving to server functions, I modified the `createDevServer()` function to include a Vite config, thus meaning that users of the framework would not need to create their own in dev mode:

```typescript
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
```

Thus, the plugins and entrypoints are specified explicitly when the dev server is created, and the consuming app need not worry about them.

Doing this, however, led to a new error: the dev server reported it could not handle requests for the  `/@react-refresh` path. This is a special Vite-injected path which handles auto-refresh in the dev server and is part of the React Vite plugin, thus resides inside the `@vitejs/plugin-react` package, and is handled normally by the Vite middleware. But it was somehow getting through to the RSC entrypoint instead as a component request, which rejected it due to no matching component with that path.

The problem turned out to be that it could not find the react-refresh code (`refresh-runtime.js`) because it was looking in the wrong place. It was looking inside the `vite-rsc-example` package for it, rather than where it should have been looking, i.e. in `@vitejs/plugin-react`. It turns out that the react-refresh code is not imported as a module in the normal way but loaded with `readFileSync()` from the current directory, so its loading will not be processed by the bundler. It will just be loaded from whatever directory the React plugin's code is being processed from, which will now be the directory within the installed `vite-rsc-example` package.

So the precise error log was this:

```
07:38:13 [vite] (client) Pre-transform error: ENOENT: no such file or directory, open '(...)/vitersc-basic/5a-use-5/node_modules/vite-rsc-example/dist/refresh-runtime.js'
07:38:13 [vite] Internal server error: ENOENT: no such file or directory, open '(...)/vitersc-basic/5a-use-5/node_modules/vite-rsc-example/dist/refresh-runtime.js'
      at readFileSync (node:fs:442:20)
      at LoadPluginContext.handler ((...)/vitersc-basic/5a-use-5/node_modules/vite-rsc-example/dist/vite-rsc-example.es.js:4038:43)
      at EnvironmentPluginContainer.load ((...)/vitersc-basic/5a-use-5/node_modules/vite/dist/node/chunks/node.js:8503:56)
      at async loadAndTransform ((...)/vitersc-basic/5a-use-5/node_modules/vite/dist/node/chunks/node.js:19941:21)
      at async viteTransformMiddleware ((...)/vitersc-basic/5a-use-5/node_modules/vite/dist/node/chunks/node.js:20207:20)
handleRequest()
```

Clearly it's looking inside the `vite-rsc-example` package (the framework) for `refresh-runtime.js`, but as it wasn't bundled, it's not there. The React plugin however is specified within the server so its code will be created at build time and included within the bundle, and run by the consuming application as part of the installed `vite-rsc-example` package.

```
Cannot find component for path /@react-refresh
```
The solution was to externalise all the `@vitejs/...` packages in he framework's Vite config when building it:

```javascript
rolldownOptions: {
    external: id => id.startsWith("node:") || id.startsWith("@vitejs/") || ['react', 'react-dom', 'vite', 'express'].indexOf(id) >= 0
}
```
This means that any `@vitejs/...` package is resolved by the consuming app. So the Vite React plugin will be loaded from the `@vitejs/plugin-react` package, which contains the required `refresh-runtime.js` 

## Server Functions

So now we can move onto Server Functions themselves. These were in some ways relatively easy to implement as there is a reference implementation in the [GitHub repo for the plugin](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/basic). That said the reference implementation is not a simplest-possible-case so it was a case of finding out the bare minimum for a basic implementation. The reference implementation for example includes handling of HTML-only forms connected to Server Functions for progressive enhancement, a nice-to-have feature, but I wanted to create something which did the basic server function handling and nothing else.

### Server-side

So this project has what I believe to be the bare minimum. Server Functions are of course server-side, and therefore are handled by the RSC entrypoint. This now looks like this:

```typescript
import * as ReactServer from '@vitejs/plugin-rsc/rsc';

import type { ComponentType, ReactElement } from 'react';
import type { AppProps, RscPayload, ReturnValue } from './types';


export default async function handleRequest(request: Request): Promise<Response> {

    let rscStream: ReadableStream | null = null;
    const url = new URL(request.url);

    let isServerFunction = false;

    if (request.method == 'POST' && url.pathname.endsWith("_.rsc")) {
        console.log("rsc: Got a server function");

        const { status, returnValue } = await handleServerFunction(request);

        // Convert RSC JSX to RSC payload
        rscStream = ReactServer.renderToReadableStream<ReturnValue>(
            returnValue
        );
        isServerFunction = true;
        return new Response(rscStream, {
            status,
            headers: {
                'content-type': 'text/x-component;charset=utf-8'
            }
        });
    } else {
        // Handle a component request, as before...
    }
}

// This code is based on the example from the @vitejs/rsc-plugin repo
// https://github.com/vitejs/vite-plugin-react/blob/304a92a9e6fb0374bf7e0bca363984c5d5c73590/packages/plugin-rsc/examples/basic/src/framework/entry.rsc.tsx
async function handleServerFunction(request: Request) {

    // from the example
    let returnValue: ReturnValue = { ok: true, data: undefined };
    const actionId = request.headers.get("x-rsc-action") ?? null;
    let status = 200;

    // It appears each action has a unique ID
    if (actionId !== null) {
        const contentType = request.headers.get('content-type');
        // If a form was sent, get the form data, otherwise just get plain text from the request body
        const body = contentType?.startsWith('multipart/form-data')
            ? await request.formData() : await request.text();
        // Decode the contents of the body
        const args = await ReactServer.decodeReply(body);
        // Obtain the actual server action function from its actionId, I would presume
        const action = await ReactServer.loadServerAction(actionId);
        try {
            // This presumably calls the specified server action
            const data = await action.apply(null, args);
            // ... and return whatever it returns to the client
            returnValue = { ok: true, data };
        } catch (e) {
            returnValue = { ok: false, data: e };
            status = 500;
        }


    } else {
        returnValue = { ok: false, data: 'Missing actionId' };
        status = 400;
    }

    return { status, returnValue };
}
```
We first need to check the request method. Because Server Functions are normally used to create or update data, the first thing we do is check whether the request method was `POST`. We also check whether the URL path ended with `_.rsc` which is a special marker to inform the server that this is a Server Function request; this will be added on the client side, which we will come to later. If it is, we then call the `handleServerFunction()` function to process the request.

This function checks the content type of the request; we read data from the request according to whether a form was sent (`Content-Type` is `multipart/form-data`) or not. A form would typically be used if you are making use of `useActionState()` on the client plus a `form` with an `action`; otherwise the data is read directly from the request body, which will be the case if you call the Server Function directly.

We then obtain the function arguments calling the Vite RSC plugin's `decodeReply()` function, which decodes the RSC payload format. It's slightly confusing that the word "reply" is used here, as you might think a reply is what the Server Function sends back: but nonetheless it does mean the request fromm the client.

We then load the specific Server Action (Server Function) using the `actionId` which is a unique ID sent from the client via the custom `x-rsc-action` header, and is normally made up of the module containing the Server Function plus a hash and the name of the export we are using. This is again supplied on the client side - more later. Having obtained the correct Server Function we then send the decoded data to it and receive the return value.

Finally the data, plus a success/error flag, is sent back from the function.

Back in the main RSC `handleRequest()` method, we receive the return value and render it to an RSC stream using `renderToReadableStream()`, sending it back to the client with a content type of `text/x-component`, which the client can recognise and act on appropriately.

So that is essentially all that is required to implement Server Functions server-side! However, we also need to handle them on the client too. The consumer code will call the Server Function either as a normal function call as a form action, and something on the client needs to turn this into a request which the server can understand. This code goes inside the RSC client component.

### Client-side

So now to the code which is needed to handle server functions on the client side. 

```typescript
// Based on the @vitejs/plugin-rsc example at:
// https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/basic/src/framework/entry.browser.tsx

ReactClient.setServerCallback(async (id, args) => {
    console.log(`client: Detected server action request: ID is ${id}`);
    const url = new URL(window.location.href);
    url.pathname += "_.rsc";
    const action = {
        id,
        body: await ReactClient.encodeReply(args)
    };
    const headers = new Headers();
    headers.set('x-rsc-action', action.id);
    const renderRequest = new Request(url.toString(), {
        headers,
        method: 'POST',
        body: action.body
    });
    console.log("Headers of created request:");
    console.log(renderRequest.headers);
    const payload = await ReactClient.createFromFetch<ReturnValue>(fetch(renderRequest));
    const { ok, data } = payload;
    if (!ok) throw data;
    return data;
});
```

We use the `setServerCallback()` function of the Vite RSC plugin to specify a callback function which will run whenever the client entrypoint receives a request to run a Server Function (from my understanding, this is integrated with consumer client code by the React bootstrap we inject at initial render). This takes two parameters: `id`, the action ID (which we discussed above), and `args` (the arguments to the Server Function).

You can see that this adds the `_.rsc` marker, which the server later uses to recognise that this is an RSC request, as described above. We also create a `POST` request and add the custom `x-rsc-action` header containing the action ID, also described above. We then call `fetch()`, passing in the render request to it, which returns a `fetch` promise and this promise is passed to the `createFromFetch()` RSC plugin function (we use this rather than a plain `fetch` due to the different environments). This will resolve with the payload returned from the server entrypoint, or more specifically an object containing the payload and a success status flag. If it failed we throw the data (which will contain an error message) otherwise we return it; this data will then be received by the consumer component calling the server function, either as a simple return value or as action state, as appropriate.

So this all worked! Compared to some aspects of the framework, server function implementation seemed quite straightforward.


## Implementing a refresh function

Having implemented Server Functions, it became apparent that a further fairly essential piece of functionality would be to implement refresh of the component tree without full page reload. So for example, if you add a new record to a database using a Server Function, and on the same page is a list of database results, you really want to refresh that list as soon as a new item is added, in other words when the Server Function returns.

But how do you refresh? This was a little bit trickier to work out but you essentially have to tell the RSC server to send RSC payload *directly back to the client*, bypassing SSR. The client can then receive the payload and update the component tree.

### Client side

Firstly I took the client entrypoint and stored the return value of `hydrateRoot` in a variable `root` (type `Root`) which can be later used to apply a new tree to:

```tsx
import { setRoot } from './client';

const root = hydrateRoot(
    document,
    <ClientRoot />
);

setRoot(root);
```

`client.ts` was a separate standalone module which would contain the `refresh()` function, allowing consumers to import `refresh()` without having to import the set of RSC entrypoints, which leads to issues. The refresh handling in `client.ts` was as follows. The `root` is supplied from the client entrypoint. We then fetch our component tree as an RSC payload from the server (more on this below) and pass it to the root's `render()` method. Note how we pass in a custom header to the RSC server again: `x-no-ssr`. This tells the server to send the payload back to the client, bypassing SSR.

```typescript
let root: Root | null;

export function setRoot(rootIn: Root) {
    root = rootIn;
}

export async function refresh() {
    try {
        if (root !== null) {
            const tree = await ReactClient.createFromFetch<ReactNode>(fetch(window.location.href, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-no-ssr': '1'
                }
            }));
            console.log('Got tree');
            root.render(tree);
            console.log('Tree rendered');
        
        } else {
            console.log("cannot render tree - root is null");
        }
    } catch (e) {
        console.error('refresh(): Error', e);
    }
}
```

We then also import `client.ts` from our consumer component as an export fron the framework, so we can call `refresh()`:

```tsx
import { refresh } from 'vite-rsc-example/client';

export default ServerFunctionsTest {
    // ...
}
```

The presumption in implementing this was that there would be a single instance of `client.ts`, which would be shared between the client RSC entrypoint and the consuming component (`ServerFunctionsTest`). However it turned out that, even though the instance of `client.ts` imported from the client RSC entrypoint initialised `root`, the `root` reference in the instance imported from `ServerFunctionsTest` was still `null` and thus the `refresh()` function could not run correctly. 

While I haven't seen any confirmation of this, I believe the reason is because the `client.ts` imported from the client RSC entrypoint is imported unbundled (as we saw earlier the client RSC entrypoint is not bundled but imported directly from the consuming app) while the `client.ts` imported by the `ServerFunctionsTest` consumer component is taken from the `vite-rsc-example` package and its bundle. Thus they have different sources and are different instances, and we cannot share the `root` between them.

How was this resolved? It was simply a case of using a consistent import, i.e. change the import of `setRoot()` in the RSC client entry point to a package-referenced import:

```tsx
import { refresh } from 'vite-rsc-example/client';
```

### Server side

As mentioned above, the server needs to be modified to send back RSC payload directly to the client if requested by the `refresh()` function. As we have seen, this is done via a custom `x-no-ssr` HTTP header. The code below, in the non-Server Function path, performs this:

```typescript
 if (noSsr) {
    return new Response(rscStream, {
        status,
        headers: {
            'content-type': 'text/x-component;charset=utf-8' // I presume this content type triggers the appropriate client action
        }
    });
} else {
    const ssrEntryModule = await import.meta.viteRsc.import<
        typeof import('./entry.ssr.tsx')
    >(
        './entry.ssr.tsx', { environment: 'ssr' }
    );


    // Render the RSC stream to the HTML using the SSR module (i.e. server-side rendering)
    let htmlStream = await ssrEntryModule.renderHTML(rscStream) as ReadableStream;

    return new Response(htmlStream, {
        headers: {
            'Content-Type': 'text/html;charset=utf-8'
        },
        status
    });
}
```
So you can see that the key difference is that if we are not SSR-ing, we send the payload directly back to the client (in our case, it will be picked up in `refresh()`), while if we are, we call the SSR endpoint as we did before and send the obtained HTML back to the client.

### The `useRefresh()` hook

We now have a working `refresh()` function. However at the moment we have to manually call it when we get a response back from the Server Function. This can be done but is not ideal particularly if we are employing `useActionState` with a form to update client-side state automatically with the return value of the Server Function.

We could however perform auto-refresh via a `useRefresh()` custom hook, which takes an array of dependencies as a parameter and calls an effect, passing that array of dependencies on to the effect. If we pass in a property of the action state (e.g. the allocated ID in the database if we are adding a new record), then we can trigger a refresh automatically if that property changes. So here is such a `useRefresh()` hook:

```typescript
export function useRefresh<T>(dependencies?: Array<T>, callback?: () => void) {
    useEffect(() => {
        (async () => {
            await refresh();
            callback?.();
        })();
    }, dependencies);
}
```

Fairly straightforward; I have also added an optional callback to run when the refresh has completed.

This is then used in the consuming app's component as follows:

```tsx
import { useRefresh } from 'vite-rsc-example/client';
import { addSong } from '../actions';

export default function ServerFunctionsTest() {
    const [addSongState, addSongWithState] = useActionState(addSong, { id: 0 as number | bigint });

    useRefresh([addSongState.id]);
    // ... etc ...
}
```
So, a refresh is triggered when `addSongState.id` changes; it will do when the `addSong()` Server Function returns.

### Did this work?

Yes, eventually, but only after a further change was made. I needed to specify `react` and `react-dom` as peer dependencies in the framework `package.json`. This is a good idea in any case, as it ensures that versions of React compatible with the version used to develop the framework will be installed by the client.

Even though in this case, all React versions were 19.3 so in theory there should have been no problems even with the omission of peer dependency declarations, I was getting a very hard-to-diagnose bug where the consuming package and the framework were using two separate instances of the same version of React, and the React used for `useEffect()` in the `useRefresh()` hook was apparently null at the SSR stage even though it should in theory be available. 

I haven't got a definitive answer on this, but this may be due to the fact that peer dependency declaration ensures that the exact same instance as well as the same version of React will be available in both the library and the consumer.

After the appropriate peer dependencies were added, all worked fine.



