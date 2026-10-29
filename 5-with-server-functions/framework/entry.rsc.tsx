import * as ReactServer from '@vitejs/plugin-rsc/rsc';

import type { ComponentType, ReactElement } from 'react';
import type { AppProps, RscPayload, ReturnValue } from './types';
import { c } from '@vitejs/plugin-rsc/index-XXYjyFr6';

//import examineStream from './utils/examineStream';
//import { rscStream } from 'rsc-html-stream/client';



export default async function handleRequest(request: Request): Promise<Response> {

    console.log("handleRequest()");

    let rscStream: ReadableStream | null = null;
    const url = new URL(request.url);

    console.log(`Method: ${request.method} pathname ${url.pathname}`);

    const noSsr = request.headers.get("x-no-ssr") ? true : false;
    
    console.log(`rsc: noSsr? ${noSsr}`);

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
        console.log("Not a server function");
        let status = 200;
        const glob = import.meta.glob('/src/**/*.{js,jsx,ts,tsx}');
        const componentRoutes: { [path: string]: ComponentType<AppProps> } = {};
        for (const [path, loadModule] of Object.entries(glob)) {
            const replace = path.replace(/^\/src|(index)?\.(jsx|tsx|js|ts)$/g, "").toLowerCase();
            componentRoutes[replace] = ((await loadModule() as any).default) as ComponentType<AppProps>;
        }

        console.log(`rsc: NODE_ENV=${process.env.NODE_ENV}`);

        console.log("componentRoutes:");
        console.log(componentRoutes);

        const path = url.pathname;
        console.log(`path of request is ${path}`);

        const App = componentRoutes[path] ?? componentRoutes[`${path}/`] ?? null;
        if (App === null) status = 404;


        // Convert RSC JSX to RSC payload
        rscStream = ReactServer.renderToReadableStream<ReactElement>(
            App === null ? <h1>Cannot find component for path {path}</h1> : <App url={request.url} />
        );


        if (noSsr) {
            console.log('rsc: noSsr is true, so sending back the raw RSC stream');
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

            // check that the RSC payload is good

            // console.log('RSC stream is:');
            //rscStream = await examineStream(rscStream);

            // Render the RSC stream to the HTML using the SSR module (i.e. server-side rendering)
            let htmlStream = await ssrEntryModule.renderHTML(rscStream) as ReadableStream;

            return new Response(htmlStream, {
                headers: {
                    'Content-Type': 'text/html;charset=utf-8'
                },
                status
            });
        }
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
