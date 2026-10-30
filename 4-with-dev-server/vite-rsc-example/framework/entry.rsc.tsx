import * as ReactServer from '@vitejs/plugin-rsc/rsc';

import type { ComponentType } from 'react';
import type { AppProps } from './types';

import examineStream from './utils/examineStream';

export default async function handleRequest(request: Request): Promise<Response> {

    const glob = import.meta.glob('/src/**/*.{js,jsx,ts,tsx}');
    const componentRoutes: { [path: string]: ComponentType<AppProps> } = {};
    for (const [path, loadModule] of Object.entries(glob)) {
        const replace = path.replace(/^\/src|(index)?\.(jsx|tsx|js|ts)$/g, "").toLowerCase();
        componentRoutes[replace] = ((await loadModule() as any).default) as ComponentType<AppProps>;
    }

    console.log(`rsc: NODE_ENV=${process.env.NODE_ENV}`);

    console.log("componentRoutes:");
    console.log(componentRoutes);

    const path = new URL(request.url).pathname;
    console.log(`path is ${path}`);

    const App = componentRoutes[path] ?? componentRoutes[`${path}/`] ?? null;

    // Convert RSC JSX to RSC payload
    let rscStream = ReactServer.renderToReadableStream(
        App === null ? <h1>Cannot find component for path {path}</h1> : <App url={request.url} />
    );

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
        }
    });
}
