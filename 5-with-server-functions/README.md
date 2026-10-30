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

Doing this, however, led to a new error: the dev server reported it could not handle the `react-refresh` entrypoint. This is a special piece of code which handles auto-refresh in the dev server and is part of the React Vite plugin, thus resides inside the `@vitejs/plugin-react` package.

The problem turned out to be that it could not find the react-refresh code because it was looking in the wrong place. It was looking inside the `vite-rsc-example` package for it, rather than where it should have been looking, i.e. in `@vitejs/plugin-react`. It turns out that the react-refresh code is not imported as a module in the normal way but loaded with `readFileSync()` from the current directory. 